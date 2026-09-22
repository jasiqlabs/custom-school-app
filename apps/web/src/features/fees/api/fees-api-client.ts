import { api, API_BASE, getCsrf } from '@/lib/api';
import type {
  ClassFeeConfigDto,
  UpsertClassFeeConfigInput,
  GenerateDuesInput,
  GenerateDuesResultDto,
  FeeDueDto,
  CollectPaymentInput,
  PaymentReceiptDto,
  FeePaymentDto,
  FeePaymentFilterDto,
  VoidPaymentInput,
  PendingFeeFilterDto,
  PendingFeeReportDto,
  CreatePendingFeeExportInput,
} from '@custom-school/contracts';

export interface FeeClassSummary {
  id: string;
  name: string;
}

export const feesApi = {
  async getClasses(): Promise<FeeClassSummary[]> {
    return api<FeeClassSummary[]>('/operator/students/classes');
  },

  async listConfigs(classId?: string): Promise<ClassFeeConfigDto[]> {
    const qs = classId ? `?classId=${encodeURIComponent(classId)}` : '';
    return api<ClassFeeConfigDto[]>(`/operator/fees/configs${qs}`);
  },

  async upsertConfig(input: UpsertClassFeeConfigInput): Promise<ClassFeeConfigDto> {
    return api<ClassFeeConfigDto>('/operator/fees/configs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async generateDues(input: GenerateDuesInput): Promise<GenerateDuesResultDto> {
    return api<GenerateDuesResultDto>('/operator/fees/dues/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getStudentDues(studentId: string): Promise<{
    student: {
      id: string;
      studentCode: string;
      fullName: string;
      status: string;
      className: string;
    };
    dues: FeeDueDto[];
  }> {
    return api(`/operator/fees/dues/student/${encodeURIComponent(studentId)}`);
  },

  async collectPayment(input: CollectPaymentInput): Promise<PaymentReceiptDto> {
    return api<PaymentReceiptDto>('/operator/fees/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async listPayments(params: FeePaymentFilterDto = {}): Promise<{
    total: number;
    page: number;
    limit: number;
    items: FeePaymentDto[];
  }> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.studentId) qs.set('studentId', params.studentId);
    if (params.search) qs.set('search', params.search);
    if (params.feeMonth) qs.set('feeMonth', params.feeMonth);
    if (params.fromDate) qs.set('fromDate', params.fromDate);
    if (params.toDate) qs.set('toDate', params.toDate);
    if (params.mode) qs.set('mode', params.mode);
    if (params.status) qs.set('status', params.status);
    const queryStr = qs.toString();
    return api(`/operator/fees/payments${queryStr ? `?${queryStr}` : ''}`);
  },

  async getReceipt(paymentId: string): Promise<PaymentReceiptDto> {
    return api<PaymentReceiptDto>(`/operator/fees/payments/${encodeURIComponent(paymentId)}/receipt`);
  },

  async voidPayment(paymentId: string, input: VoidPaymentInput): Promise<{ success: boolean; paymentId: string }> {
    return api(`/operator/fees/payments/${encodeURIComponent(paymentId)}/void`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getPendingReport(params: PendingFeeFilterDto): Promise<PendingFeeReportDto> {
    const qs = new URLSearchParams();
    qs.set('feeMonth', params.feeMonth);
    if (params.classId) qs.set('classId', params.classId);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return api<PendingFeeReportDto>(`/operator/fees/pending?${qs.toString()}`);
  },

  async downloadPendingExport(input: CreatePendingFeeExportInput): Promise<Blob> {
    const csrf = await getCsrf();
    const res = await fetch(`${API_BASE}/operator/fees/exports/pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      let msg = 'Failed to generate export';
      try {
        const err = await res.json();
        msg = err.message || msg;
      } catch {}
      throw new Error(msg);
    }

    return res.blob();
  },
};
