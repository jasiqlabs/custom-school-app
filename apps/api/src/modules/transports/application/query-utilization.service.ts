import { Injectable } from '@nestjs/common';
import { AssignmentStatus, TransportStatus } from '@prisma/client';
import { TransportsRepository } from '../repository/transports.repository';
import { PrismaService } from '../../../database/prisma.service';
import { getAsiaKolkataDateString } from './query-assignments.service';
import type { TransportEffectiveCountsDto, TransportEffectiveSummaryDto } from '@custom-school/contracts';

@Injectable()
export class QueryUtilizationService {
  constructor(
    private readonly repository: TransportsRepository,
    private readonly prisma: PrismaService
  ) {}

  async getEffectiveCounts(schoolId: string, customDate?: string): Promise<TransportEffectiveCountsDto> {
    const businessDate = customDate ?? getAsiaKolkataDateString();

    // 1. Fetch all active transports and active stoppages for the school
    const transports = await this.prisma.transport.findMany({
      where: { schoolId },
      include: {
        stoppages: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    // 2. Fetch all active assignments for the school with student status
    const assignments = await this.prisma.transportAssignment.findMany({
      where: {
        schoolId,
        status: AssignmentStatus.ACTIVE,
      },
      include: {
        student: {
          select: { status: true },
        },
        transport: {
          select: { status: true },
        },
        stoppage: {
          select: { status: true },
        },
      },
    });

    // 3. Filter for effectiveNow
    const effectiveAssignments = assignments.filter(a => {
      if (a.student.status !== 'ACTIVE') return false;
      if (a.transport.status !== TransportStatus.ACTIVE) return false;
      if (a.stoppage.status !== TransportStatus.ACTIVE) return false;

      const start = a.serviceStartDate ? a.serviceStartDate.toISOString().slice(0, 10) : null;
      const end = a.serviceEndDate ? a.serviceEndDate.toISOString().slice(0, 10) : null;

      if (start && start > businessDate) return false;
      if (end && end < businessDate) return false;

      return true;
    });

    // 4. Group by transport and stoppage
    const transportCountMap = new Map<string, number>();
    const stoppageCountMap = new Map<string, number>();

    for (const ea of effectiveAssignments) {
      transportCountMap.set(ea.transportId, (transportCountMap.get(ea.transportId) ?? 0) + 1);
      stoppageCountMap.set(ea.stoppageId, (stoppageCountMap.get(ea.stoppageId) ?? 0) + 1);
    }

    const transportItems = transports.map(t => {
      const effectiveStudents = transportCountMap.get(t.id) ?? 0;
      const stoppageItems = t.stoppages.map(s => ({
        id: s.id,
        name: s.name,
        sortOrder: s.sortOrder,
        status: s.status,
        effectiveStudents: stoppageCountMap.get(s.id) ?? 0,
      }));

      return {
        id: t.id,
        name: t.name,
        transportNumber: t.transportNumber,
        vehicleNumber: t.vehicleNumber,
        status: t.status,
        effectiveStudents,
        stoppages: stoppageItems,
      };
    });

    const activeTransportsCount = transports.filter(t => t.status === TransportStatus.ACTIVE).length;
    const activeStoppagesCount = transports
      .filter(t => t.status === TransportStatus.ACTIVE)
      .flatMap(t => t.stoppages)
      .filter(s => s.status === TransportStatus.ACTIVE).length;

    return {
      totalActiveTransports: activeTransportsCount,
      totalActiveStoppages: activeStoppagesCount,
      totalEffectiveStudents: effectiveAssignments.length,
      businessDate,
      transports: transportItems,
    };
  }

  async getEffectiveSummary(schoolId: string): Promise<TransportEffectiveSummaryDto> {
    const counts = await this.getEffectiveCounts(schoolId);
    return {
      availability: 'AVAILABLE',
      activeTransports: counts.totalActiveTransports,
      activeStoppages: counts.totalActiveStoppages,
      effectiveStudents: counts.totalEffectiveStudents,
    };
  }
}
