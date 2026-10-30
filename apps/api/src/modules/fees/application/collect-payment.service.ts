import { createHash } from 'node:crypto';
import { lockStudentForFees } from '../domain/fee-student-lock';
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
import { getKolkataDateParts } from '../domain/fee-date-utils';
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
          include: {
            class: { select: { id: true, name: true } },
            academicSession: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const activeEnrollment = student.enrollments[0];
    const session = activeEnrollment?.academicSession;
    const currentMonth = getKolkataDateParts().monthString;
    const sessionEndMonth = session ? session.endDate.toISOString().slice(0, 7) : null;
    const isSessionEnded = session
      ? session.status === 'CLOSED' || (sessionEndMonth !== null && currentMonth > sessionEndMonth)
      : false;

    // 1. Fetch all assessed FeeCharge records for this student
    let charges = await this.prisma.feeCharge.findMany({
      where: { schoolId, studentId },
      include: {
        category: true,
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    });

    // If session has ended or is closed, filter out unassessed future charges that have 0 paid
    if (isSessionEnded && sessionEndMonth) {
      charges = charges.filter((c) => {
        const cMonth = c.originRef || (c.periodStart ? c.periodStart.toISOString().slice(0, 7) : null);
        if (cMonth && cMonth > sessionEndMonth && Number(c.paidAmount) === 0) {
          return false;
        }
        return true;
      });
    }

    const hasPendingCharge = charges.some((c) => c.status !== 'PAID' && Number(c.balance) > 0);

    // Fee assessment must never occur in GET /dues/student/:studentId.
    // Managers may explicitly assess dues using POST /dues/generate.

    const dues = await this.feesRepository.listDuesByStudent(schoolId, studentId);

    // Map charges to DTOs
    const chargeItems = charges.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      studentId: c.studentId,
      classId: c.classId || student.enrollments[0]?.class?.id || '',
      className: c.class?.name || student.enrollments[0]?.class?.name || 'General',
      categoryCode: c.category.code,
      categoryName: c.category.displayName,
      description: c.description || c.category.displayName,
      feeMonth: c.originRef || '',
      baseAmount: Number(c.baseAmount),
      concessionType: (c.category.code === 'TUITION' ? student.concessionType : 'NONE') as any,
      concessionValue: (c.category.code === 'TUITION' ? Number(student.concessionValue) : 0),
      concessionAmount: Number(c.concessionAmount),
      netDue: Number(c.netAmount),
      paidAmount: Number(c.paidAmount),
      balance: Number(c.balance),
      status: c.status as any,
      version: c.version,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    // Preserve old FeeDue rows in the read projection without inserting shadow charges.
    // CollectPayment supports legacy dueId through its existing adapter.
    const representedMonths = new Set(charges.filter(c => c.category.code === 'TUITION').map(c => c.originRef));
    for (const due of dues) {
      if (representedMonths.has(due.feeMonth)) continue;
      if (isSessionEnded && sessionEndMonth && due.feeMonth > sessionEndMonth && Number(due.paidAmount) === 0) continue;
      chargeItems.push({
        id: due.id,
        schoolId, studentId,
        classId: due.classId || '',
        className: 'Tuition',
        categoryCode: 'TUITION',
        categoryName: 'Monthly Tuition Fee',
        description: 'Monthly Tuition Fee',
        feeMonth: due.feeMonth,
        baseAmount: Number(due.baseAmount),
        concessionType: student.concessionType as any,
        concessionValue: Number(student.concessionValue),
        concessionAmount: Number(due.concessionAmount),
        netDue: Number(due.netDue),
        paidAmount: Number(due.paidAmount),
        balance: Number(due.balance),
        status: due.status as any,
        version: due.version,
        createdAt: due.createdAt.toISOString(),
        updatedAt: due.updatedAt.toISOString(),
      });
    }

    // Sort charge items: pending (unpaid) dues first chronologically, followed by paid dues
    chargeItems.sort((a, b) => {
      const aPaid = a.balance <= 0;
      const bPaid = b.balance <= 0;
      if (aPaid !== bPaid) return aPaid ? 1 : -1;
      return (a.feeMonth || '').localeCompare(b.feeMonth || '');
    });

    return {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        status: student.status,
        className: student.enrollments[0]?.class?.name ?? 'Unassigned',
      },
      dues: chargeItems,
    };
  }

  async getReceipt(schoolId: string, paymentId: string): Promise<PaymentReceiptDto> {
    const payment = await this.feesRepository.findPaymentById(schoolId, paymentId);
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.receiptSnapshot) {
      const frozen = payment.receiptSnapshot as unknown as PaymentReceiptDto;
      return { ...frozen, status: payment.status as any,
        voidedAt: payment.voidedAt?.toISOString(), voidReason: payment.voidReason };
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

    // A replay is bound to the canonical payment intent, not merely its opaque key.
    // Sorting allocations makes the hash independent of client list ordering.
    const requestHash = createHash('sha256').update(JSON.stringify({
      schoolId, studentId: input.studentId,
      amount: new Prisma.Decimal(input.amount).toFixed(2),
      mode: input.mode, paymentDate: input.paymentDate,
      reference: input.reference?.trim() || '',
      allocations: input.allocations?.length
        ? [...input.allocations].map(a => [a.chargeId, new Prisma.Decimal(a.amount).toFixed(2)])
            .sort((a, b) => a[0].localeCompare(b[0]))
        : null,
      dueId: input.allocations?.length ? null : input.dueId || null,
    })).digest('hex');

    // 1. Check idempotency replay
    const existingPayment = await this.feesRepository.findPaymentByIdempotencyKey(
      schoolId,
      input.idempotencyKey
    );
    if (existingPayment) {
      if (existingPayment.requestHash && existingPayment.requestHash !== requestHash) {
        throw new ConflictException('This payment reference was already used with different details');
      }
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
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { academicSession: true },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    // A student who has left may still pay already-assessed historic arrears.
    // Assessment of new future periods remains prohibited for inactive students.

    const paymentDecimal = new Prisma.Decimal(input.amount);
    if (!paymentDecimal.isFinite() || paymentDecimal.lte(0) || paymentDecimal.decimalPlaces() > 2) {
      throw new BadRequestException('Payment amount must have at most two decimal places');
    }
    const payAmount = paymentDecimal.toNumber();

    // 3. Execute transactional payment with row-level lock
    const paymentId = await this.prisma.$transaction(async (tx) => {
      await lockStudentForFees(tx, schoolId, input.studentId);
      // Re-check idempotency within transaction
      const replay = await tx.feePayment.findUnique({
        where: {
          schoolId_idempotencyKey: { schoolId, idempotencyKey: input.idempotencyKey },
        },
        select: { id: true, requestHash: true },
      });
      if (replay) {
        if (replay.requestHash && replay.requestHash !== requestHash) {
          throw new ConflictException('This payment reference was already used with different details');
        }
        return replay.id;
      }

      // Closed/left students may clear existing obligations, but cannot be billed fresh here.
      // A stale UI or malformed request must not allocate to another student's fee lines.
      // Determine allocations to process
      const itemsToProcess: Array<{ chargeId?: string; dueId?: string; amount: number }> = [];

      if (input.allocations && input.allocations.length > 0) {
        let sumAllocations = new Prisma.Decimal(0);
        for (const alloc of input.allocations) {
          const itemDecimal = new Prisma.Decimal(alloc.amount);
          if (!itemDecimal.isFinite() || itemDecimal.decimalPlaces() > 2) {
            throw new BadRequestException('Allocation must have at most two decimal places');
          }
          const itemAmt = itemDecimal.toNumber();
          if (itemAmt <= 0) {
            throw new BadRequestException('Allocation amount must be greater than zero');
          }
          sumAllocations = sumAllocations.plus(itemDecimal);
          itemsToProcess.push({ chargeId: alloc.chargeId, amount: itemAmt });
        }
        if (!sumAllocations.equals(paymentDecimal)) {
          throw new BadRequestException(`Sum of allocations (₹${sumAllocations}) must equal total payment amount (₹${payAmount})`);
        }
      } else if (input.dueId) {
        // Legacy single dueId: check if dueId is a FeeCharge or a FeeDue
        const charge = await tx.feeCharge.findFirst({
          where: { id: input.dueId, schoolId },
        });
        if (charge) {
          itemsToProcess.push({ chargeId: charge.id, amount: payAmount });
        } else {
          itemsToProcess.push({ dueId: input.dueId, amount: payAmount });
        }
      } else {
        throw new BadRequestException('Either allocations or dueId must be provided');
      }

      // Allocate receipt number
      const receiptNumber = await this.receiptAllocator.allocateReceiptNumber(
        tx,
        schoolId
      );

      // Snapshot current student code and name
      const studentCodeSnapshot = student.studentCode;
      const studentNameSnapshot = student.fullName;

      // Insert payment record
      const payment = await tx.feePayment.create({
        data: {
          schoolId,
          dueId: itemsToProcess[0]?.dueId || null,
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
          requestHash,
          createdBy: actor.userId,
        },
      });

      // Process each allocation
      for (const item of itemsToProcess) {
        if (item.chargeId) {
          let lockedCharge = await tx.feeCharge.findFirst({
            where: { id: item.chargeId, schoolId },
            include: { category: true },
          });

          if (!lockedCharge) {
            // Defensive: check if item.chargeId is a FeeDue ID
            const lockedDue = await tx.feeDue.findFirst({
              where: { id: item.chargeId, schoolId },
            });
            if (lockedDue) {
              if (lockedDue.studentId !== input.studentId) {
                throw new BadRequestException('Charge does not belong to specified student');
              }
              lockedCharge = await tx.feeCharge.findFirst({
                where: {
                  schoolId,
                  studentId: lockedDue.studentId,
                  originRef: lockedDue.feeMonth,
                  category: { code: 'TUITION' },
                },
                include: { category: true },
              });
              if (!lockedCharge) {
                let tuitionCat = await tx.feeCategory.findFirst({
                  where: { schoolId, code: 'TUITION' },
                });
                if (!tuitionCat) {
                  tuitionCat = await tx.feeCategory.create({
                    data: {
                      schoolId,
                      code: 'TUITION',
                      displayName: 'Monthly Tuition Fee',
                      chargeKind: 'RECURRING',
                      description: 'Standard monthly class tuition fee',
                      status: EntityStatus.ACTIVE,
                      version: 1,
                    },
                  });
                }
                lockedCharge = await tx.feeCharge.create({
                  data: {
                    schoolId,
                    studentId: lockedDue.studentId,
                    classId: lockedDue.classId,
                    categoryId: tuitionCat.id,
                    sourceKey: `${schoolId}:${lockedDue.studentId}:TUITION:${lockedDue.feeMonth}`,
                    originRef: lockedDue.feeMonth,
                    description: 'Monthly Tuition Fee',
                    baseAmount: lockedDue.baseAmount,
                    concessionAmount: lockedDue.concessionAmount,
                    netAmount: lockedDue.netDue,
                    paidAmount: lockedDue.paidAmount,
                    balance: lockedDue.balance,
                    status: lockedDue.status,
                  },
                  include: { category: true },
                });
              }
            } else {
              throw new NotFoundException(`Fee charge ${item.chargeId} not found`);
            }
          }

          if (lockedCharge.studentId !== input.studentId) {
            throw new BadRequestException('Charge does not belong to specified student');
          }

          const curBal = lockedCharge.balance;
          if (curBal.lte(0)) {
            throw new ConflictException(`Charge "${lockedCharge.description || lockedCharge.id}" is already fully paid`);
          }
          if (new Prisma.Decimal(item.amount).gt(curBal)) {
            throw new BadRequestException(
              `Payment amount (₹${item.amount}) exceeds outstanding balance (₹${curBal}) for "${lockedCharge.description || lockedCharge.id}"`
            );
          }

          const newPaid = lockedCharge.paidAmount.plus(item.amount);
          const newBal = curBal.minus(item.amount);
          const newStatus = newBal.isZero() ? FeeDueStatus.PAID : FeeDueStatus.PARTIAL;

          // Record FeePaymentAllocation
          await tx.feePaymentAllocation.create({
            data: {
              schoolId,
              paymentId: payment.id,
              chargeId: lockedCharge.id,
              amount: new Prisma.Decimal(item.amount),
            },
          });

          // Update FeeCharge
          await tx.feeCharge.update({
            where: { id: lockedCharge.id },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              balance: new Prisma.Decimal(newBal),
              status: newStatus,
              version: { increment: 1 },
            },
          });

          // If category is TUITION, also synchronize corresponding FeeDue if present
          if (lockedCharge.category.code === 'TUITION' && lockedCharge.originRef) {
            const due = await tx.feeDue.findUnique({
              where: {
                schoolId_studentId_feeMonth: {
                  schoolId,
                  studentId: student.id,
                  feeMonth: lockedCharge.originRef,
                },
              },
            });
            if (due) {
              const duePaid = due.paidAmount.plus(item.amount);
              const dueBal = due.netDue.minus(duePaid);
              if (dueBal.isNegative()) throw new ConflictException('Legacy fee due would be overpaid');
              await tx.feeDue.update({
                where: { id: due.id },
                data: {
                  paidAmount: new Prisma.Decimal(duePaid),
                  balance: new Prisma.Decimal(dueBal),
                  status: dueBal.isZero() ? FeeDueStatus.PAID : FeeDueStatus.PARTIAL,
                  version: { increment: 1 },
                },
              });
            }
          }
        } else if (item.dueId) {
          // Legacy due path
          const lockedDue = await this.feesRepository.findDueByIdForUpdate(
            tx,
            schoolId,
            item.dueId
          );
          if (!lockedDue) {
            throw new NotFoundException('Fee due record not found');
          }
          if (lockedDue.student_id !== input.studentId) {
            throw new BadRequestException('Due does not belong to specified student');
          }

          const currentBalance = lockedDue.balance;
          if (currentBalance.lte(0)) {
            throw new ConflictException('Due is already fully paid');
          }
          if (new Prisma.Decimal(item.amount).gt(currentBalance)) {
            throw new BadRequestException(
              `Payment amount (${item.amount}) exceeds outstanding balance (${currentBalance})`
            );
          }

          const newPaid = lockedDue.paid_amount.plus(item.amount);
          const newBalance = currentBalance.minus(item.amount);
          const newStatus = newBalance.isZero() ? FeeDueStatus.PAID : FeeDueStatus.PARTIAL;

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

          // If matching tuition charge exists, also update it
          let matchingCharge = await tx.feeCharge.findFirst({
            where: {
              schoolId,
              studentId: student.id,
              originRef: lockedDue.fee_month,
              category: { code: 'TUITION' },
            },
          });
          if (!matchingCharge) {
            let tuitionCat = await tx.feeCategory.findFirst({
              where: { schoolId, code: 'TUITION' },
            });
            if (!tuitionCat) {
              tuitionCat = await tx.feeCategory.create({
                data: {
                  schoolId,
                  code: 'TUITION',
                  displayName: 'Monthly Tuition Fee',
                  chargeKind: 'RECURRING',
                  description: 'Standard monthly class tuition fee',
                  status: EntityStatus.ACTIVE,
                  version: 1,
                },
              });
            }
            matchingCharge = await tx.feeCharge.create({
              data: {
                schoolId,
                studentId: student.id,
                classId: lockedDue.class_id,
                categoryId: tuitionCat.id,
                sourceKey: `${schoolId}:${student.id}:TUITION:${lockedDue.fee_month}`,
                originRef: lockedDue.fee_month,
                description: 'Monthly Tuition Fee',
                baseAmount: lockedDue.base_amount,
                concessionAmount: lockedDue.base_amount.minus(lockedDue.net_due),
                netAmount: lockedDue.net_due,
                paidAmount: new Prisma.Decimal(newPaid),
                balance: new Prisma.Decimal(newBalance),
                status: newStatus,
              },
            });
          } else {
            await tx.feeCharge.update({
              where: { id: matchingCharge.id },
              data: {
                paidAmount: new Prisma.Decimal(newPaid),
                balance: new Prisma.Decimal(newBalance),
                status: newStatus,
                version: { increment: 1 },
              },
            });
          }

          await tx.feePaymentAllocation.create({
            data: {
              schoolId,
              paymentId: payment.id,
              chargeId: matchingCharge.id,
              amount: new Prisma.Decimal(item.amount),
            },
          });
        }
      }

      // Immutable receipt snapshot is captured in the same transaction as payment posting.
      // Subsequent student edits, fee changes and voiding must not rewrite issued amounts.
      const frozenPayment = await tx.feePayment.findUniqueOrThrow({
        where: { id: payment.id },
        include: {
          due: { include: { class: { select: { id: true, name: true } } } },
          allocations: { include: { charge: { include: { category: true } } } },
          student: { include: { enrollments: {
            where: { status: 'ACTIVE' }, take: 1,
            include: { class: { select: { id: true, name: true } } },
          } } },
          school: true,
        },
      });
      const receipt = this.buildReceiptDto(frozenPayment);
      const collector = await tx.schoolOperator.findFirst({
        where: { id: actor.userId, schoolId }, select: { fullName: true },
      });
      const snapshot = { ...receipt, collectorName: collector?.fullName || 'School Operator' };
      await tx.feePayment.update({ where: { id: payment.id },
        data: { receiptSnapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue },
      });
      return payment.id;
    }, { maxWait: 10000, timeout: 30000 });

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

    // 5. Ensure next applicable month fee is prepared immediately only if session is active and not ended
    const activeEnrollment = student.enrollments?.[0];
    const session = activeEnrollment?.academicSession;
    const currentMonth = getKolkataDateParts().monthString;
    const sessionEndMonth = session ? session.endDate.toISOString().slice(0, 7) : null;
    const isSessionEnded = session
      ? session.status === 'CLOSED' || (sessionEndMonth !== null && currentMonth > sessionEndMonth)
      : false;

    if (this.generateDuesService && student.status === EntityStatus.ACTIVE && !isSessionEnded) {
      try {
        await this.generateDuesService.ensureDuesForApplicableMonths(schoolId, input.studentId);
      } catch {
        // non-blocking post-payment sync
      }
    }

    return this.getReceipt(schoolId, paymentId);
  }

  private buildReceiptDto(payment: any): PaymentReceiptDto {
    const due = payment.due;
    const school = payment.school;
    const allocations = payment.allocations || [];

    let items: any[] = [];

    if (allocations.length > 0) {
      items = allocations.map((a: any) => ({
        chargeId: a.chargeId,
        categoryCode: a.charge?.category?.code || 'FEE',
        categoryName: a.charge?.category?.displayName || 'Fee Charge',
        description: a.charge?.description || a.charge?.category?.displayName || 'Fee Charge',
        period: a.charge?.originRef || due?.feeMonth || '',
        amount: Number(a.charge?.baseAmount || a.amount),
        concessionAmount: Number(a.charge?.concessionAmount || 0),
        netDue: Number(a.charge?.netAmount || a.amount),
        paidAmount: Number(a.amount),
        remainingBalance: Number(a.charge?.balance || 0),
      }));
    } else {
      items = [
        {
          categoryCode: 'TUITION',
          categoryName: 'Monthly Tuition Fee',
          description: due?.feeMonth ? `Monthly Tuition Fee - ${due.feeMonth}` : 'Monthly Tuition Fee',
          period: due?.feeMonth || '',
          amount: due ? Number(due.baseAmount || due.netDue) : Number(payment.amount),
          concessionAmount: due ? Number(due.concessionAmount || 0) : 0,
          netDue: due ? Number(due.netDue) : Number(payment.amount),
          paidAmount: Number(payment.amount),
          remainingBalance: due ? Number(due.balance) : 0,
        },
      ];
    }

    const totalBase = items.reduce((s: number, i: any) => s + i.amount, 0);
    const totalConcession = items.reduce((s: number, i: any) => s + (i.concessionAmount || 0), 0);
    const totalNet = items.reduce((s: number, i: any) => s + i.netDue, 0);
    const totalRem = items.reduce((s: number, i: any) => s + i.remainingBalance, 0);

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
      className: due?.class?.name || payment.student?.enrollments?.[0]?.class?.name || 'General',
      feeMonth: due?.feeMonth || items[0]?.period || '',
      baseAmount: totalBase,
      concessionAmount: totalConcession,
      netDue: totalNet,
      amountPaidThisReceipt: Number(payment.amount),
      totalPaid: Number(payment.amount),
      remainingBalance: totalRem,
      paymentMode: payment.mode as any,
      paymentDate: payment.paymentDate instanceof Date
        ? payment.paymentDate.toISOString().slice(0, 10)
        : String(payment.paymentDate).slice(0, 10),
      reference: payment.reference,
      status: payment.status as any,
      issuedAt: payment.createdAt.toISOString(),
      voidedAt: payment.voidedAt?.toISOString(),
      voidReason: payment.voidReason,
      items,
    };
  }
}
