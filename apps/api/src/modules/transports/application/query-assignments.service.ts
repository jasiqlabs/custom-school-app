import { Injectable } from '@nestjs/common';
import { AssignmentStatus, TransportStatus } from '@prisma/client';
import { TransportsRepository } from '../repository/transports.repository';
import { PrismaService } from '../../../database/prisma.service';
import type { TransportAssignmentDirectoryQueryDto } from '@custom-school/contracts';

export function getAsiaKolkataDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

@Injectable()
export class QueryAssignmentsService {
  constructor(
    private readonly repository: TransportsRepository,
    private readonly prisma: PrismaService
  ) {}

  async listAssignments(schoolId: string, filter: TransportAssignmentDirectoryQueryDto) {
    let studentIds: string[] | undefined;

    if (filter.query && filter.query.trim().length > 0) {
      const q = filter.query.trim().toLowerCase();
      const students = await this.prisma.student.findMany({
        where: {
          schoolId,
          OR: [
            { normalizedCode: { contains: q.replace(/\s+/g, '') } },
            { normalizedName: { contains: q } },
          ],
        },
        select: { id: true },
        take: 100,
      });
      studentIds = students.map(s => s.id);
      if (studentIds.length === 0) {
        return {
          items: [],
          total: 0,
          page: filter.page ?? 1,
          limit: filter.limit ?? 20,
        };
      }
    }

    const { items, total, page, limit } = await this.repository.listAssignments(schoolId, filter, studentIds);

    const targetStudentIds = Array.from(new Set(items.map(i => i.studentId)));
    const studentRecords = await this.prisma.student.findMany({
      where: { id: { in: targetStudentIds } },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        status: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          select: {
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    const studentMap = new Map(studentRecords.map(s => [s.id, s]));
    const businessDate = filter.date ?? getAsiaKolkataDateString();

    const mappedItems = items.map(assignment => {
      const s = studentMap.get(assignment.studentId);
      const studentCode = s?.studentCode ?? 'UNKNOWN';
      const studentName = s?.fullName ?? 'Unknown Student';
      const enrollment = s?.enrollments?.[0];
      const className = enrollment?.class?.name ?? '—';
      const sectionName = enrollment?.section?.name ?? '—';
      const isStudentActive = s?.status === 'ACTIVE';

      const startDateStr = assignment.serviceStartDate
        ? assignment.serviceStartDate.toISOString().slice(0, 10)
        : null;
      const endDateStr = assignment.serviceEndDate
        ? assignment.serviceEndDate.toISOString().slice(0, 10)
        : null;

      const isDateValid =
        (!startDateStr || startDateStr <= businessDate) &&
        (!endDateStr || endDateStr >= businessDate);

      const effectiveNow =
        assignment.status === AssignmentStatus.ACTIVE &&
        assignment.transport.status === TransportStatus.ACTIVE &&
        assignment.stoppage.status === TransportStatus.ACTIVE &&
        isStudentActive &&
        isDateValid;

      return {
        id: assignment.id,
        schoolId: assignment.schoolId,
        studentId: assignment.studentId,
        studentCode,
        studentName,
        className,
        sectionName,
        transportId: assignment.transportId,
        transportName: assignment.transport.name,
        transportNumber: assignment.transport.transportNumber,
        stoppageId: assignment.stoppageId,
        stoppageName: assignment.stoppage.name,
        status: assignment.status,
        serviceStartDate: startDateStr,
        serviceEndDate: endDateStr,
        startedAt: assignment.startedAt.toISOString(),
        endedAt: assignment.endedAt ? assignment.endedAt.toISOString() : null,
        endedReason: assignment.endedReason,
        effectiveNow,
        createdBy: assignment.createdBy,
        version: assignment.version,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
      };
    });

    // If filter requested effectiveNow = true, filter in-memory if needed
    let finalItems = mappedItems;
    if (filter.effectiveNow === true) {
      finalItems = mappedItems.filter(i => i.effectiveNow);
    }

    return {
      items: finalItems,
      total: filter.effectiveNow === true ? finalItems.length : total,
      page,
      limit,
    };
  }
}
