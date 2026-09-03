import { TenantContext } from './tenant.types';
import { SessionValidationResult } from './session.types';
import { AppendAuditLogDto } from './audit.types';
import { UploadSchoolFileDto, SchoolFileRecord } from './storage.types';
import { EnqueueJobDto, JobRecord } from './job.types';

export interface IPlatformFoundationPublicFacade {
  resolveTenantContext(): TenantContext;
  assertResourceInTenant(resourceSchoolId: string): void;
  validateSession(sessionToken: string): Promise<SessionValidationResult>;
  appendAuditEvent(dto: AppendAuditLogDto): Promise<string>;
  uploadSchoolFile(dto: UploadSchoolFileDto): Promise<SchoolFileRecord>;
  getSignedDownloadUrl(schoolId: string, fileId: string, expiresInSeconds?: number): Promise<string>;
  enqueueBackgroundJob(dto: EnqueueJobDto): Promise<JobRecord>;
}
