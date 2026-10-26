import { api } from '@/lib/api';
import type { AcademicSessionDto } from '@custom-school/contracts';

export const academicSessionsApi = {
  async list(baseApiUrl: string = '/operator/academic-sessions'): Promise<AcademicSessionDto[]> {
    try {
      const res = await api<{ items: AcademicSessionDto[]; total: number }>(`${baseApiUrl}?page=1&size=50`);
      return res.items || [];
    } catch {
      return [];
    }
  },

  async getCurrent(): Promise<AcademicSessionDto | null> {
    try {
      return await api<AcademicSessionDto>('/operator/academic-sessions/current');
    } catch {
      return null;
    }
  }
};
