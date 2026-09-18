import { api } from '@/lib/api';
import type {
  StudentAdmissionInput,
  StudentAdmissionResult,
  StudentDirectoryQuery,
  StudentDirectoryResponse,
  StudentProfileDto,
  UpdateStudentProfileInput,
  ChangeStudentIdentifierInput,
  ChangeStudentStatusInput,
  StudentIdentifierHistoryItem,
  AdmissionFormPrintDto,
  BulkImportJobDto,
  BulkImportRowPreviewDto
} from '@custom-school/contracts';

export interface SchoolClassWithSections {
  id: string;
  name: string;
  normalizedName: string;
  sortOrder: number;
  sections: Array<{
    id: string;
    classId: string;
    name: string;
    normalizedName: string;
    sortOrder: number;
  }>;
}

export const studentsApi = {
  async getDirectory(params: StudentDirectoryQuery = {}): Promise<StudentDirectoryResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.classId) qs.set('classId', params.classId);
    if (params.sectionId) qs.set('sectionId', params.sectionId);
    if (params.gender) qs.set('gender', params.gender);
    if (params.status) qs.set('status', params.status);
    if (params.transportRequired !== undefined) qs.set('transportRequired', String(params.transportRequired));
    if (params.search) qs.set('search', params.search);
    const queryStr = qs.toString();
    return api<StudentDirectoryResponse>(`/operator/students${queryStr ? `?${queryStr}` : ''}`);
  },

  async getIdSuggestion(): Promise<{ suggestedCode: string; mode: string }> {
    return api<{ suggestedCode: string; mode: string }>('/operator/students/id-suggestion');
  },

  async getClasses(): Promise<SchoolClassWithSections[]> {
    return api<SchoolClassWithSections[]>('/operator/students/classes');
  },

  async admitStudent(input: StudentAdmissionInput): Promise<StudentAdmissionResult> {
    return api<StudentAdmissionResult>('/operator/students', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async getProfile(studentId: string): Promise<StudentProfileDto> {
    return api<StudentProfileDto>(`/operator/students/${studentId}`);
  },

  async updateProfile(studentId: string, input: UpdateStudentProfileInput): Promise<StudentProfileDto> {
    return api<StudentProfileDto>(`/operator/students/${studentId}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async changeIdentifier(studentId: string, input: ChangeStudentIdentifierInput): Promise<{ studentCode: string }> {
    return api<{ studentCode: string }>(`/operator/students/${studentId}/identifier`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async changeStatus(studentId: string, input: ChangeStudentStatusInput): Promise<{ status: string }> {
    return api<{ status: string }>(`/operator/students/${studentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async getIdentifierHistory(studentId: string): Promise<StudentIdentifierHistoryItem[]> {
    return api<StudentIdentifierHistoryItem[]>(`/operator/students/${studentId}/identifier-history`);
  },

  async getAdmissionFormPrint(studentId: string): Promise<AdmissionFormPrintDto> {
    return api<AdmissionFormPrintDto>(`/operator/students/${studentId}/admission-form`);
  },

  async getFeeSummary(studentId: string, month?: string): Promise<any> {
    const q = month ? `?month=${month}` : '';
    return api(`/operator/students/${studentId}/fees${q}`);
  },

  async getTransportSummary(studentId: string): Promise<any> {
    return api(`/operator/students/${studentId}/transport`);
  },

  async uploadImportFile(file: File): Promise<BulkImportJobDto> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || result;
          const job = await api<BulkImportJobDto>('/operator/students-import/upload', {
            method: 'POST',
            body: JSON.stringify({
              fileBase64: base64,
              fileName: file.name
            })
          });
          resolve(job);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async getImportJob(jobId: string): Promise<BulkImportJobDto> {
    return api<BulkImportJobDto>(`/operator/students-import/jobs/${jobId}`);
  },

  async getImportJobRows(jobId: string, limit: number = 50): Promise<BulkImportRowPreviewDto[]> {
    return api<BulkImportRowPreviewDto[]>(`/operator/students-import/jobs/${jobId}/rows?limit=${limit}`);
  },

  async confirmImport(jobId: string): Promise<BulkImportJobDto> {
    return api<BulkImportJobDto>(`/operator/students-import/jobs/${jobId}/confirm`, {
      method: 'POST'
    });
  }
};
