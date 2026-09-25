import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, EntityStatus, FeeDueStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { FeesRepository } from '../repository/fees.repository';
import { GenerateDuesService } from './generate-dues.service';
import { ReceiptNumberAllocator } from '../domain/receipt-number-allocator';
import { roundHalfUp } from '../domain/concession-calculator';
import type {
  CollectPaymentInput,
  PaymentReceiptDto,
  SessionActor,
} from '@custom-school/contracts';

@Injectable()
export class CollectPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesRepository: FeesRepository,
    private readonly receiptAllocator: ReceiptNumberAllocator,
    private readonly audit: AuditService,
    private readonly generateDuesService?: GenerateDuesService
  ) {}

  async getStudentDues(schoolId: string, studentId: string) {
    // Verify student exists and belongs to school
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        status: true,
        concessionType: true,
        concessionValue: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: { select: { id: true, name: true } } },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Auto-generate dues on demand if class has configured fee and due is missing
    if (this.generateDuesService && student.status === 'ACTIVE') {
      await this.generateDuesService.ensureDuesForApplicableMonths(schoolId, studentId);
    }

    const dues = await this.feesRepository.listDuesByStudent(schoolId, studentId);

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        status: student.status,
        className: student.enrollments[0]?.class?.name ?? 'Unassigned',
      },
      dues: dues.map((d) => ({
        id: d.id,
        schoolId: d.schoolId,
        studentId: d.studentId,
        classId: d.classId,
        className: d.class?.name,
        feeMonth: d.feeMonth,
        baseAmount: Number(d.baseAmount),
        concessionType: d.concessionTypeSnapshot as any,
        concessionValue: Number(d.concessionValueSnapshot),
        concessionAmount: Number(d.concessionAmount),
        netDue: Number(d.netDue),
        paidAmount: Number(d.paidAmount),
        balance: Number(d.balance),
        status: d.status as any,
        version: d.version,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  async getReceipt(schoolId: string, paymentId: string): Promise<PaymentReceiptDto> {
    const payment = await this.feesRepository.findPaymentById(schoolId, paymentId);
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    return this.buildReceiptDto(payment);
  }

  async collectPayment(
    actor: SessionActor,
    input: CollectPaymentInput
  ): Promise<PaymentReceiptDto> {
    if (!actor.schoolId) {
      throw new BadRequestException('School context is required');
    }
    const schoolId = actor.schoolId;

    if (input.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    // 1. Check idempotency replay
    const existingPayment = await this.feesRepository.findPaymentByIdempotencyKey(
      schoolId,
      input.idempotencyKey
    );
    if (existingPayment) {
      return this.buildReceiptDto(existingPayment);
    }

    // 2. Validate student exists, belongs to school, and is ACTIVE
    const student = await this.prisma.student.findFirst({
      where: { id: input.studentId, schoolId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        status: true,
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.status !== EntityStatus.ACTIVE) {
      throw new BadRequestException('Cannot record fee payment for an INACTIVE student');
    }

    const payAmount = roundHalfUp(input.amount);

    // 3. Execute transactional payment with row-level lock
    const paymentId = await this.prisma.$transaction(async (tx) => {
      // Re-check idempotency within transaction
      const replay = await tx.feePayment.findUnique({
        where: {
          schoolId_idempotencyKey: { schoolId, idempotencyKey: input.idempotencyKey },
        },
        select: { id: true },
      });
      if (replay) {
        return replay.id;
      }

      // Lock target due row
      const lockedDue = await this.feesRepository.findDueByIdForUpdate(
        tx,
        schoolId,
        input.dueId
      );
      if (!lockedDue) {
        throw new NotFoundException('Fee due record not found');
      }
      if (lockedDue.student_id !== input.studentId) {
        throw new BadRequestException('Due does not belong to specified student');
      }

      const currentBalance = roundHalfUp(Number(lockedDue.balance));
      if (currentBalance <= 0) {
        throw new ConflictException('Due is already fully paid');
      }
      if (payAmount > currentBalance) {
        throw new BadRequestException(
          `Payment amount (${payAmount}) exceeds outstanding balance (${currentBalance})`
        );
      }

      // Allocate receipt number
      const receiptNumber = await this.receiptAllocator.allocateReceiptNumber(
        tx,
        schoolId
      );

      // Snapshot current student code and name
      const studentCodeSnapshot = student.studentCode;
      const studentNameSnapshot = student.fullName;

      const newPaid = roundHalfUp(Number(lockedDue.paid_amount) + payAmount);
      const newBalance = roundHalfUp(currentBalance - payAmount);
      const newStatus = newBalance === 0 ? FeeDueStatus.PAID : FeeDueStatus.PARTIAL;

      // Insert payment record
      const payment = await tx.feePayment.create({
        data: {
          schoolId,
          dueId: lockedDue.id,
          studentId: student.id,
          receiptNumber,
          studentCodeSnapshot,
          studentNameSnapshot,
          amount: new Prisma.Decimal(payAmount),
          mode: input.mode as any,
          paymentDate: new Date(input.paymentDate),
          reference: input.reference?.trim() || null,
          status: PaymentStatus.ACTIVE,
          idempotencyKey: input.idempotencyKey,
          createdBy: actor.userId,
        },
      });

      // Update fee due record
      await tx.feeDue.update({
        where: { id: lockedDue.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaid),
          balance: new Prisma.Decimal(newBalance),
          status: newStatus,
          version: { increment: 1 },
        },
      });

      return payment.id;
    });

    // 4. Audit
    await this.audit.append({
      requestId: actor.requestId,
      schoolId,
      actorType: actor.userType,
      actorId: actor.userId,
      eventType: 'FEE_PAYMENT_RECORDED',
      targetType: 'FeePayment',
      targetId: paymentId,
      metadata: {
        studentId: input.studentId,
        dueId: input.dueId,
        amount: payAmount,
        mode: input.mode,
        paymentDate: input.paymentDate,
      },
    });

    return this.getReceipt(schoolId, paymentId);
  }

  private buildReceiptDto(payment: any): PaymentReceiptDto {
    const due = payment.due;
    const school = payment.school;

    return {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      schoolId: payment.schoolId,
      schoolName: school?.name || 'School ERP',
      schoolAddress: school?.address,
      schoolPhone: school?.phone,
      schoolLogoFileId: school?.logoFileId,
      studentId: payment.studentId,
      studentCode: payment.studentCodeSnapshot,
      studentName: payment.studentNameSnapshot,
      className: due?.class?.name,
      feeMonth: due?.feeMonth || '',
      baseAmount: due ? Number(due.baseAmount || due.netDue) : Number(payment.amount),
      concessionAmount: due ? Number(due.concessionAmount || 0) : 0,
      netDue: due ? Number(due.netDue) : Number(payment.amount),
      amountPaidThisReceipt: Number(payment.amount),
      totalPaid: due ? Number(due.paidAmount) : Number(payment.amount),
      remainingBalance: due ? Number(due.balance) : 0,
      paymentMode: payment.mode as any,
      paymentDate: payment.paymentDate.toISOString().slice(0, 10),
      reference: payment.reference,
      status: payment.status as any,
      issuedAt: payment.createdAt.toISOString(),
      voidedAt: payment.voidedAt?.toISOString(),
      voidReason: payment.voidReason,
    };
  }
}
