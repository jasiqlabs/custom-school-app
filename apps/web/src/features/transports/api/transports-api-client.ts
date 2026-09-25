import { api } from '@/lib/api';
import type {
  TransportDto,
  TransportWithStoppagesDto,
  TransportStoppageDto,
  CreateTransportInput,
  UpdateTransportInput,
  TransportStatus,
  CreateTransportStoppageInput,
  UpdateTransportStoppageInput,
  ReorderStoppagesInput,
  ActiveTransportChoicesDto,
  AssignStudentTransportInput,
  ReassignStudentTransportInput,
  EndStudentTransportInput,
  TransportAssignmentDto,
  TransportAssignmentDirectoryQueryDto,
  TransportEffectiveCountsDto,
} from '@custom-school/contracts';

export interface StudentSearchResult {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  sectionName?: string;
  status: string;
  transportRequired: boolean;
  transportSetupState: string;
}

export const transportsApi = {
  async listTransports(): Promise<TransportDto[]> {
    return api<TransportDto[]>('/operator/transports');
  },

  async getTransport(id: string): Promise<TransportWithStoppagesDto> {
    return api<TransportWithStoppagesDto>(`/operator/transports/${encodeURIComponent(id)}`);
  },

  async createTransport(input: CreateTransportInput): Promise<TransportDto> {
    return api<TransportDto>('/operator/transports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateTransport(id: string, input: UpdateTransportInput): Promise<TransportDto> {
    return api<TransportDto>(`/operator/transports/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async updateTransportStatus(id: string, status: TransportStatus): Promise<TransportDto> {
    return api<TransportDto>(`/operator/transports/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async listStoppages(transportId: string): Promise<TransportStoppageDto[]> {
    return api<TransportStoppageDto[]>(`/operator/transports/${encodeURIComponent(transportId)}/stoppages`);
  },

  async createStoppage(transportId: string, input: CreateTransportStoppageInput): Promise<TransportStoppageDto> {
    return api<TransportStoppageDto>(`/operator/transports/${encodeURIComponent(transportId)}/stoppages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateStoppage(transportId: string, stoppageId: string, input: UpdateTransportStoppageInput): Promise<TransportStoppageDto> {
    return api<TransportStoppageDto>(`/operator/transports/${encodeURIComponent(transportId)}/stoppages/${encodeURIComponent(stoppageId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async updateStoppageStatus(transportId: string, stoppageId: string, status: TransportStatus): Promise<TransportStoppageDto> {
    return api<TransportStoppageDto>(`/operator/transports/${encodeURIComponent(transportId)}/stoppages/${encodeURIComponent(stoppageId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async reorderStoppages(transportId: string, stoppageIds: string[]): Promise<TransportStoppageDto[]> {
    return api<TransportStoppageDto[]>(`/operator/transports/${encodeURIComponent(transportId)}/stoppages/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ stoppageIds }),
    });
  },

  async getActiveChoices(): Promise<ActiveTransportChoicesDto> {
    return api<ActiveTransportChoicesDto>('/operator/transports/active-choices');
  },

  async listAssignments(query: TransportAssignmentDirectoryQueryDto): Promise<{
    items: TransportAssignmentDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (query.query) params.set('query', query.query);
    if (query.transportId) params.set('transportId', query.transportId);
    if (query.stoppageId) params.set('stoppageId', query.stoppageId);
    if (query.status && query.status !== 'ALL') params.set('status', query.status);
    if (query.effectiveNow !== undefined) params.set('effectiveNow', String(query.effectiveNow));
    if (query.date) params.set('date', query.date);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));

    const qs = params.toString();
    return api(`/operator/transports/assignments${qs ? `?${qs}` : ''}`);
  },

  async assignStudent(input: AssignStudentTransportInput): Promise<TransportAssignmentDto> {
    return api<TransportAssignmentDto>('/operator/transports/assignments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async reassignStudent(assignmentId: string, input: ReassignStudentTransportInput): Promise<TransportAssignmentDto> {
    return api<TransportAssignmentDto>(`/operator/transports/assignments/${encodeURIComponent(assignmentId)}/reassign`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async endAssignment(assignmentId: string, input: EndStudentTransportInput): Promise<TransportAssignmentDto> {
    return api<TransportAssignmentDto>(`/operator/transports/assignments/${encodeURIComponent(assignmentId)}/end`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getCounts(date?: string): Promise<TransportEffectiveCountsDto> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return api<TransportEffectiveCountsDto>(`/operator/transports/counts${qs}`);
  },

  async searchStudents(q: string): Promise<StudentSearchResult[]> {
    const trimmed = q ? q.trim() : '';
    if (!trimmed) return [];

    // If query is a UUID (deep-link or direct ID), fetch directly
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      try {
        const direct = await api<any>(`/operator/students/${encodeURIComponent(trimmed)}`);
        if (direct && direct.id) {
          return [{
            id: direct.id,
            studentCode: direct.studentCode || '',
            fullName: direct.fullName || '',
            className: direct.className || direct.enrollments?.[0]?.class?.name || '—',
            sectionName: direct.sectionName || direct.enrollments?.[0]?.section?.name || '',
            status: direct.status || 'ACTIVE',
            transportRequired: Boolean(direct.transportRequired),
            transportSetupState: direct.transportSetupState || 'NOT_REQUIRED',
          }];
        }
      } catch {
        // Fall through to directory search
      }
    }

    try {
      // Backend expects 'search' query parameter on /operator/students
      const res = await api<any>(`/operator/students?search=${encodeURIComponent(trimmed)}&status=ACTIVE&limit=25`);
      const list = Array.isArray(res) ? res : res.items || [];
      const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

      // Filter to ensure all query terms match student name or code
      const matched = list.filter((item: any) => {
        const name = (item.fullName || item.name || '').toLowerCase();
        const code = (item.studentCode || item.code || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        if (id === trimmed.toLowerCase()) return true;
        return terms.every((t) => name.includes(t) || code.includes(t));
      });

      return matched.map((item: any) => ({
        id: item.id,
        studentCode: item.studentCode || item.code || '',
        fullName: item.fullName || item.name || '',
        className: item.className || item.currentEnrollment?.className || '—',
        sectionName: item.sectionName || item.currentEnrollment?.sectionName || '',
        status: item.status || 'ACTIVE',
        transportRequired: Boolean(item.transportRequired),
        transportSetupState: item.transportSetupState || 'NOT_REQUIRED',
      }));
    } catch {
      return [];
    }
  },
};
