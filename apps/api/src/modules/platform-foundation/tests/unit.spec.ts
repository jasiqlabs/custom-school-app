import { HealthController } from '../controllers/health.controller';
import { TenantContextService } from '../services/tenant-context.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { ObjectStorageService } from '../services/object-storage.service';
import { JobEnqueueService, MockQueueProducer } from '../services/job-enqueue.service';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { SchoolFileRepository } from '../repositories/school-file.repository';
import { DocumentJobRepository } from '../repositories/document-job.repository';
import { ExportJobRepository } from '../repositories/export-job.repository';
import { MinioObjectStorageAdapter } from '../adapters/minio-object-storage.adapter';
import { RedisRateLimitAdapter } from '../adapters/redis-rate-limit.adapter';
import { TenantBoundaryException } from '../errors';

describe('MOD-000 Unit Test Matrix (TC-UNIT-000-001..006)', () => {
  let healthController: HealthController;
  let tenantContextService: TenantContextService;
  let sessionService: SessionService;
  let auditService: AuditService;
  let objectStorageService: ObjectStorageService;
  let jobEnqueueService: JobEnqueueService;
  let auditRepository: AuditLogRepository;
  let queueProducer: MockQueueProducer;

  beforeEach(() => {
    const minioAdapter = new MinioObjectStorageAdapter();
    const redisAdapter = new RedisRateLimitAdapter();
    healthController = new HealthController(minioAdapter, redisAdapter);

    tenantContextService = new TenantContextService();
    const sessionRepo = new UserSessionRepository();
    sessionService = new SessionService(sessionRepo);

    auditRepository = new AuditLogRepository();
    auditService = new AuditService(auditRepository);

    const fileRepo = new SchoolFileRepository();
    objectStorageService = new ObjectStorageService(fileRepo, minioAdapter);

    const docJobRepo = new DocumentJobRepository();
    const exportJobRepo = new ExportJobRepository();
    queueProducer = new MockQueueProducer();
    jobEnqueueService = new JobEnqueueService(docJobRepo, exportJobRepo, queueProducer);
  });

  // TC-UNIT-000-001: HealthController.getLiveness returns { status: 'ok', service: 'custom-school-app-api' }
  it('[TC-UNIT-000-001] HealthController.getLiveness returns ok and service name', () => {
    const response = healthController.getLiveness();
    expect(response).toEqual({
      status: 'ok',
      service: 'custom-school-app-api',
    });
  });

  // TC-UNIT-000-002: TenantContextService.assertResourceInTenant throws TenantBoundaryException when school IDs mismatch
  it('[TC-UNIT-000-002] TenantContextService.assertResourceInTenant throws TenantBoundaryException on cross-tenant ID', () => {
    tenantContextService.runWithContext(
      {
        schoolId: 'school-aaa-111',
        role: 'SCHOOL_OPERATOR',
        userId: 'user-001',
        sessionId: 'sess-001',
      },
      () => {
        expect(() => {
          tenantContextService.assertResourceInTenant('school-bbb-222');
        }).toThrow(TenantBoundaryException);
      }
    );
  });

  // TC-UNIT-000-003: SessionService.createSession rejects SCHOOL_OPERATOR without schoolId (BR-AUTH-002)
  it('[TC-UNIT-000-003] SessionService.createSession rejects SCHOOL_OPERATOR without schoolId', async () => {
    await expect(
      sessionService.createSession({
        userId: 'user-002',
        role: 'SCHOOL_OPERATOR',
        // missing schoolId
      })
    ).rejects.toThrow('SCHOOL_OPERATOR role requires a valid schoolId');
  });

  // TC-UNIT-000-004: AuditService.appendAuditEvent inserts row; repository has no update method
  it('[TC-UNIT-000-004] AuditService.appendAuditEvent inserts row; repository has no update method', async () => {
    const auditId = await auditService.appendAuditEvent({
      requestId: 'req-001',
      actorId: 'user-003',
      actorRole: 'SCHOOL_OPERATOR',
      schoolId: 'school-aaa-111',
      action: 'OPERATOR_STUDENT_CREATED',
      resourceType: 'STUDENT',
      resourceId: 'student-999',
    });

    expect(auditId).toBeDefined();
    expect(await auditRepository.count()).toBe(1);
    expect((auditRepository as any).update).toBeUndefined();
    expect((auditRepository as any).delete).toBeUndefined();
  });

  // TC-UNIT-000-005: ObjectStorageService.putSchoolFile accepts 2.0 MB logo and rejects 2.5 MB logo
  it('[TC-UNIT-000-005] ObjectStorageService.putSchoolFile enforces category size limit (logo ≤ 2 MB)', async () => {
    const validLogoBuffer = Buffer.alloc(2 * 1024 * 1024); // 2 MB
    const validResult = await objectStorageService.putSchoolFile({
      schoolId: 'school-aaa-111',
      category: 'LOGO',
      fileName: 'school-logo.png',
      fileSizeBytes: validLogoBuffer.length,
      mimeType: 'image/png',
      contentBuffer: validLogoBuffer,
      uploadedBy: 'user-001',
    });
    expect(validResult.id).toBeDefined();
    expect(validResult.storageKey).toContain('tenants/school-aaa-111/LOGO/');

    const oversizeBuffer = Buffer.alloc(Math.floor(2.5 * 1024 * 1024)); // 2.5 MB
    await expect(
      objectStorageService.putSchoolFile({
        schoolId: 'school-aaa-111',
        category: 'LOGO',
        fileName: 'oversize-logo.png',
        fileSizeBytes: oversizeBuffer.length,
        mimeType: 'image/png',
        contentBuffer: oversizeBuffer,
        uploadedBy: 'user-001',
      })
    ).rejects.toThrow(/exceeds maximum allowed size/);
  });

  // TC-UNIT-000-006: JobEnqueueService returns existing job row on duplicate idempotencyKey
  it('[TC-UNIT-000-006] JobEnqueueService deduplicates via idempotencyKey', async () => {
    const job1 = await jobEnqueueService.enqueueJob({
      schoolId: 'school-aaa-111',
      jobType: 'EXCEL_EXPORT',
      idempotencyKey: 'idem-key-12345',
      payloadSnapshot: { classId: 'cls-10-A' },
      enqueuedBy: 'user-001',
    });

    const job2 = await jobEnqueueService.enqueueJob({
      schoolId: 'school-aaa-111',
      jobType: 'EXCEL_EXPORT',
      idempotencyKey: 'idem-key-12345',
      payloadSnapshot: { classId: 'cls-10-A' },
      enqueuedBy: 'user-001',
    });

    expect(job1.id).toEqual(job2.id);
    expect(queueProducer.enqueuedMessages.length).toBe(1);
  });
});
