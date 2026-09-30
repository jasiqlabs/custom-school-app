import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  StudentsPublicFacade,
  FeesPublicFacade,
  TransportPublicFacade,
  WidgetResponse,
  StudentCountsDto,
  GenderCountsDto,
  FeeCollectionDto,
  FeeDuesDto,
  FeeChartDto,
  TransportDashboardDto,
} from '@custom-school/contracts';
import {
  DASHBOARD_STUDENTS_FACADE,
  DASHBOARD_FEES_FACADE,
  DASHBOARD_TRANSPORT_FACADE,
} from '../ports/dashboard-facades.port';
import { DashboardCacheService } from '../infrastructure/dashboard-cache.service';
import { getKolkataDateParts } from '../../fees/domain/fee-date-utils';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DASHBOARD_STUDENTS_FACADE)
    private readonly studentsFacade: StudentsPublicFacade,
    @Inject(DASHBOARD_FEES_FACADE)
    private readonly feesFacade: FeesPublicFacade,
    @Inject(DASHBOARD_TRANSPORT_FACADE)
    private readonly transportFacade: TransportPublicFacade,
    private readonly cache: DashboardCacheService,
  ) {}

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs = 8000,
    fallbackReason = 'Upstream service timed out',
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(fallbackReason)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  async getStudentSummary(schoolId: string): Promise<WidgetResponse<StudentCountsDto>> {
    const cached = this.cache.get<WidgetResponse<StudentCountsDto>>(schoolId, 'students');
    if (cached) return cached;

    const generatedAt = new Date().toISOString();
    try {
      const res = await this.withTimeout(
        this.studentsFacade.getStudentDashboardSummary({ schoolId }),
      );

      if (res.availability === 'UNAVAILABLE') {
        return {
          availability: 'UNAVAILABLE',
          generatedAt,
          reason: res.reason || 'Student service currently unavailable',
        };
      }

      const response: WidgetResponse<StudentCountsDto> = {
        availability: 'AVAILABLE',
        generatedAt,
        data: {
          total: res.total ?? 0,
          active: res.active ?? 0,
          inactive: res.inactive ?? 0,
        },
      };

      this.cache.set(schoolId, 'students', '', response, 30);
      return response;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch student summary for school ${schoolId}: ${err.message}`);
      return {
        availability: 'UNAVAILABLE',
        generatedAt,
        reason: err.message || 'Student service error',
      };
    }
  }

  async getGenderSummary(schoolId: string): Promise<WidgetResponse<GenderCountsDto>> {
    const cached = this.cache.get<WidgetResponse<GenderCountsDto>>(schoolId, 'gender');
    if (cached) return cached;

    const generatedAt = new Date().toISOString();
    try {
      const res = await this.withTimeout(
        this.studentsFacade.getStudentDashboardSummary({ schoolId }),
      );

      if (res.availability === 'UNAVAILABLE') {
        return {
          availability: 'UNAVAILABLE',
          generatedAt,
          reason: res.reason || 'Student service currently unavailable',
        };
      }

      const response: WidgetResponse<GenderCountsDto> = {
        availability: 'AVAILABLE',
        generatedAt,
        data: {
          activeBoys: res.activeBoys ?? 0,
          activeGirls: res.activeGirls ?? 0,
        },
      };

      this.cache.set(schoolId, 'gender', '', response, 30);
      return response;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch gender summary for school ${schoolId}: ${err.message}`);
      return {
        availability: 'UNAVAILABLE',
        generatedAt,
        reason: err.message || 'Student service error',
      };
    }
  }

  async getFeeCollection(
    schoolId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<WidgetResponse<FeeCollectionDto>> {
    const filterKey = `${fromDate || ''}_${toDate || ''}`;
    const cached = this.cache.get<WidgetResponse<FeeCollectionDto>>(schoolId, 'feeCollection', filterKey);
    if (cached) return cached;

    const generatedAt = new Date().toISOString();
    try {
      const totalCollected = await this.withTimeout(
        this.feesFacade.getCollectionTotal({
          schoolId,
          fromDate,
          toDate,
        }),
      );

      const response: WidgetResponse<FeeCollectionDto> = {
        availability: 'AVAILABLE',
        generatedAt,
        data: {
          totalCollected: totalCollected ?? 0,
          currency: 'INR',
          fromDate,
          toDate,
        },
      };

      this.cache.set(schoolId, 'feeCollection', filterKey, response, 30);
      return response;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch fee collection for school ${schoolId}: ${err.message}`);
      return {
        availability: 'UNAVAILABLE',
        generatedAt,
        reason: err.message || 'Fee service error',
      };
    }
  }

  async getFeeDues(
    schoolId: string,
    feeMonth?: string,
  ): Promise<WidgetResponse<FeeDuesDto>> {
    const targetMonth = feeMonth || getKolkataDateParts().monthString;
    const filterKey = targetMonth;
    const cached = this.cache.get<WidgetResponse<FeeDuesDto>>(schoolId, 'feeDues', filterKey);
    if (cached) return cached;

    const generatedAt = new Date().toISOString();
    try {
      const totalOutstanding = await this.withTimeout(
        this.feesFacade.getOutstandingTotal({
          schoolId,
          feeMonth: targetMonth,
        }),
      );

      const response: WidgetResponse<FeeDuesDto> = {
        availability: 'AVAILABLE',
        generatedAt,
        data: {
          totalOutstanding: totalOutstanding ?? 0,
          currency: 'INR',
          feeMonth: targetMonth,
        },
      };

      this.cache.set(schoolId, 'feeDues', filterKey, response, 30);
      return response;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch fee dues for school ${schoolId}: ${err.message}`);
      return {
        availability: 'UNAVAILABLE',
        generatedAt,
        reason: err.message || 'Fee service error',
      };
    }
  }

  async getFeeChart(
    schoolId: string,
    period: 'day' | 'week' | 'month',
    fromDate?: string,
    toDate?: string,
  ): Promise<WidgetResponse<FeeChartDto>> {
    const parts = getKolkataDateParts();
    let defaultFrom = fromDate;
    let defaultTo = toDate || parts.dateString;

    if (!defaultFrom) {
      const now = new Date();
      if (period === 'day') {
        const d = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
        defaultFrom = getKolkataDateParts(d).dateString;
      } else if (period === 'week') {
        const d = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
        defaultFrom = getKolkataDateParts(d).dateString;
      } else {
        const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        defaultFrom = getKolkataDateParts(d).dateString;
      }
    }

    const filterKey = `${period}_${defaultFrom}_${defaultTo}`;
    const cached = this.cache.get<WidgetResponse<FeeChartDto>>(schoolId, 'feeChart', filterKey);
    if (cached) return cached;

    const generatedAt = new Date().toISOString();
    try {
      const buckets = await this.withTimeout(
        this.feesFacade.getCollectionBuckets({
          schoolId,
          period,
          fromDate: defaultFrom,
          toDate: defaultTo,
        }),
      );

      const response: WidgetResponse<FeeChartDto> = {
        availability: 'AVAILABLE',
        generatedAt,
        data: {
          period,
          currency: 'INR',
          buckets: buckets || [],
        },
      };

      this.cache.set(schoolId, 'feeChart', filterKey, response, 30);
      return response;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch fee chart for school ${schoolId}: ${err.message}`);
      return {
        availability: 'UNAVAILABLE',
        generatedAt,
        reason: err.message || 'Fee service error',
      };
    }
  }

  async getTransportSummary(
    schoolId: string,
    businessDate?: string,
  ): Promise<WidgetResponse<TransportDashboardDto>> {
    const targetDate = businessDate || getKolkataDateParts().dateString;
    const filterKey = targetDate;
    const cached = this.cache.get<WidgetResponse<TransportDashboardDto>>(schoolId, 'transport', filterKey);
    if (cached) return cached;

    const generatedAt = new Date().toISOString();
    try {
      const counts = await this.withTimeout(
        this.transportFacade.getEffectiveCounts(schoolId, targetDate),
      );

      const routes = (counts.transports || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        transportNumber: t.transportNumber,
        vehicleNumber: t.vehicleNumber,
        status: t.status,
        stoppageCount: t.stoppages ? t.stoppages.length : 0,
        effectiveStudents: t.effectiveStudents ?? 0,
        stoppages: (t.stoppages || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          sortOrder: s.sortOrder,
          status: s.status,
          effectiveStudents: s.effectiveStudents ?? 0,
        })),
      }));

      const response: WidgetResponse<TransportDashboardDto> = {
        availability: 'AVAILABLE',
        generatedAt,
        data: {
          totalActiveTransports: counts.totalActiveTransports ?? 0,
          totalActiveStoppages: counts.totalActiveStoppages ?? 0,
          totalEffectiveStudents: counts.totalEffectiveStudents ?? 0,
          businessDate: targetDate,
          transports: routes,
        },
      };

      this.cache.set(schoolId, 'transport', filterKey, response, 30);
      return response;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch transport summary for school ${schoolId}: ${err.message}`);
      return {
        availability: 'UNAVAILABLE',
        generatedAt,
        reason: err.message || 'Transport service error',
      };
    }
  }
}
