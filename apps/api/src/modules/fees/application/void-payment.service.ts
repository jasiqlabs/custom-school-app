import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, FeeDueStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { isSameKolkataDay } from '../domain/fee-date-utils';
import { roundHalfUp } from '../domain/concession-calculator';
import type { SessionActor, VoidPaymentInput } from '@custom-school/contracts';

@Injectable()
export class VoidPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async voidPayment(
    actor: SessionActor,
    paymentId: string,
    input: VoidPaymentInput
  ) {
    if (!actor.schoolId) {
      throw new BadRequestException('School context is required');
    }
    const schoolId = actor.schoolId;

    if (!input.reason || input.reason.trim().length < 3) {
      throw new BadRequestException('A valid mandatory void reason is required (min 3 characters)');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Lock payment record
      const paymentRows = await tx.$queryRaw<
        Array<{
          id: string;
          school_id: string;
          due_id: string;
          student_id: string;
          amount: Prisma.Decimal;
          status: PaymentStatus;
          payment_date: Date;
          created_at: Date;
        }>
      >`
        SELECT id, school_id, due_id, student_id, amount, status, payment_date, created_at
        FROM fee_payments
        WHERE id = ${paymentId}::uuid AND school_id = ${schoolId}
        FOR UPDATE
      `;
      const payment = paymentRows[0];
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Idempotency: if already voided, return without duplicate balance adjustments
      if (payment.status === PaymentStatus.VOIDED) {
        return { paymentId: payment.id, alreadyVoided: true };
      }

      // 2. Policy check: same-day policy under Asia/Kolkata
      if (!isSameKolkataDay(payment.created_at)) {
        throw new BadRequestException(
          'Policy violation: Fee payments can only be voided on the same business day of creation (Asia/Kolkata timezone)'
        );
      }

      // 3. Lock due record
      const dueRows = await tx.$queryRaw<
        Array<{
          id: string;
          net_due: Prisma.Decimal;
          paid_amount: Prisma.Decimal;
          balance: Prisma.Decimal;
          status: FeeDueStatus;
        }>
      >`
        SELECT id, net_due, paid_amount, balance, status
        FROM fee_dues
        WHERE id = ${payment.due_id}::uuid AND school_id = ${schoolId}
        FOR UPDATE
      `;
      const due = dueRows[0];
      if (!due) {
        throw new NotFoundException('Associated fee due not found');
      }

      const voidAmount = roundHalfUp(Number(payment.amount));
      const currentPaid = roundHalfUp(Number(due.paid_amount));
      const currentBalance = roundHalfUp(Number(due.balance));
      const netDue = roundHalfUp(Number(due.net_due));

      const newPaid = roundHalfUp(Math.max(0, currentPaid - voidAmount));
      const newBalance = roundHalfUp(Math.min(netDue, currentBalance + voidAmount));
      const newStatus =
        newPaid === 0
          ? FeeDueStatus.UNPAID
          : newBalance === 0
          ? FeeDueStatus.PAID
          : FeeDueStatus.PARTIAL;

      // 4. Update payment
      await tx.feePayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.VOIDED,
          voidedAt: new Date(),
          voidReason: input.reason.trim(),
          voidedBy: actor.userId,
        },
      });

      // 5. Update due
      await tx.feeDue.update({
        where: { id: due.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid),
          balance: new Prisma.Decimal(newBalance),
          status: newStatus,
          version: { increment: 1 },
        },
      });

      return { paymentId: payment.id, alreadyVoided: false };
    });

    if (!result.alreadyVoided) {
      await this.audit.append({
        requestId: actor.requestId,
        schoolId,
        actorType: actor.userType,
        actorId: actor.userId,
        eventType: 'FEE_PAYMENT_VOIDED',
        targetType: 'FeePayment',
        targetId: paymentId,
        metadata: {
          reason: input.reason.trim(),
        },
      });
    }

    return { success: true, paymentId: result.paymentId };
  }
}
