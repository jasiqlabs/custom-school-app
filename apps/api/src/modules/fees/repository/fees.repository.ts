import { Injectable } from '@nestjs/common';
import { Prisma, EntityStatus, FeeDueStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type {
  UpsertClassFeeConfigInput,
  FeePaymentFilterDto,
} from '@custom-school/contracts';

@Injectable()
export class FeesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listConfigs(schoolId: string, classId?: string) {
    return this.prisma.classFeeConfig.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
      },
      include: {
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { sortOrder: 'asc' } }, { effectiveMonth: 'desc' }],
    });
  }

  async findConfigById(schoolId: string, id: string) {
    return this.prisma.classFeeConfig.findFirst({
      where: { schoolId, id },
      include: { class: { select: { id: true, name: true } } },
    });
  }

  async findEffectiveConfig(schoolId: string, classId: string, targetMonth: string) {
    return this.prisma.classFeeConfig.findFirst({
      where: {
        schoolId,
        classId,
        status: EntityStatus.ACTIVE,
        effectiveMonth: { lte: targetMonth },
      },
      orderBy: { effectiveMonth: 'desc' },
    });
  }

  async upsertConfig(
    schoolId: string,
    userId: string,
    input: UpsertClassFeeConfigInput
  ) {
    return this.prisma.classFeeConfig.upsert({
      where: {
        schoolId_classId_effectiveMonth: {
          schoolId,
          classId: input.classId,
          effectiveMonth: input.effectiveMonth,
        },
      },
      create: {
        schoolId,
        classId: input.classId,
        effectiveMonth: input.effectiveMonth,
        amount: new Prisma.Decimal(input.amount),
        status: (input.status as EntityStatus) || EntityStatus.ACTIVE,
        createdBy: userId,
      },
      update: {
        amount: new Prisma.Decimal(input.amount),
        status: (input.status as EntityStatus) || EntityStatus.ACTIVE,
        version: { increment: 1 },
      },
      include: { class: { select: { id: true, name: true } } },
    });
  }

  async findDueByStudentAndMonth(schoolId: string, studentId: string, feeMonth: string) {
    return this.prisma.feeDue.findUnique({
      where: {
        schoolId_studentId_feeMonth: {
          schoolId,
          studentId,
          feeMonth,
        },
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
  }

  async listDuesByStudent(schoolId: string, studentId: string) {
    return this.prisma.feeDue.findMany({
      where: { schoolId, studentId },
      include: {
        class: { select: { id: true, name: true } },
      },
      orderBy: { feeMonth: 'desc' },
    });
  }

  async findDueById(schoolId: string, dueId: string) {
    return this.prisma.feeDue.findFirst({
      where: { schoolId, id: dueId },
      include: {
        student: { select: { id: true, studentCode: true, fullName: true, status: true } },
        class: { select: { id: true, name: true } },
      },
    });
  }

  async findDueByIdForUpdate(tx: Prisma.TransactionClient, schoolId: string, dueId: string) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        school_id: string;
        student_id: string;
        class_id: string;
        fee_month: string;
        base_amount: Prisma.Decimal;
        net_due: Prisma.Decimal;
        paid_amount: Prisma.Decimal;
        balance: Prisma.Decimal;
        status: FeeDueStatus;
        version: number;
      }>
    >`
      SELECT id, school_id, student_id, class_id, fee_month, base_amount, net_due, paid_amount, balance, status, version
      FROM fee_dues
      WHERE school_id = ${schoolId} AND id = ${dueId}::uuid
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async findPaymentById(schoolId: string, paymentId: string) {
    return this.prisma.feePayment.findFirst({
      where: { schoolId, id: paymentId },
      include: {
        due: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logoFileId: true,
          },
        },
      },
    });
  }

  async findPaymentByIdempotencyKey(schoolId: string, idempotencyKey: string) {
    return this.prisma.feePayment.findUnique({
      where: {
        schoolId_idempotencyKey: {
          schoolId,
          idempotencyKey,
        },
      },
      include: {
        due: {
          include: { class: { select: { id: true, name: true } } },
        },
        school: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            logoFileId: true,
          },
        },
      },
    });
  }

  async findPayments(schoolId: string, filter: FeePaymentFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FeePaymentWhereInput = {
      schoolId,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.feeMonth ? { due: { feeMonth: filter.feeMonth } } : {}),
      ...(filter.mode ? { mode: filter.mode } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.fromDate || filter.toDate
        ? {
            paymentDate: {
              ...(filter.fromDate ? { gte: new Date(filter.fromDate) } : {}),
              ...(filter.toDate ? { lte: new Date(filter.toDate) } : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { receiptNumber: { contains: filter.search, mode: 'insensitive' } },
              { studentCodeSnapshot: { contains: filter.search, mode: 'insensitive' } },
              { studentNameSnapshot: { contains: filter.search, mode: 'insensitive' } },
              { reference: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.feePayment.count({ where }),
      this.prisma.feePayment.findMany({
        where,
        include: {
          due: { select: { feeMonth: true, netDue: true, balance: true, class: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, items, page, limit };
  }

  async findPaymentsForDashboard(
    schoolId: string,
    fromDate?: string,
    toDate?: string
  ) {
    return this.prisma.feePayment.findMany({
      where: {
        schoolId,
        status: PaymentStatus.ACTIVE,
        ...(fromDate || toDate
          ? {
              paymentDate: {
                ...(fromDate ? { gte: new Date(fromDate) } : {}),
                ...(toDate ? { lte: new Date(toDate) } : {}),
              },
            }
          : {}),
      },
      select: {
        amount: true,
        paymentDate: true,
        createdAt: true,
      },
    });
  }

  async findOutstandingDues(schoolId: string, feeMonth?: string) {
    return this.prisma.feeDue.findMany({
      where: {
        schoolId,
        status: { in: [FeeDueStatus.UNPAID, FeeDueStatus.PARTIAL] },
        ...(feeMonth ? { feeMonth } : {}),
      },
      select: {
        balance: true,
      },
    });
  }

  async findMonthDuesWithStudents(schoolId: string, feeMonth: string, classId?: string) {
    return this.prisma.feeDue.findMany({
      where: {
        schoolId,
        feeMonth,
        ...(classId ? { classId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            status: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });
  }
}
