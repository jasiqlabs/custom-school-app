import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, FeeDueStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { isSameKolkataDay } from '../domain/fee-date-utils';
import { lockStudentForFees } from '../domain/fee-student-lock';
import type { SessionActor, VoidPaymentInput } from '@custom-school/contracts';

@Injectable()
export class VoidPaymentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async voidPayment(actor: SessionActor, paymentId: string, input: VoidPaymentInput) {
    if (!actor.schoolId) throw new BadRequestException('School context is required');
    if (!input.reason?.trim() || input.reason.trim().length < 3) {
      throw new BadRequestException('A void reason of at least 3 characters is required');
    }
    const schoolId = actor.schoolId;
    // Read the owner first (no lock); ALWAYS acquire student lock before payment/charges
    // to preserve the common ordering used by collection and assessment.
    const owner = await this.prisma.feePayment.findFirst({
      where: { id: paymentId, schoolId },
      select: { studentId: true },
    });
    if (!owner) throw new NotFoundException('Payment not found');

    const outcome = await this.prisma.$transaction(async tx => {
      await lockStudentForFees(tx, schoolId, owner.studentId);
      const paymentRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM fee_payments WHERE id = ${paymentId}::uuid
          AND school_id = ${schoolId}::uuid FOR UPDATE
      `;
      if (!paymentRows.length) throw new NotFoundException('Payment not found');
      const payment = await tx.feePayment.findFirst({
        where: { id: paymentId, schoolId, studentId: owner.studentId },
        include: {
          allocations: { include: { charge: { include: { category: true } } } },
        },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === PaymentStatus.VOIDED) return { alreadyVoided: true };
      if (!isSameKolkataDay(payment.createdAt)) {
        throw new BadRequestException('Only same-day payments can be voided (Asia/Kolkata)');
      }
      const now = new Date();

      if (payment.allocations.length) {
        for (const allocation of [...payment.allocations].sort((a, b) => a.chargeId.localeCompare(b.chargeId))) {
          if (allocation.voidReversedAt) continue;
          // A single receipt can allocate multiple lines to one charge. Read the current
          // balance after prior reversals in this same transaction, not the stale include.
          const charge = await tx.feeCharge.findFirst({
            where: { id: allocation.chargeId, schoolId, studentId: payment.studentId },
            include: { category: true },
          });
          if (!charge) throw new ConflictException('Original charge is missing');
          if (charge.schoolId !== schoolId || charge.studentId !== payment.studentId) {
            throw new ConflictException('Payment allocation does not belong to student/school');
          }
          const refund = allocation.amount;
          const newPaid = charge.paidAmount.minus(refund);
          if (newPaid.isNegative()) throw new ConflictException('Charge is already reversed');
          const newBalance = charge.netAmount.minus(newPaid);
          const status = newBalance.isZero() ? FeeDueStatus.PAID
            : newPaid.isZero() ? FeeDueStatus.UNPAID : FeeDueStatus.PARTIAL;
          await tx.feeCharge.update({
            where: { id: charge.id },
            data: { paidAmount: newPaid, balance: newBalance, status, version: { increment: 1 } },
          });
          if (charge.category.code === 'TUITION' && charge.originRef) {
            const due = await tx.feeDue.findUnique({
              where: { schoolId_studentId_feeMonth: {
                schoolId, studentId: payment.studentId, feeMonth: charge.originRef,
              } },
            });
            if (due) {
              const duePaid = due.paidAmount.minus(refund);
              if (duePaid.isNegative()) throw new ConflictException('Legacy tuition balance is inconsistent');
              const dueBalance = due.netDue.minus(duePaid);
              await tx.feeDue.update({
                where: { id: due.id },
                data: {
                  paidAmount: duePaid, balance: dueBalance,
                  status: dueBalance.isZero() ? FeeDueStatus.PAID :
                    duePaid.isZero() ? FeeDueStatus.UNPAID : FeeDueStatus.PARTIAL,
                  version: { increment: 1 },
                },
              });
            }
          }
          await tx.feePaymentAllocation.update({
            where: { id: allocation.id },
            data: { voidReversedAt: now },
          });
        }
      } else if (payment.dueId) {
        // Backward compatibility for historic payments before allocations existed.
        const due = await tx.feeDue.findFirst({ where: { id: payment.dueId, schoolId, studentId: payment.studentId } });
        if (!due) throw new NotFoundException('Original fee due not found');
        const paidAmount = due.paidAmount.minus(payment.amount);
        if (paidAmount.isNegative()) throw new ConflictException('Legacy payment already reversed');
        const balance = due.netDue.minus(paidAmount);
        await tx.feeDue.update({
          where: { id: due.id },
          data: {
            paidAmount, balance,
            status: balance.isZero() ? FeeDueStatus.PAID :
              paidAmount.isZero() ? FeeDueStatus.UNPAID : FeeDueStatus.PARTIAL,
            version: { increment: 1 },
          },
        });
        const matching = await tx.feeCharge.findFirst({
          where: { schoolId, studentId: payment.studentId, originRef: due.feeMonth, category: { code: 'TUITION' } },
        });
        if (matching) {
          const chargePaid = matching.paidAmount.minus(payment.amount);
          if (chargePaid.isNegative()) throw new ConflictException('Tuition mirror is inconsistent');
          const chargeBalance = matching.netAmount.minus(chargePaid);
          await tx.feeCharge.update({
            where: { id: matching.id },
            data: {
              paidAmount: chargePaid, balance: chargeBalance,
              status: chargeBalance.isZero() ? FeeDueStatus.PAID :
                chargePaid.isZero() ? FeeDueStatus.UNPAID : FeeDueStatus.PARTIAL,
              version: { increment: 1 },
            },
          });
        }
      } else {
        throw new ConflictException('Payment has neither allocations nor a legacy due');
      }

      await tx.feePayment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.VOIDED, voidedAt: now, voidReason: input.reason.trim(), voidedBy: actor.userId },
      });
      await this.audit.append({
        requestId: actor.requestId, schoolId, actorType: actor.userType,
        actorId: actor.userId, eventType: 'FEE_PAYMENT_VOIDED',
        targetType: 'FeePayment', targetId: paymentId, metadata: { reason: input.reason.trim() },
      }, tx);
      return { alreadyVoided: false };
    }, { maxWait: 10000, timeout: 30000 });

    return { success: true, paymentId, alreadyVoided: outcome.alreadyVoided };
  }
}
