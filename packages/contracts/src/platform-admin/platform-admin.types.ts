export interface PlatformAdminPublicFacade {
  getSchoolIdentity(schoolId: string): Promise<{
    id: string;
    schoolUuid: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  }>;
  getActiveAcademicStructure(schoolId: string): Promise<
    Array<{
      classId: string;
      className: string;
      sections: Array<{ sectionId: string; name: string }>;
    }>
  >;
  getOperatorAccount(operatorId: string): Promise<{
    operatorId: string;
    schoolId: string;
    status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  } | null>;
  assertSchoolActive(schoolId: string): Promise<void>;
}

export interface SchoolSummaryItem {
  id: string;
  schoolUuid: string;
  name: string;
  code: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  principalName?: string | null;
  studentCount?: number | null;
  studentCountState?: 'AVAILABLE' | 'UNAVAILABLE';
  operatorCount?: number;
  createdAt: string;
}

export interface SchoolDetail extends SchoolSummaryItem {
  logoFileId?: string | null;
  logoPresignedUrl?: string | null;
  principal?: {
    principalName?: string | null;
    contactNumber?: string | null;
    signatureFileId?: string | null;
    signaturePresignedUrl?: string | null;
  } | null;
}

export interface CreateSchoolRequest {
  name: string;
  code?: string;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  confirmDuplicateName?: boolean;
}

export interface UpdateSchoolProfileRequest {
  name?: string;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  logoFileId?: string | null;
}

export interface UpdatePrincipalRequest {
  principalName?: string | null;
  contactNumber?: string | null;
  signatureFileId?: string | null;
}

export interface ChangeSchoolStatusRequest {
  status: 'ACTIVE' | 'INACTIVE';
  reason?: string;
}

export interface ClassItem {
  id: string;
  schoolId: string;
  name: string;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  sections?: SectionItem[];
}

export interface SectionItem {
  id: string;
  schoolId: string;
  classId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface CreateClassRequest {
  name: string;
  displayOrder?: number;
}

export interface UpdateClassRequest {
  name?: string;
  displayOrder?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateSectionRequest {
  name: string;
}

export interface UpdateSectionRequest {
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface SchoolOperatorItem {
  id: string;
  schoolId: string;
  userId: string;
  fullName: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  createdAt: string;
}

export interface ProvisionOperatorRequest {
  fullName: string;
  email: string;
  temporaryPassword: string;
}

export interface GenerateTcRequest {
  includeLogo?: boolean;
  includeSignature?: boolean;
  idempotencyKey?: string;
}

export interface GenerateTcResponse {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileId?: string;
  downloadUrl?: string;
}

export interface PlatformMetricsResponse {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  draftSchools: number;
  generatedAt: string;
}

export type PlatformDashboardMetricsResponse = PlatformMetricsResponse;

export interface PlatformSchoolSummaryResponse {
  items: Array<{
    schoolId: string;
    schoolUuid: string;
    name: string;
    status: string;
    operatorCount: number;
    studentCount: number | null;
    studentCountState: 'AVAILABLE' | 'UNAVAILABLE';
    lastActivityAt: string | null;
  }>;
  page: number;
  limit: number;
  total: number;
}

export const MOD_001_ERRORS = {
  ERR_AUTH_INVALID_CREDENTIALS: 'ERR_AUTH_INVALID_CREDENTIALS',
  ERR_ACCOUNT_DEACTIVATED: 'ERR_ACCOUNT_DEACTIVATED',
  ERR_ACCOUNT_TEMP_LOCKED: 'ERR_ACCOUNT_TEMP_LOCKED',
  ERR_FORBIDDEN_ROLE: 'ERR_FORBIDDEN_ROLE',
  ERR_DUPLICATE_SCHOOL_CONFIRMATION_REQUIRED: 'ERR_DUPLICATE_SCHOOL_CONFIRMATION_REQUIRED',
  ERR_SCHOOL_NAME_REQUIRED: 'ERR_SCHOOL_NAME_REQUIRED',
  ERR_SCHOOL_NOT_ACTIVE: 'ERR_SCHOOL_NOT_ACTIVE',
  ERR_DUPLICATE_OPERATOR_EMAIL: 'ERR_DUPLICATE_OPERATOR_EMAIL',
  ERR_ACADEMIC_DUPLICATE: 'ERR_ACADEMIC_DUPLICATE',
  ERR_ACADEMIC_IN_USE: 'ERR_ACADEMIC_IN_USE',
  ERR_INVALID_STATE_TRANSITION: 'ERR_INVALID_STATE_TRANSITION',
  ERR_TC_PREREQUISITE_MISSING: 'ERR_TC_PREREQUISITE_MISSING',
  ERR_JOB_FAILED: 'ERR_JOB_FAILED',
  ERR_RESOURCE_NOT_FOUND: 'ERR_RESOURCE_NOT_FOUND',
} as const;
