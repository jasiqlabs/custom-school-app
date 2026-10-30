import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { FeesRepository } from '../repository/fees.repository';
import { GenerateDuesService } from '../application/generate-dues.service';
import { roundHalfUp } from '../domain/concession-calculator';
import { getKolkataDateParts } from '../domain/fee-date-utils';
import type {
  FeesPublicFacade,
  FeeSummaryDto,
  CollectionBucket,
  DocumentClearanceInput,
  DocumentClearanceResult,
} from '@custom-school/contracts';

@Injectable()
export class FeesPublicFacadeImpl implements FeesPublicFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesRepository: FeesRepository,
    private readonly generateDuesService?: GenerateDuesService
  ) {}

  async getStudentFeeSummary(input: {
    schoolId: string;
    studentId: string;
    month?: string;
  }): Promise<FeeSummaryDto> {
    const { schoolId, studentId } = input;
    const targetMonth = input.month || getKolkataDateParts().monthString;

    // 1. Fetch student and active enrollment
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: {
        id: true,
        concessionType: true,
        concessionValue: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { classId: true },
        },
      },
    });

    if (!student) {
      return {
        availability: 'UNAVAILABLE',
        reason: 'Student not found',
      };
    }

    // 2. Fetch class fee config
    let baseFee = 0;
    const classId = student.enrollments[0]?.classId;
    if (classId) {
      const config = await this.feesRepository.findEffectiveConfig(
        schoolId,
        classId,
        targetMonth
      );
      if (config) {
        baseFee = Number(config.amount);
      }
    }

    // Important: dashboards and profile GETs are strictly read-only.
    // The operator's explicit dues/generate command owns fee assessment.

    // 3. Fetch all dues for student
    const dues = await this.feesRepository.listDuesByStudent(schoolId, studentId);

    let totalNetDue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const monthWiseSummary = dues.map((d) => {
      const net = roundHalfUp(Number(d.netDue));
      const paid = roundHalfUp(Number(d.paidAmount));
      const bal = roundHalfUp(Number(d.balance));

      totalNetDue = roundHalfUp(totalNetDue + net);
      totalPaid = roundHalfUp(totalPaid + paid);
      totalOutstanding = roundHalfUp(totalOutstanding + bal);

      return {
        month: d.feeMonth,
        dueAmount: net,
        paidAmount: paid,
        balance: bal,
        status: d.status as 'PAID' | 'PARTIAL' | 'UNPAID',
      };
    });

    return {
      availability: 'AVAILABLE',
      currency: 'INR',
      baseFee,
      concessionType: student.concessionType as any,
      concessionValue: Number(student.concessionValue),
      netDue: totalNetDue,
      totalPaid,
      outstandingBalance: totalOutstanding,
      monthWiseSummary,
    };
  }

  async getCollectionTotal(input: {
    schoolId: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<number> {
    const payments = await this.feesRepository.findPaymentsForDashboard(
      input.schoolId,
      input.fromDate,
      input.toDate
    );

    const total = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    return roundHalfUp(total);
  }

  async getOutstandingTotal(input: {
    schoolId: string;
    feeMonth?: string;
  }): Promise<number> {
    const dues = await this.feesRepository.findOutstandingDues(
      input.schoolId,
      input.feeMonth
    );

    const total = dues.reduce((acc, d) => acc + Number(d.balance), 0);
    return roundHalfUp(total);
  }

  async getCollectionBuckets(input: {
    schoolId: string;
    period: 'day' | 'week' | 'month';
    fromDate: string;
    toDate: string;
  }): Promise<CollectionBucket[]> {
    const payments = await this.feesRepository.findPaymentsForDashboard(
      input.schoolId,
      input.fromDate,
      input.toDate
    );

    const bucketMap = new Map<string, number>();

    for (const p of payments) {
      const parts = getKolkataDateParts(p.paymentDate);
      let bucketKey = parts.dateString; // default 'day': YYYY-MM-DD

      if (input.period === 'month') {
        bucketKey = parts.monthString; // YYYY-MM
      } else if (input.period === 'week') {
        // Compute approximate week identifier
        const d = new Date(p.paymentDate);
        const dayOfYear = Math.floor(
          (d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000
        );
        const weekNum = Math.ceil((dayOfYear + 1) / 7);
        bucketKey = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }

      const current = bucketMap.get(bucketKey) || 0;
      bucketMap.set(bucketKey, roundHalfUp(current + Number(p.amount)));
    }

    return Array.from(bucketMap.entries())
      .map(([bucket, amount]) => ({ bucket, amount }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }

  async ensureStudentDues(input: {
    schoolId: string;
    studentId: string;
    month?: string;
  }): Promise<void> {
    if (this.generateDuesService) {
      if (input.month) {
        await this.generateDuesService.generateDueForStudent(
          input.schoolId,
          input.studentId,
          input.month
        );
      } else {
        await this.generateDuesService.ensureDuesForApplicableMonths(
          input.schoolId,
          input.studentId
        );
      }
    }
  }

  async syncConcessionDues(input: {
    schoolId: string;
    studentId: string;
  }): Promise<void> {
    if (this.generateDuesService) {
      await this.generateDuesService.syncStudentConcessionDues(
        input.schoolId,
        input.studentId
      );
    }
  }

  async checkStudentDocumentClearance(
    input: DocumentClearanceInput,
    tx?: Prisma.TransactionClient,
  ): Promise<DocumentClearanceResult> {
    const { schoolId, studentId, purpose } = input;
    const db = tx || this.prisma;

    // 1. Determine cutoffMonth and cutoffDate
    let cutoffMonth: string | undefined = input.cutoffMonth;
    let cutoffDate: Date | undefined;

    if (input.asOfDate) {
      cutoffDate = typeof input.asOfDate === 'string' ? new Date(input.asOfDate) : input.asOfDate;
      if (!cutoffMonth) {
        cutoffMonth = cutoffDate.toISOString().slice(0, 7);
      }
    }

    if (!cutoffMonth && purpose === 'ADMIT_CARD') {
      cutoffMonth = getKolkataDateParts().monthString;
    }

    if (!cutoffMonth && input.academicSessionId) {
      const session = await db.academicSession.findFirst({
        where: { id: input.academicSessionId, schoolId },
        select: { endDate: true },
      });
      if (session?.endDate) {
        cutoffMonth = session.endDate.toISOString().slice(0, 7);
      }
    }

    // 2. Fetch all unpaid FeeCharge records for student
    const charges = await db.feeCharge.findMany({
      where: {
        schoolId,
        studentId,
        balance: { gt: 0 },
      },
      include: {
        category: true,
      },
      orderBy: [{ periodStart: 'asc' }, { createdAt: 'asc' }],
    });

    // 3. Fetch all legacy FeeDue records
    const dues = tx ? await db.feeDue.findMany({ where: { schoolId, studentId } })
      : await this.feesRepository.listDuesByStudent(schoolId, studentId);
    const unpaidDues = dues.filter((d) => Number(d.balance) > 0);

    const unpaidItems: Array<{ categoryName: string; feeMonth?: string; balance: number }> = [];
    let totalOutstanding = 0;
    const accountedChargeMonths = new Set<string>();

    for (const c of charges) {
      const bal = roundHalfUp(Number(c.balance));
      if (bal <= 0) continue;

      const chargeMonth = c.originRef || (c.periodStart ? c.periodStart.toISOString().slice(0, 7) : null);

      // TC fee clearance (TASK-032): check all dues across all sessions
      if (purpose === 'TC') {
        if (cutoffDate && c.dueDate && c.dueDate > cutoffDate) {
          continue;
        }
        totalOutstanding = roundHalfUp(totalOutstanding + bal);
        unpaidItems.push({
          categoryName: c.category?.displayName || 'Fee Charge',
          feeMonth: c.originRef || undefined,
          balance: bal,
        });
        if (chargeMonth && c.category?.code === 'TUITION') accountedChargeMonths.add(chargeMonth);
        continue;
      }

      // For ADMIT_CARD or general examination clearance:
      // A student must be eligible for an admit card when all applicable fees due up to the examination month have been paid.
      // Future-month fees that are not yet due or are outside the applicable academic year's configured fee schedule must not block admit card generation.
      if (cutoffMonth && chargeMonth && chargeMonth > cutoffMonth) {
        continue;
      }

      if (cutoffDate && c.dueDate && c.dueDate > cutoffDate) {
        continue;
      }

      totalOutstanding = roundHalfUp(totalOutstanding + bal);
      unpaidItems.push({
        categoryName: c.category?.displayName || 'Fee Charge',
        feeMonth: c.originRef || undefined,
        balance: bal,
      });
      if (chargeMonth && c.category?.code === 'TUITION') accountedChargeMonths.add(chargeMonth);
    }

    // Bridge any unpaid dues from legacy fee_dues not already in fee_charges
    for (const d of unpaidDues) {
      const bal = roundHalfUp(Number(d.balance));
      if (bal <= 0) continue;

      if (accountedChargeMonths.has(d.feeMonth)) {
        continue;
      }

      if (purpose !== 'TC' && cutoffMonth && d.feeMonth > cutoffMonth) {
        continue;
      }

      totalOutstanding = roundHalfUp(totalOutstanding + bal);
      unpaidItems.push({
        categoryName: 'Monthly Tuition Fee',
        feeMonth: d.feeMonth,
        balance: bal,
      });
    }

    const reasons: string[] = [];
    if (totalOutstanding > 0) {
      const summaryParts = unpaidItems.slice(0, 3).map((item) =>
        `${item.categoryName}${item.feeMonth ? ` (${item.feeMonth})` : ''}: ₹${item.balance.toFixed(2)}`
      );
      if (unpaidItems.length > 3) {
        summaryParts.push(`+${unpaidItems.length - 3} other fee item(s)`);
      }
      reasons.push(`Outstanding balance of ₹${totalOutstanding.toFixed(2)} [${summaryParts.join(', ')}]`);
    }

    return {
      cleared: totalOutstanding === 0,
      totalOutstanding,
      reasons,
      unpaidItems,
    };
  }
}
