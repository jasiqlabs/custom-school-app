import type { CollectionBucket } from '../fees/fee.types';

export interface WidgetResponse<T = any> {
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  generatedAt: string;
  data?: T;
  reason?: string;
}

export interface StudentDashboardSummaryDto {
  total: number;
  active: number;
  inactive: number;
  activeBoys: number;
  activeGirls: number;
}

export interface StudentCountsDto {
  total: number;
  active: number;
  inactive: number;
}

export interface GenderCountsDto {
  activeBoys: number;
  activeGirls: number;
}

export interface FeeCollectionDto {
  totalCollected: number;
  currency: string;
  fromDate?: string;
  toDate?: string;
}

export interface FeeDuesDto {
  totalOutstanding: number;
  currency: string;
  feeMonth: string;
}

export interface FeeChartDto {
  period: 'day' | 'week' | 'month';
  currency: string;
  buckets: CollectionBucket[];
}

export interface DashboardStoppageDto {
  id: string;
  name: string;
  sortOrder: number;
  status: string;
  effectiveStudents: number;
}

export interface DashboardTransportRouteDto {
  id: string;
  name: string;
  transportNumber: string;
  vehicleNumber?: string | null;
  status: string;
  stoppageCount: number;
  effectiveStudents: number;
  stoppages: DashboardStoppageDto[];
}

export interface TransportDashboardDto {
  totalActiveTransports: number;
  totalActiveStoppages: number;
  totalEffectiveStudents: number;
  businessDate: string;
  transports: DashboardTransportRouteDto[];
}
