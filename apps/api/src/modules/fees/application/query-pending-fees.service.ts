import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

    let selectedYear: { id: string; startDate: Date; endDate: Date } | null = null;
    if (filter.academicSessionId) {
      selectedYear = await this.prisma.academicSession.findFirst({
        where: { schoolId, id: filter.academicSessionId },
        select: { id: true, startDate: true, endDate: true },
      });
      if (!selectedYear) throw new BadRequestException('Academic year does not belong to this school');
      if (feeMonth < selectedYear.startDate.toISOString().slice(0, 7) ||
          feeMonth > selectedYear.endDate.toISOString().slice(0, 7)) {
        throw new BadRequestException('The chosen fee month is outside the academic year');
      }
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const search = filter.search?.trim().toLowerCase();

    // 1. Fetch active students with active enrollment
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        ...(filter.academicSessionId ? { academicSessionId: filter.academicSessionId } : {}),
        ...(filter.classId ? { classId: filter.classId } : {}),
        student: {
          ...(search
            ? {
                OR: [
                  { studentCode: { contains: search, mode: 'insensitive' } },
                  { fullName: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
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

    // Multiple historical enrollments can refer to one student. Show each student once.
    const distinctEnrollments = new Map<string, (typeof enrollments)[number]>();
    for (const enrollment of enrollments) {
      const previous = distinctEnrollments.get(enrollment.student.id);
      if (!previous || (previous.status !== 'ACTIVE' && enrollment.status === 'ACTIVE')) {
        distinctEnrollments.set(enrollment.student.id, enrollment);
      }
    }
    const uniqueEnrollments = [...distinctEnrollments.values()];

    // Read-only report: fee assessment is an explicit MANAGER write, never a GET/export side effect.
    // Historical obligations for exited students remain visible using their last enrollment.

    // 2. Fetch only obligations assessed for this period. Previous months appear in their own period reports.
    // A different month with an unpaid balance is not automatically this month's new fee.
    const studentIds = uniqueEnrollments.map((e) => e.student.id);
    const [dues, charges] = await Promise.all([
      this.prisma.feeDue.findMany({
        where: {
          schoolId,
          feeMonth,
          studentId: { in: studentIds },
        },
      }),
      this.prisma.feeCharge.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          ...(filter.academicSessionId ? { academicSessionId: filter.academicSessionId } : {}),
          OR: [
            { originRef: feeMonth },
            { dueDate: { gte: new Date(feeMonth + '-01T00:00:00.000Z'),
              lt: new Date(Date.UTC(Number(feeMonth.slice(0, 4)), Number(feeMonth.slice(5, 7)), 1)) } },
            { originRef: 'ONCE', createdAt: { gte: new Date(feeMonth + '-01T00:00:00.000Z'),
              lt: new Date(Date.UTC(Number(feeMonth.slice(0, 4)), Number(feeMonth.slice(5, 7)), 1)) } },
          ],
        },
        include: { category: { select: { code: true } } },
      }),
    ]);

    const dueMap = new Map<string, (typeof dues)[0]>();
    for (const d of dues) {
      dueMap.set(d.studentId, d);
    }

    const chargesByStudent = new Map<string, (typeof charges)>();
    for (const c of charges) {
      const list = chargesByStudent.get(c.studentId) || [];
      list.push(c);
      chargesByStudent.set(c.studentId, list);
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

    for (const e of uniqueEnrollments) {
      const student = e.student;
      const classId = e.class.id;
      const className = e.class.name;
      const studentCharges = chargesByStudent.get(student.id) || [];
      const due = dueMap.get(student.id);
      const additionalLegacyDue = due && !studentCharges.some(c => c.category.code === 'TUITION' && c.originRef === due.feeMonth) ? due : undefined;

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

      if (studentCharges.length > 0) {
        studentsWithDuesCount++;
        let base = 0;
        let concession = 0;
        let net = 0;
        let paid = 0;
        let bal = 0;

        for (const ch of studentCharges) {
          base = roundHalfUp(base + Number(ch.baseAmount));
          concession = roundHalfUp(concession + Number(ch.concessionAmount));
          net = roundHalfUp(net + Number(ch.netAmount));
          paid = roundHalfUp(paid + Number(ch.paidAmount));
          bal = roundHalfUp(bal + Number(ch.balance));
        }

        if (additionalLegacyDue) {
          base = roundHalfUp(base + Number(additionalLegacyDue.baseAmount));
          concession = roundHalfUp(concession + Number(additionalLegacyDue.concessionAmount));
          net = roundHalfUp(net + Number(additionalLegacyDue.netDue));
          paid = roundHalfUp(paid + Number(additionalLegacyDue.paidAmount));
          bal = roundHalfUp(bal + Number(additionalLegacyDue.balance));
        }
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
          dueId: due?.id || studentCharges[0].id,
          feeMonth,
          baseAmount: base,
          concessionAmount: concession,
          netDue: net,
          paidAmount: paid,
          balance: bal,
          status: bal > 0 ? 'GENERATED_PENDING' : 'PAID',
        });
      } else if (due) {
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
      academicSessionId: filter.academicSessionId,
      totalStudents: uniqueEnrollments.length,
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
