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
    if (params.academicSessionId) qs.set('academicSessionId', params.academicSessionId);
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

  // Fee Categories (TASK-012)
  async listCategories(): Promise<any[]> {
    return api<any[]>('/operator/fees/categories');
  },

  async createCategory(input: {
    code: string;
    displayName: string;
    chargeKind?: string;
    description?: string;
  }): Promise<any> {
    return api('/operator/fees/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateCategory(
    id: string,
    input: {
      displayName?: string;
      chargeKind?: string;
      description?: string | null;
      status?: 'ACTIVE' | 'INACTIVE';
      version: number;
    }
  ): Promise<any> {
    return api(`/operator/fees/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  // Fee Rules (TASK-012)
  async listRules(filter?: {
    categoryId?: string;
    classId?: string;
    academicSessionId?: string;
    transportId?: string;
    status?: 'ACTIVE' | 'INACTIVE';
  }): Promise<any[]> {
    const qs = new URLSearchParams();
    if (filter?.categoryId) qs.set('categoryId', filter.categoryId);
    if (filter?.classId) qs.set('classId', filter.classId);
    if (filter?.academicSessionId) qs.set('academicSessionId', filter.academicSessionId);
    if (filter?.transportId) qs.set('transportId', filter.transportId);
    if (filter?.status) qs.set('status', filter.status);
    const query = qs.toString();
    return api<any[]>(`/operator/fees/rules${query ? `?${query}` : ''}`);
  },

  async createRule(input: {
    categoryId: string;
    classId?: string;
    academicSessionId?: string;
    transportId?: string;
    amount: number;
    effectiveFrom: string;
    validUntil?: string;
    recurrencePolicy?: string;
    paymentDueOffset?: number;
  }): Promise<any> {
    return api('/operator/fees/rules', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateRule(
    id: string,
    input: {
      amount?: number;
      effectiveFrom?: string;
      validUntil?: string | null;
      transportId?: string | null;
      recurrencePolicy?: string;
      paymentDueOffset?: number | null;
      status?: 'ACTIVE' | 'INACTIVE';
      version: number;
    }
  ): Promise<any> {
    return api(`/operator/fees/rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async getAcademicSessions(): Promise<any[]> {
    try {
      const res = await api<any>('/operator/academic-sessions?page=1&size=100');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  },

  async getTransports(): Promise<any[]> {
    try {
      const res = await api<any>('/operator/transports');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  },
};
