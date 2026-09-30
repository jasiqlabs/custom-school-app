import { api } from '@/lib/api';
import type {
  WidgetResponse,
  StudentCountsDto,
  GenderCountsDto,
  FeeCollectionDto,
  FeeDuesDto,
  FeeChartDto,
  TransportDashboardDto,
} from '@custom-school/contracts';

export const dashboardApi = {
  async getStudents(): Promise<WidgetResponse<StudentCountsDto>> {
    return api('/operator/dashboard/students');
  },

  async getGender(): Promise<WidgetResponse<GenderCountsDto>> {
    return api('/operator/dashboard/gender');
  },

  async getFeeCollection(params: { from?: string; to?: string } = {}): Promise<WidgetResponse<FeeCollectionDto>> {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api(`/operator/dashboard/fees/collection${query}`);
  },

  async getFeeDues(params: { feeMonth?: string } = {}): Promise<WidgetResponse<FeeDuesDto>> {
    const qs = new URLSearchParams();
    if (params.feeMonth) qs.set('feeMonth', params.feeMonth);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api(`/operator/dashboard/fees/dues${query}`);
  },

  async getFeeChart(period: 'day' | 'week' | 'month', params: { from?: string; to?: string } = {}): Promise<WidgetResponse<FeeChartDto>> {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api(`/operator/dashboard/fees/${period}${query}`);
  },

  async getTransport(params: { businessDate?: string } = {}): Promise<WidgetResponse<TransportDashboardDto>> {
    const qs = new URLSearchParams();
    if (params.businessDate) qs.set('businessDate', params.businessDate);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return api(`/operator/dashboard/transport${query}`);
  },
};
