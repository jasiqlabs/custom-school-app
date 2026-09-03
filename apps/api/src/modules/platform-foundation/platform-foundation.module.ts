import { Module, Global } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { TenantContextService } from './services/tenant-context.service';
import { SessionService } from './services/session.service';
import { AuditService } from './services/audit.service';
import { ObjectStorageService } from './services/object-storage.service';
import { JobEnqueueService, MockQueueProducer } from './services/job-enqueue.service';
import { UserSessionRepository } from './repositories/user-session.repository';
import { LoginAttemptRepository } from './repositories/login-attempt.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { SchoolFileRepository } from './repositories/school-file.repository';
import { DocumentJobRepository } from './repositories/document-job.repository';
import { ExportJobRepository } from './repositories/export-job.repository';
import { MinioObjectStorageAdapter } from './adapters/minio-object-storage.adapter';
import { RedisRateLimitAdapter } from './adapters/redis-rate-limit.adapter';
import { PlatformFoundationFacade } from './facade/platform-foundation.facade';
import { SessionGuard } from './guards/session.guard';
import { TenantGuard } from './guards/tenant.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { OperatorGuard } from './guards/operator.guard';

@Global()
@Module({
  controllers: [HealthController],
  providers: [
    TenantContextService,
    SessionService,
    AuditService,
    ObjectStorageService,
    JobEnqueueService,
    MockQueueProducer,
    UserSessionRepository,
    LoginAttemptRepository,
    AuditLogRepository,
    SchoolFileRepository,
    DocumentJobRepository,
    ExportJobRepository,
    MinioObjectStorageAdapter,
    RedisRateLimitAdapter,
    PlatformFoundationFacade,
    SessionGuard,
    TenantGuard,
    PlatformAdminGuard,
    OperatorGuard,
  ],
  exports: [
    TenantContextService,
    SessionService,
    AuditService,
    ObjectStorageService,
    JobEnqueueService,
    UserSessionRepository,
    LoginAttemptRepository,
    AuditLogRepository,
    SchoolFileRepository,
    DocumentJobRepository,
    ExportJobRepository,
    MinioObjectStorageAdapter,
    RedisRateLimitAdapter,
    PlatformFoundationFacade,
    SessionGuard,
    TenantGuard,
    PlatformAdminGuard,
    OperatorGuard,
  ],
})
export class PlatformFoundationModule {}
