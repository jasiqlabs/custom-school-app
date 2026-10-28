export type ExamContextStatus = 'DRAFT' | 'READY' | 'CLOSED';
export type AdmitCardStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ExamCardContextDto {
  id: string;
  schoolId: string;
  academicSessionId: string;
  academicSessionLabel?: string;
  classId: string;
  className?: string;
  title: string;
  examCode?: string | null;
  examStart: string;
  examEnd: string;
  venue?: string | null;
  instructions?: string | null;
  status: ExamContextStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
  issuedCount?: number;
}

export interface CreateExamContextInput {
  academicSessionId: string;
  classId: string;
  title: string;
  examCode?: string | null;
  examStart: string;
  examEnd: string;
  venue?: string | null;
  instructions?: string | null;
}

export interface UpdateExamContextInput {
  version: number;
  title?: string;
  examCode?: string | null;
  examStart?: string;
  examEnd?: string;
  venue?: string | null;
  instructions?: string | null;
  status?: ExamContextStatus;
}

export interface ExamStudentClearanceDto {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  sectionName: string;
  rollNumber?: string | null;
  isFeeCleared: boolean;
  outstandingBalance: number;
  blockedReason?: string | null;
  unpaidItems?: Array<{
    categoryName: string;
    feeMonth?: string;
    balance: number;
  }>;
  issueStatus?: AdmitCardStatus | null;
  issueId?: string | null;
  cardUuid?: string | null;
  issuedAt?: string | null;
  fileAvailable?: boolean;
}

export interface IssueAdmitCardsInput {
  examContextId: string;
  studentIds: string[];
  requestKey?: string;
  templateVersion?: string;
}

export interface IssueAdmitCardResultItem {
  studentId: string;
  studentCode: string;
  studentName: string;
  success: boolean;
  issueId?: string;
  cardUuid?: string;
  status?: AdmitCardStatus;
  error?: string;
}

export interface BulkIssueAdmitCardsResponse {
  examContextId: string;
  totalRequested: number;
  issuedCount: number;
  blockedCount: number;
  results: IssueAdmitCardResultItem[];
}

export interface AdmitCardIssueDto {
  id: string;
  cardUuid: string;
  schoolId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  sectionName: string;
  examContextId: string;
  examTitle: string;
  status: AdmitCardStatus;
  templateVersion: string;
  fileAvailable: boolean;
  jobId: string;
  issuedAt: string;
  completedAt?: string | null;
}

export interface AdmitCardPreviewDto {
  templateVersion: string;
  school: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    udiseNumber?: string | null;
    affiliationNumber?: string | null;
    schoolCode?: string | null;
    hasLogo: boolean;
    principalName?: string | null;
    hasSignature: boolean;
  };
  exam: {
    id: string;
    title: string;
    examCode?: string | null;
    academicSessionLabel: string;
    className: string;
    examStart: string;
    examEnd: string;
    venue?: string | null;
    instructions?: string | null;
  };
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    fatherName?: string | null;
    motherName?: string | null;
    dob?: string | null;
    className: string;
    sectionName: string;
    address?: string | null;
  };
  clearance: {
    isFeeCleared: boolean;
    outstandingBalance: number;
    blockedReason?: string | null;
  };
}

