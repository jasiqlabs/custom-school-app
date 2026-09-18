import { Injectable } from '@nestjs/common';
import type { TransportSummaryDto } from '@custom-school/contracts';

export const TRANSPORT_PUBLIC_FACADE = 'TRANSPORT_PUBLIC_FACADE';

export interface TransportPublicFacade {
  getStudentTransportSummary(input: { schoolId: string; studentId: string }): Promise<TransportSummaryDto>;
}

@Injectable()
export class UnavailableTransportFacade implements TransportPublicFacade {
  async getStudentTransportSummary(): Promise<TransportSummaryDto> {
    return {
      availability: 'UNAVAILABLE',
      reason: 'Transport management module is not currently active'
    };
  }
}
