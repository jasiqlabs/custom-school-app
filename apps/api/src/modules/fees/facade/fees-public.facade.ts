import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { FeesRepository } from '../repository/fees.repository';
import { roundHalfUp } from '../domain/concession-calculator';
import { getKolkataDateParts } from '../domain/fee-date-utils';
import type {
  FeesPublicFacade,
  FeeSummaryDto,
  CollectionBucket,
} from '@custom-school/contracts';

@Injectable()
export class FeesPublicFacadeImpl implements FeesPublicFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesRepository: FeesRepository
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
}
