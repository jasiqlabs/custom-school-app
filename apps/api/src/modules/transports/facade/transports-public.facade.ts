import { Injectable } from '@nestjs/common';
import { AssignmentStatus } from '@prisma/client';
import { TransportsRepository } from '../repository/transports.repository';
import { QueryUtilizationService } from '../application/query-utilization.service';
import type {
  TransportPublicFacade,
  TransportSummaryDto,
  ActiveTransportChoicesDto,
  TransportEffectiveSummaryDto,
  TransportEffectiveCountsDto,
} from '@custom-school/contracts';

@Injectable()
export class TransportsPublicFacadeImpl implements TransportPublicFacade {
  constructor(
    private readonly repository: TransportsRepository,
    private readonly queryUtilizationService: QueryUtilizationService
  ) {}

  async getStudentTransportSummary(input: { schoolId: string; studentId: string }): Promise<TransportSummaryDto> {
    const { schoolId, studentId } = input;
    const history = await this.repository.listStudentHistory(schoolId, studentId);

    const activeAssignment = history.find(h => h.status === AssignmentStatus.ACTIVE);

    return {
      availability: 'AVAILABLE',
      assignment: activeAssignment
        ? {
            id: activeAssignment.id,
            routeId: activeAssignment.transportId,
            routeName: activeAssignment.transport.name,
            stoppageId: activeAssignment.stoppageId,
            stoppageName: activeAssignment.stoppage.name,
            monthlyCharge: 0,
            serviceStartDate: activeAssignment.serviceStartDate
              ? activeAssignment.serviceStartDate.toISOString().slice(0, 10)
              : '',
            serviceEndDate: activeAssignment.serviceEndDate
              ? activeAssignment.serviceEndDate.toISOString().slice(0, 10)
              : null,
            status: activeAssignment.status as 'ACTIVE' | 'ENDED',
          }
        : null,
      history: history.map(h => ({
        id: h.id,
        routeName: h.transport.name,
        stoppageName: h.stoppage.name,
        serviceStartDate: h.serviceStartDate ? h.serviceStartDate.toISOString().slice(0, 10) : '',
        serviceEndDate: h.serviceEndDate ? h.serviceEndDate.toISOString().slice(0, 10) : null,
        status: h.status as 'ACTIVE' | 'ENDED',
      })),
    };
  }

  async getActiveChoices(schoolId: string): Promise<ActiveTransportChoicesDto> {
    return this.repository.getActiveChoices(schoolId);
  }

  async getEffectiveSummary(schoolId: string): Promise<TransportEffectiveSummaryDto> {
    return this.queryUtilizationService.getEffectiveSummary(schoolId);
  }

  async getEffectiveCounts(schoolId: string): Promise<TransportEffectiveCountsDto> {
    return this.queryUtilizationService.getEffectiveCounts(schoolId);
  }
}
