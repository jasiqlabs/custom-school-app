import { api } from '@/lib/api';
import type {
  ExamCardContextDto,
  CreateExamContextInput,
  UpdateExamContextInput,
  ExamStudentClearanceDto,
  IssueAdmitCardsInput,
  BulkIssueAdmitCardsResponse,
  AdmitCardPreviewDto,
  AdmitCardIssueDto,
} from '@custom-school/contracts';

export const examinationApi = {
  async listContexts(filters: {
    academicSessionId?: string;
    classId?: string;
    status?: string;
  } = {}): Promise<{ items: ExamCardContextDto[]; total: number }> {
    const qs = new URLSearchParams();
    if (filters.academicSessionId) qs.set('academicSessionId', filters.academicSessionId);
    if (filters.classId) qs.set('classId', filters.classId);
    if (filters.status) qs.set('status', filters.status);
    const query = qs.toString();
    const res = await api<any>(
      `/operator/admit-card-contexts${query ? `?${query}` : ''}`,
    );
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: res.items || [], total: res.total ?? (res.items?.length || 0) };
  },

  async getContext(id: string): Promise<ExamCardContextDto> {
    return api<ExamCardContextDto>(`/operator/admit-card-contexts/${id}`);
  },

  async createContext(input: CreateExamContextInput): Promise<ExamCardContextDto> {
    return api<ExamCardContextDto>('/operator/admit-card-contexts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateContext(id: string, input: UpdateExamContextInput): Promise<ExamCardContextDto> {
    return api<ExamCardContextDto>(`/operator/admit-card-contexts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async getExamStudents(id: string): Promise<ExamStudentClearanceDto[]> {
    return api<ExamStudentClearanceDto[]>(`/operator/admit-card-contexts/${id}/students`);
  },

  async previewAdmitCard(examContextId: string, studentId: string): Promise<AdmitCardPreviewDto> {
    const qs = new URLSearchParams({ examContextId, studentId });
    return api<AdmitCardPreviewDto>(`/operator/admit-cards/preview?${qs.toString()}`);
  },

  async issueAdmitCards(input: IssueAdmitCardsInput): Promise<BulkIssueAdmitCardsResponse> {
    return api<BulkIssueAdmitCardsResponse>('/operator/admit-cards/issue', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getDownloadUrl(issueId: string): Promise<{ downloadUrl: string; expiresAt: string }> {
    const res = await api<{ downloadUrl?: string; url?: string; directUrl?: string; expiresAt?: string }>(
      `/operator/admit-cards/issues/${issueId}/download`
    );
    let targetUrl = res.downloadUrl || res.url;
    if (typeof window !== 'undefined' && targetUrl) {
      try {
        const parsed = new URL(targetUrl);
        if (
          (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === 'minio') &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          targetUrl = `/api/v1/operator/admit-cards/issues/${issueId}/file`;
        }
      } catch {
        targetUrl = `/api/v1/operator/admit-cards/issues/${issueId}/file`;
      }
    }
    return {
      downloadUrl: targetUrl || `/api/v1/operator/admit-cards/issues/${issueId}/file`,
      expiresAt: res.expiresAt || '',
    };
  },

  async retryIssue(issueId: string): Promise<AdmitCardIssueDto> {
    return api<AdmitCardIssueDto>(`/operator/admit-cards/issues/${issueId}/retry-render`, {
      method: 'POST',
    });
  },
};

