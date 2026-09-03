import { UserRole } from './tenant.types';

export interface SessionRecord {
  id: string;
  sessionTokenHash: string;
  userId: string;
  schoolId: string | null;
  role: UserRole;
  expiresAt: Date;
  idleExpiresAt: Date;
  lastActiveAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  userAgent?: string;
  ipHash?: string;
}

export interface CreateSessionDto {
  userId: string;
  role: UserRole;
  schoolId?: string;
  userAgent?: string;
  ipHash?: string;
}

export type SessionValidationStatus = 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID';

export interface SessionValidationResult {
  status: SessionValidationStatus;
  session?: SessionRecord;
  schoolId?: string;
  role?: UserRole;
  userId?: string;
}
