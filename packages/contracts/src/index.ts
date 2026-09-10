export type SchoolStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type SessionUserType = 'PLATFORM_ADMIN' | 'OPERATOR';
export type TcStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SessionActor {
  userType: SessionUserType;
  userId: string;
  schoolId: string | null;
  sessionId: string;
  requestId: string;
}

export interface SchoolSummary {
  id: string;
  name: string;
  status: SchoolStatus;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoFileId?: string | null;
  version: number;
}

export interface PrincipalDto {
  id: string;
  schoolId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  signatureFileId?: string | null;
}

export interface ClassDto {
  id: string;
  schoolId: string;
  name: string;
  sortOrder: number;
  status: EntityStatus;
}

export interface SectionDto {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  sortOrder: number;
  status: EntityStatus;
}

export interface OperatorDto {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  status: AccountStatus;
  createdAt: string;
}

export interface TcStudentSearchResult {
  id: string;
  studentCode: string;
  name: string;
  className: string;
  sectionName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface TcStudentSnapshot extends TcStudentSearchResult {
  fatherName?: string | null;
  motherName?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  admissionDate?: string | null;
  approvedTemplateFields?: Record<string, string | number | boolean | null>;
}

export interface StudentsPublicFacade {
  searchForPlatformTc(input: { schoolId: string; query: string; limit: number }): Promise<TcStudentSearchResult[]>;
  getTcSnapshot(input: { schoolId: string; studentId: string }): Promise<TcStudentSnapshot | null>;
  countActiveEnrollment(input: { schoolId: string; classId?: string; sectionId?: string }): Promise<number>;
  getSchoolPopulationSummary(input: { schoolId: string }): Promise<{ availability: 'AVAILABLE' | 'UNAVAILABLE'; activeStudents?: number }>;
}
