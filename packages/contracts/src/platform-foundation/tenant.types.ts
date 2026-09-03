export type UserRole = 'PLATFORM_ADMIN' | 'SCHOOL_OPERATOR';

export interface TenantContext {
  schoolId: string;
  role: UserRole;
  userId: string;
  sessionId: string;
}
