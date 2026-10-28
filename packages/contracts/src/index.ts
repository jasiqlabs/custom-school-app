export type SchoolStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type OperatorRole = 'MANAGER' | 'REPORT_VIEWER';
export type SessionUserType = 'PLATFORM_ADMIN' | 'OPERATOR';
export type TcStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SessionActor {
  userType: SessionUserType;
  userId: string;
  schoolId: string | null;
  sessionId: string;
  requestId: string;
  role?: OperatorRole;
}

export interface SchoolSummary {
  id: string;
  name: string;
  status: SchoolStatus;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  udiseNumber?: string | null;
  schoolCode?: string | null;
  affiliationNumber?: string | null;
  logoFileId?: string | null;
  version: number;
}

export type ReadinessSeverity = 'BLOCKER' | 'WARNING';

export interface ReadinessCheckItem {
  code: string;
  label: string;
  severity: ReadinessSeverity;
  satisfied: boolean;
  details?: string;
  actionUrl?: string;
}

export interface SchoolReadinessDto {
  schoolId: string;
  status: SchoolStatus;
  ready: boolean;
  hasBlockers: boolean;
  hasWarnings: boolean;
  version: number;
  checks: ReadinessCheckItem[];
}

export interface SchoolActivateInput {
  expectedVersion: number;
  confirmWarnings?: boolean;
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
  role: OperatorRole;
  createdAt: string;
}

export type OperatorCapability =
  | 'students.read'
  | 'students.write'
  | 'fees.read'
  | 'fees.write'
  | 'fees.export'
  | 'transports.read'
  | 'transports.write'
  | 'academics.read'
  | 'academics.write'
  | 'reports.read'
  | 'reports.download'
  | 'tc.read'
  | 'tc.write'
  | 'exams.read'
  | 'exams.write'
  | 'dashboard.read';

export interface OperatorCapabilitiesDto {
  role: OperatorRole;
  schoolId: string;
  capabilities: OperatorCapability[];
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
  getStudentDashboardSummary(input: { schoolId: string }): Promise<{
    availability: 'AVAILABLE' | 'UNAVAILABLE';
    total?: number;
    active?: number;
    inactive?: number;
    activeBoys?: number;
    activeGirls?: number;
    reason?: string;
  }>;
  getEnrollmentAtDate?(input: { schoolId: string; studentId: string; date: string | Date }): Promise<{
    id: string;
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    academicSessionId?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
  } | null>;
}

export * from './students/student.types';
export * from './fees/fee.types';
export * from './transports/transport.types';
export * from './dashboard/dashboard.types';
export * from './academics/academic-session.types';
export * from './examination/examination.types';
