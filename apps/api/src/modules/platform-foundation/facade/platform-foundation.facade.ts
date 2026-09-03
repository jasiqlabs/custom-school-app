import { Injectable } from '@nestjs/common';
import {
  IPlatformFoundationPublicFacade,
  TenantContext,
  SessionValidationResult,
  AppendAuditLogDto,
  UploadSchoolFileDto,
  SchoolFileRecord,
  EnqueueJobDto,
  JobRecord,
} from '@custom-school/contracts';
import { TenantContextService } from '../services/tenant-context.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { ObjectStorageService } from '../services/object-storage.service';
import { JobEnqueueService } from '../services/job-enqueue.service';

@Injectable()
export class PlatformFoundationFacade implements IPlatformFoundationPublicFacade {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly jobEnqueueService: JobEnqueueService
  ) {}

  resolveTenantContext(): TenantContext {
    return this.tenantContextService.getRequiredContext();
  }

  assertResourceInTenant(resourceSchoolId: string): void {
    this.tenantContextService.assertResourceInTenant(resourceSchoolId);
  }

  async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    return this.sessionService.validateSession(sessionToken);
  }

  async appendAuditEvent(dto: AppendAuditLogDto): Promise<string> {
    return this.auditService.appendAuditEvent(dto);
  }

  async uploadSchoolFile(dto: UploadSchoolFileDto): Promise<SchoolFileRecord> {
    return this.objectStorageService.putSchoolFile(dto);
  }

  async getSignedDownloadUrl(schoolId: string, fileId: string, expiresInSeconds?: number): Promise<string> {
    return this.objectStorageService.getSignedDownloadUrl(schoolId, fileId, expiresInSeconds);
  }

  async enqueueBackgroundJob(dto: EnqueueJobDto): Promise<JobRecord> {
    return this.jobEnqueueService.enqueueJob(dto);
  }
}
