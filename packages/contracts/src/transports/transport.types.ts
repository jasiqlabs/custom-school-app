export type TransportStatus = 'ACTIVE' | 'INACTIVE';
export type AssignmentStatus = 'ACTIVE' | 'ENDED';

export interface TransportDto {
  id: string;
  schoolId: string;
  name: string;
  transportNumber: string;
  vehicleNumber?: string | null;
  pickupTime?: string | null;
  dropTime?: string | null;
  status: TransportStatus;
  version: number;
  activeAssignmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransportStoppageDto {
  id: string;
  schoolId: string;
  transportId: string;
  name: string;
  sortOrder: number;
  status: TransportStatus;
  version: number;
  activeAssignmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransportWithStoppagesDto extends TransportDto {
  stoppages: TransportStoppageDto[];
}

export interface CreateTransportInput {
  name: string;
  transportNumber: string;
  vehicleNumber?: string | null;
  pickupTime?: string | null;
  dropTime?: string | null;
}

export interface UpdateTransportInput {
  name?: string;
  transportNumber?: string;
  vehicleNumber?: string | null;
  pickupTime?: string | null;
  dropTime?: string | null;
  version?: number;
}

export interface UpdateTransportStatusInput {
  status: TransportStatus;
}

export interface CreateTransportStoppageInput {
  name: string;
  sortOrder?: number;
}

export interface UpdateTransportStoppageInput {
  name?: string;
  sortOrder?: number;
  version?: number;
}

export interface UpdateStoppageStatusInput {
  status: TransportStatus;
}

export interface ReorderStoppagesInput {
  stoppageIds: string[];
}

export interface AssignStudentTransportInput {
  studentId: string;
  stoppageId: string;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
}

export interface ReassignStudentTransportInput {
  newStoppageId: string;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  reason?: string | null;
}

export interface EndStudentTransportInput {
  reason?: string | null;
  setStudentPreferenceNo?: boolean;
}

export interface TransportAssignmentDto {
  id: string;
  schoolId: string;
  studentId: string;
  studentCode?: string;
  studentName?: string;
  className?: string;
  sectionName?: string;
  transportId: string;
  transportName: string;
  transportNumber: string;
  stoppageId: string;
  stoppageName: string;
  status: AssignmentStatus;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  startedAt: string;
  endedAt?: string | null;
  endedReason?: string | null;
  effectiveNow: boolean;
  createdBy?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TransportAssignmentDirectoryQueryDto {
  query?: string;
  transportId?: string;
  stoppageId?: string;
  status?: 'ALL' | 'ACTIVE' | 'ENDED';
  effectiveNow?: boolean;
  date?: string | null;
  page?: number;
  limit?: number;
}

export interface ActiveTransportChoiceItem {
  id: string;
  name: string;
  transportNumber: string;
  stoppages: Array<{
    id: string;
    name: string;
    sortOrder: number;
  }>;
}

export interface ActiveTransportChoicesDto {
  transports: ActiveTransportChoiceItem[];
}

export interface StoppageUtilizationCountItem {
  id: string;
  name: string;
  sortOrder: number;
  status: TransportStatus;
  effectiveStudents: number;
}

export interface TransportUtilizationCountItem {
  id: string;
  name: string;
  transportNumber: string;
  vehicleNumber?: string | null;
  status: TransportStatus;
  effectiveStudents: number;
  stoppages: StoppageUtilizationCountItem[];
}

export interface TransportEffectiveCountsDto {
  totalActiveTransports: number;
  totalActiveStoppages: number;
  totalEffectiveStudents: number;
  businessDate: string;
  transports: TransportUtilizationCountItem[];
}

export interface TransportEffectiveSummaryDto {
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  activeTransports: number;
  activeStoppages: number;
  effectiveStudents: number;
}

export interface DeactivationBlockedErrorDto {
  message: string;
  activeAssignmentCount: number;
  transportId?: string;
  stoppageId?: string;
}

export interface TransportPublicFacade {
  getStudentTransportSummary(input: { schoolId: string; studentId: string }): Promise<import('../students/student.types').TransportSummaryDto>;
  getActiveChoices(schoolId: string): Promise<ActiveTransportChoicesDto>;
  getEffectiveSummary(schoolId: string): Promise<TransportEffectiveSummaryDto>;
  getEffectiveCounts(schoolId: string): Promise<TransportEffectiveCountsDto>;
}
