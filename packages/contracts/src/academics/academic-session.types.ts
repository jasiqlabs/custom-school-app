export type AcademicSessionStatus = 'DRAFT' | 'ACTIVE' | 'CLOSING' | 'CLOSED';

export interface AcademicSessionDto {
  id: string;
  schoolId: string;
  code: string;
  label: string;
  startDate: string;
  endDate: string;
  status: AcademicSessionStatus;
  version: number;
  activatedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicSessionInput {
  code: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface UpdateAcademicSessionInput {
  version: number;
  label?: string;
  startDate?: string;
  endDate?: string;
}

export interface ActivateAcademicSessionInput {
  version: number;
}
