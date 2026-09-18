export type StudentGender = 'BOY' | 'GIRL';
export type ConcessionType = 'NONE' | 'FIXED_AMOUNT' | 'PERCENTAGE';
export type TransportSetupState = 'NOT_REQUIRED' | 'SETUP_PENDING' | 'ACTIVE';
export type EnrollmentStatus = 'ACTIVE' | 'ENDED';
export type ImportJobStatus = 'QUEUED' | 'VALIDATING' | 'READY' | 'IMPORTING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
export type ImportRowStatus = 'PENDING' | 'VALID' | 'IMPORTED' | 'ERROR';

export interface BankDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
}

export interface DisabilityDetails {
  hasDisability: boolean;
  details?: string;
}

export interface ConcessionInput {
  type: ConcessionType;
  value: number;
}

export interface StudentAdmissionInput {
  studentCodeMode: 'AUTO' | 'MANUAL';
  studentCode?: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  familyCode?: string;
  tallyLedgerName?: string;
  dateOfBirth: string;
  classId: string;
  sectionId: string;
  gender: StudentGender;
  admissionDate?: string;
  transportRequired: boolean;
  stoppageId?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  address: string;
  phone: string;
  email?: string;
  emergencyContact: string;
  emergencyContactRelation: string;
  aadhaarNumber: string;
  panNumber?: string;
  penNumber?: string;
  udiseCode?: string;
  previousSchool?: string;
  previousTcNumber?: string;
  bank?: BankDetails;
  bloodGroup?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  disability?: DisabilityDetails;
  medicalConditions?: string;
  allergies?: string;
  hobbiesInterests?: string;
  previousAchievements?: string;
  concession: ConcessionInput;
  photoFileId?: string;
}

export interface StudentAdmissionResult {
  id: string;
  studentCode: string;
  fullName: string;
  transportSetupState: TransportSetupState;
  transportError?: string;
}

export interface StudentDirectoryItem {
  id: string;
  studentCode: string;
  fullName: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  gender: StudentGender;
  status: 'ACTIVE' | 'INACTIVE';
  admissionDate: string;
  transportRequired: boolean;
  photoFileId?: string | null;
}

export interface StudentDirectoryQuery {
  page?: number;
  limit?: number;
  classId?: string;
  sectionId?: string;
  gender?: StudentGender;
  status?: 'ACTIVE' | 'INACTIVE';
  transportRequired?: boolean;
  search?: string;
}

export interface StudentDirectoryResponse {
  items: StudentDirectoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentProfileDto {
  id: string;
  schoolId: string;
  studentCode: string;
  fullName: string;
  fatherName: string;
  motherName: string;
  familyCode?: string | null;
  tallyLedgerName?: string | null;
  dob: string;
  gender: StudentGender;
  admissionDate: string;
  address: string;
  phone: string;
  email?: string | null;
  emergencyContact: string;
  emergencyRelation: string;
  penNumber?: string | null;
  udiseCode?: string | null;
  previousSchool?: string | null;
  previousTcNumber?: string | null;
  bloodGroup?: string | null;
  nationality: string;
  hobbies?: string | null;
  achievements?: string | null;
  concessionType: ConcessionType;
  concessionValue: number;
  transportRequired: boolean;
  transportSetupState: TransportSetupState;
  photoFileId?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  deactivationReason?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  enrollment?: {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
  } | null;
  privateProfile?: {
    aadhaarMasked: string;
    panMasked?: string | null;
    bankMasked?: {
      bankName?: string;
      accountHolderName?: string;
      accountNumberMasked?: string;
      ifsc?: string;
      branch?: string;
    } | null;
    religion?: string | null;
    caste?: string | null;
    disability?: DisabilityDetails | null;
    medicalConditions?: string | null;
    allergies?: string | null;
  } | null;
}

export interface UpdateStudentProfileInput {
  fullName?: string;
  fatherName?: string;
  motherName?: string;
  familyCode?: string;
  tallyLedgerName?: string;
  dob?: string;
  gender?: StudentGender;
  classId?: string;
  sectionId?: string;
  address?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  emergencyRelation?: string;
  penNumber?: string;
  udiseCode?: string;
  previousSchool?: string;
  previousTcNumber?: string;
  bloodGroup?: string;
  nationality?: string;
  hobbies?: string;
  achievements?: string;
  concession?: ConcessionInput;
  transportRequired?: boolean;
  photoFileId?: string;
  version: number;
}

export interface ChangeStudentIdentifierInput {
  newStudentCode: string;
  reason: string;
  version: number;
}

export interface ChangeStudentStatusInput {
  status: 'ACTIVE' | 'INACTIVE';
  reason?: string;
}

export interface StudentIdSuggestionDto {
  suggestedCode: string;
  mode: 'AUTO';
}

export interface StudentIdentifierHistoryItem {
  id: string;
  oldCode: string;
  newCode: string;
  changedBy: string;
  reason: string;
  changedAt: string;
}

export interface AdmissionFormPrintDto {
  school: {
    id: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoFileId?: string | null;
  };
  student: StudentProfileDto;
  printedAt: string;
}

export interface FeeSummaryDto {
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  reason?: string;
  currency?: string;
  baseFee?: number;
  concessionType?: ConcessionType;
  concessionValue?: number;
  netDue?: number;
  totalPaid?: number;
  outstandingBalance?: number;
  monthWiseSummary?: Array<{
    month: string;
    dueAmount: number;
    paidAmount: number;
    balance: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID';
  }>;
}

export interface TransportSummaryDto {
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  reason?: string;
  assignment?: {
    id: string;
    routeId: string;
    routeName: string;
    stoppageId: string;
    stoppageName: string;
    monthlyCharge: number;
    serviceStartDate: string;
    serviceEndDate?: string | null;
    status: 'ACTIVE' | 'ENDED';
  } | null;
  history?: Array<{
    id: string;
    routeName: string;
    stoppageName: string;
    serviceStartDate: string;
    serviceEndDate?: string | null;
    status: 'ACTIVE' | 'ENDED';
  }>;
}

export interface BulkImportJobDto {
  id: string;
  schoolId: string;
  fileId: string;
  errorFileId?: string | null;
  status: ImportJobStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedRows: number;
  createdAt: string;
  updatedAt: string;
}

export interface BulkImportRowPreviewDto {
  rowNumber: number;
  status: ImportRowStatus;
  previewData: {
    studentCode?: string;
    fullName: string;
    className: string;
    sectionName: string;
    gender: string;
    phone: string;
  };
  errorMessages?: string[];
}
