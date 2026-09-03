export type JobType = 'TC_PDF' | 'RECEIPT_PDF' | 'STUDENT_ID_CARD_PDF' | 'EXCEL_EXPORT' | 'FEE_REPORT_EXPORT';

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface EnqueueJobDto {
  schoolId: string;
  jobType: JobType;
  idempotencyKey?: string;
  payloadSnapshot: Record<string, unknown>;
  enqueuedBy: string;
}

export interface JobRecord {
  id: string;
  schoolId: string;
  jobType: JobType;
  status: JobStatus;
  idempotencyKey: string | null;
  payloadSnapshot: Record<string, unknown>;
  fileId: string | null;
  errorMessage: string | null;
  enqueuedAt: Date;
  completedAt: Date | null;
}

export interface BullMQJobPayload {
  jobId: string;
}
