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
    const student = typeof this.repository.findStudent === 'function'
      ? await this.repository.findStudent(schoolId, studentId)
      : null;

    const activeAssignment = student && student.transportRequired === false
      ? null
      : history.find(h => h.status === AssignmentStatus.ACTIVE);

    return {
      availability: 'AVAILABLE',
      assignment: activeAssignment
        ? {
            id: activeAssignment.id,
            routeId: activeAssignment.transportId,
            routeName: activeAssignment.transport.name,
            routeNumber: activeAssignment.transport.transportNumber,
            vehicleNumber: activeAssignment.transport.vehicleNumber,
            pickupTime: activeAssignment.transport.pickupTime,
            dropTime: activeAssignment.transport.dropTime,
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
        routeId: h.transportId,
        routeName: h.transport.name,
        routeNumber: h.transport.transportNumber,
        vehicleNumber: h.transport.vehicleNumber,
        pickupTime: h.transport.pickupTime,
        dropTime: h.transport.dropTime,
        stoppageId: h.stoppageId,
        stoppageName: h.stoppage.name,
        serviceStartDate: h.serviceStartDate ? h.serviceStartDate.toISOString().slice(0, 10) : '',
        serviceEndDate: h.serviceEndDate ? h.serviceEndDate.toISOString().slice(0, 10) : null,
        status: h.status as 'ACTIVE' | 'ENDED',
        endedReason: h.endedReason,
      })),
    };
  }

  async getActiveChoices(schoolId: string): Promise<ActiveTransportChoicesDto> {
    return this.repository.getActiveChoices(schoolId);
  }

  async getEffectiveSummary(schoolId: string): Promise<TransportEffectiveSummaryDto> {
    return this.queryUtilizationService.getEffectiveSummary(schoolId);
  }

  async getEffectiveCounts(schoolId: string, customDate?: string): Promise<TransportEffectiveCountsDto> {
    return this.queryUtilizationService.getEffectiveCounts(schoolId, customDate);
  }
}
