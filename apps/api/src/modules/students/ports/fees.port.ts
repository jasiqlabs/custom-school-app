import { Injectable } from '@nestjs/common';
import type { FeeSummaryDto } from '@custom-school/contracts';

export const FEES_PUBLIC_FACADE = 'FEES_PUBLIC_FACADE';

export interface FeesPublicFacade {
  getStudentFeeSummary(input: { schoolId: string; studentId: string; month?: string }): Promise<FeeSummaryDto>;
}

@Injectable()
export class UnavailableFeesFacade implements FeesPublicFacade {
  async getStudentFeeSummary(): Promise<FeeSummaryDto> {
    return {
      availability: 'UNAVAILABLE',
      reason: 'Fee management module is not currently active'
    };
  }
}
