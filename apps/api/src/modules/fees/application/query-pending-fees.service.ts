import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { GenerateDuesService } from './generate-dues.service';
import { roundHalfUp } from '../domain/concession-calculator';
import type {
  PendingFeeFilterDto,
  PendingFeeReportDto,
  PendingFeeItemDto,
  ClassFeePendingSummaryDto,
} from '@custom-school/contracts';

@Injectable()
export class QueryPendingFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generateDuesService?: GenerateDuesService
  ) {}

  async getPendingReport(
    schoolId: string,
    filter: PendingFeeFilterDto
  ): Promise<PendingFeeReportDto> {
    if (!schoolId) {
      throw new BadRequestException('School ID is required');
    }
    const feeMonth = filter.feeMonth;
    if (!feeMonth) {
      throw new BadRequestException('feeMonth (YYYY-MM) is required');
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const search = filter.search?.trim().toLowerCase();

    // 1. Fetch active students with active enrollment
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(filter.classId ? { classId: filter.classId } : {}),
        student: {
          status: EntityStatus.ACTIVE,
          ...(search
            ? {
                OR: [
                  { studentCode: { contains: search, mode: 'insensitive' } },
                  { fullName: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        class: { status: EntityStatus.ACTIVE },
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
          },
        },
        class: { select: { id: true, name: true, sortOrder: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: [
        { class: { sortOrder: 'asc' } },
        { student: { fullName: 'asc' } },
      ],
    });

    // Ensure dues are generated for active students in classes with active fee configs for this month
    if (this.generateDuesService) {
      for (const e of enrollments) {
        await this.generateDuesService.generateDueForStudent(schoolId, e.student.id, feeMonth);
      }
    }

    // 2. Fetch all fee_dues for this school and feeMonth
    const studentIds = enrollments.map((e) => e.student.id);
    const dues = await this.prisma.feeDue.findMany({
      where: {
        schoolId,
        feeMonth,
        studentId: { in: studentIds },
      },
    });

    const dueMap = new Map<string, (typeof dues)[0]>();
    for (const d of dues) {
      dueMap.set(d.studentId, d);
    }

    // 3. Build unified items and aggregates
    const items: PendingFeeItemDto[] = [];
    const classMap = new Map<
      string,
      {
        classId: string;
        className: string;
        sortOrder: number;
        totalStudents: number;
        pendingCount: number;
        netDue: number;
        collected: number;
        outstanding: number;
      }
    >();

    let totalBaseAmount = 0;
    let totalConcessions = 0;
    let totalNetDue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let studentsWithDuesCount = 0;
    let studentsPendingCount = 0;
    let notGeneratedCount = 0;

    for (const e of enrollments) {
      const student = e.student;
      const classId = e.class.id;
      const className = e.class.name;
      const due = dueMap.get(student.id);

      // Class aggregate initialization
      if (!classMap.has(classId)) {
        classMap.set(classId, {
          classId,
          className,
          sortOrder: e.class.sortOrder,
          totalStudents: 0,
          pendingCount: 0,
          netDue: 0,
          collected: 0,
          outstanding: 0,
        });
      }
      const classAgg = classMap.get(classId)!;
      classAgg.totalStudents++;

      if (due) {
        studentsWithDuesCount++;
        const base = roundHalfUp(Number(due.baseAmount));
        const concession = roundHalfUp(Number(due.concessionAmount));
        const net = roundHalfUp(Number(due.netDue));
        const paid = roundHalfUp(Number(due.paidAmount));
        const bal = roundHalfUp(Number(due.balance));

        totalBaseAmount = roundHalfUp(totalBaseAmount + base);
        totalConcessions = roundHalfUp(totalConcessions + concession);
        totalNetDue = roundHalfUp(totalNetDue + net);
        totalCollected = roundHalfUp(totalCollected + paid);
        totalOutstanding = roundHalfUp(totalOutstanding + bal);

        classAgg.netDue = roundHalfUp(classAgg.netDue + net);
        classAgg.collected = roundHalfUp(classAgg.collected + paid);
        classAgg.outstanding = roundHalfUp(classAgg.outstanding + bal);

        if (bal > 0) {
          studentsPendingCount++;
          classAgg.pendingCount++;
        }

        items.push({
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          classId,
          className,
          sectionName: e.section?.name,
          dueId: due.id,
          feeMonth,
          baseAmount: base,
          concessionAmount: concession,
          netDue: net,
          paidAmount: paid,
          balance: bal,
          status: bal > 0 ? 'GENERATED_PENDING' : 'PAID',
        });
      } else {
        notGeneratedCount++;
        items.push({
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          classId,
          className,
          sectionName: e.section?.name,
          feeMonth,
          baseAmount: 0,
          concessionAmount: 0,
          netDue: 0,
          paidAmount: 0,
          balance: 0,
          status: 'NOT_GENERATED',
        });
      }
    }

    // Sort class summaries by sortOrder
    const classSummaries: ClassFeePendingSummaryDto[] = Array.from(classMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ classId, className, totalStudents, pendingCount, netDue, collected, outstanding }) => ({
        classId,
        className,
        totalStudents,
        pendingCount,
        netDue,
        collected,
        outstanding,
      }));

    // Paginate items
    const skip = (page - 1) * limit;
    const paginatedItems = items.slice(skip, skip + limit);

    return {
      feeMonth,
      totalStudents: enrollments.length,
      studentsWithDuesCount,
      studentsPendingCount,
      notGeneratedCount,
      totalBaseAmount,
      totalConcessions,
      totalNetDue,
      totalCollected,
      totalOutstanding,
      classSummaries,
      items: paginatedItems,
      totalCount: items.length,
      page,
      limit,
    };
  }
}
