import { UserRole } from './tenant.types';

export type AuditAction =
  | 'SECURITY_LOGIN_SUCCESS'
  | 'SECURITY_LOGIN_FAILURE'
  | 'SECURITY_SESSION_REVOKED'
  | 'SECURITY_CROSS_TENANT_ATTEMPT'
  | 'TENANT_SCHOOL_ONBOARDED'
  | 'OPERATOR_STUDENT_CREATED'
  | 'OPERATOR_STUDENT_UPDATED'
  | 'FINANCIAL_FEE_COLLECTED'
  | 'FINANCIAL_RECEIPT_VOIDED'
  | 'STORAGE_FILE_UPLOADED'
  | 'STORAGE_FILE_DELETED'
  | 'JOB_ENQUEUED'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED';

export interface AppendAuditLogDto {
  requestId: string;
  actorId?: string;
  actorRole?: UserRole;
  schoolId?: string;
  action: AuditAction | string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}

export interface AuditLogRecord {
  id: string;
  occurredAt: Date;
  requestId: string;
  actorId: string | null;
  actorRole: string | null;
  schoolId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipHash: string | null;
}
