import type { ConcessionType } from '../students/student.types';
import type { EntityStatus } from '../index';

export type FeeDueStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMode = 'CASH' | 'CHEQUE' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
export type PaymentStatus = 'ACTIVE' | 'VOIDED';

export interface ClassFeeConfigDto {
  id: string;
  schoolId: string;
  classId: string;
  className?: string;
  effectiveMonth: string; // YYYY-MM
  amount: number;
  status: EntityStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertClassFeeConfigInput {
  classId: string;
  effectiveMonth: string; // YYYY-MM
  amount: number;
  status?: EntityStatus;
}

export interface GenerateDuesInput {
  feeMonth: string; // YYYY-MM
  classId?: string;
}

export interface SkippedDueStudent {
  studentId: string;
  studentCode: string;
  studentName: string;
  reason: string;
}

export interface GenerateDuesResultDto {
  feeMonth: string;
  totalEligibleStudents: number;
  createdCount: number;
  existingCount: number;
  skippedCount: number;
  skippedReasons: SkippedDueStudent[];
}

export interface FeeDueDto {
  id: string;
  schoolId: string;
  studentId: string;
  studentCode?: string;
  studentName?: string;
  classId: string;
  className?: string;
  feeMonth: string;
  baseAmount: number;
  concessionType: ConcessionType;
  concessionValue: number;
  concessionAmount: number;
  netDue: number;
  paidAmount: number;
  balance: number;
  status: FeeDueStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectPaymentInput {
  studentId: string;
  dueId: string;
  amount: number;
  mode: PaymentMode;
  paymentDate: string; // YYYY-MM-DD
  reference?: string | null;
  idempotencyKey: string;
}

export interface FeePaymentDto {
  id: string;
  schoolId: string;
  dueId: string;
  studentId: string;
  receiptNumber: string;
  studentCodeSnapshot: string;
  studentNameSnapshot: string;
  amount: number;
  mode: PaymentMode;
  paymentDate: string;
  reference?: string | null;
  status: PaymentStatus;
  createdAt: string;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedBy?: string | null;
}

export interface PaymentReceiptDto {
  id: string;
  receiptNumber: string;
  schoolId: string;
  schoolName: string;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  schoolLogoFileId?: string | null;
  studentId: string;
  studentCode: string;
  studentName: string;
  className?: string;
  feeMonth: string;
  baseAmount: number;
  concessionAmount: number;
  netDue: number;
  amountPaidThisReceipt: number;
  totalPaid: number;
  remainingBalance: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  reference?: string | null;
  status: PaymentStatus;
  issuedAt: string;
  voidedAt?: string | null;
  voidReason?: string | null;
}

export interface FeePaymentFilterDto {
  studentId?: string;
  search?: string;
  feeMonth?: string;
  fromDate?: string;
  toDate?: string;
  mode?: PaymentMode;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface VoidPaymentInput {
  reason: string;
}

export interface PendingFeeFilterDto {
  feeMonth: string;
  classId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PendingFeeItemDto {
  studentId: string;
  studentCode: string;
  studentName: string;
  classId: string;
  className: string;
  sectionName?: string;
  dueId?: string;
  feeMonth: string;
  baseAmount: number;
  concessionAmount: number;
  netDue: number;
  paidAmount: number;
  balance: number;
  status: 'GENERATED_PENDING' | 'NOT_GENERATED' | 'PAID';
}

export interface ClassFeePendingSummaryDto {
  classId: string;
  className: string;
  totalStudents: number;
  pendingCount: number;
  netDue: number;
  collected: number;
  outstanding: number;
}

export interface PendingFeeReportDto {
  feeMonth: string;
  totalStudents: number;
  studentsWithDuesCount: number;
  studentsPendingCount: number;
  notGeneratedCount: number;
  totalBaseAmount: number;
  totalConcessions: number;
  totalNetDue: number;
  totalCollected: number;
  totalOutstanding: number;
  classSummaries: ClassFeePendingSummaryDto[];
  items: PendingFeeItemDto[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface CreatePendingFeeExportInput {
  feeMonth: string;
  classId?: string;
  search?: string;
}

export interface CollectionBucket {
  bucket: string;
  amount: number;
}

export interface FeesPublicFacade {
  getStudentFeeSummary(input: { schoolId: string; studentId: string; month?: string }): Promise<any>;
  getCollectionTotal(input: { schoolId: string; fromDate?: string; toDate?: string }): Promise<number>;
  getOutstandingTotal(input: { schoolId: string; feeMonth?: string }): Promise<number>;
  getCollectionBuckets(input: { schoolId: string; period: 'day' | 'week' | 'month'; fromDate: string; toDate: string }): Promise<CollectionBucket[]>;
}
