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
import { PlatformFoundationFacade } from '../facade/platform-foundation.facade';
import { SessionGuard } from '../guards/session.guard';
import { TenantBoundaryException, SessionExpiredException } from '../errors';

describe('MOD-000 API Test Matrix (TC-API-000-001..006)', () => {
  let healthController: HealthController;
  let tenantContextService: TenantContextService;
  let sessionService: SessionService;
  let userSessionRepository: UserSessionRepository;
  let sessionGuard: SessionGuard;
  let facade: PlatformFoundationFacade;
  let objectStorageService: ObjectStorageService;
  let jobEnqueueService: JobEnqueueService;
  let queueProducer: MockQueueProducer;

  beforeEach(() => {
    const minioAdapter = new MinioObjectStorageAdapter();
    const redisAdapter = new RedisRateLimitAdapter();
    healthController = new HealthController(minioAdapter, redisAdapter);

    tenantContextService = new TenantContextService();
    userSessionRepository = new UserSessionRepository();
    sessionService = new SessionService(userSessionRepository);
    sessionGuard = new SessionGuard(sessionService);

    const auditRepository = new AuditLogRepository();
    const auditService = new AuditService(auditRepository);

    const fileRepository = new SchoolFileRepository();
    objectStorageService = new ObjectStorageService(fileRepository, minioAdapter);

    const docJobRepo = new DocumentJobRepository();
    const exportJobRepo = new ExportJobRepository();
    queueProducer = new MockQueueProducer();
    jobEnqueueService = new JobEnqueueService(docJobRepo, exportJobRepo, queueProducer);

    facade = new PlatformFoundationFacade(
      tenantContextService,
      sessionService,
      auditService,
      objectStorageService,
      jobEnqueueService
    );
  });

  // TC-API-000-001: GET /api/v1/health unauthenticated request returns HTTP 200 with status ok
  it('[TC-API-000-001] GET /api/v1/health returns status ok with timestamp and service name', () => {
    const res = healthController.getPublicHealth();
    expect(res.status).toBe('ok');
    expect(res.service).toBe('custom-school-app-api');
    expect(res.timestamp).toBeDefined();
  });

  // TC-API-000-002: Operator route cross-tenant request returns HTTP 404 ERR_TENANT_CROSS_SCHOOL
  it('[TC-API-000-002] Cross-tenant resource request throws TenantBoundaryException mapping to 404 ERR_TENANT_CROSS_SCHOOL', () => {
    tenantContextService.runWithContext(
      {
        schoolId: 'school-aaa-111',
        role: 'SCHOOL_OPERATOR',
        userId: 'op-1',
        sessionId: 'sess-1',
      },
      () => {
        try {
          facade.assertResourceInTenant('school-bbb-222');
          fail('Should have thrown TenantBoundaryException');
        } catch (err: any) {
          expect(err).toBeInstanceOf(TenantBoundaryException);
          expect(err.getStatus()).toBe(404);
          expect(err.getResponse()).toMatchObject({
            errorCode: 'ERR_TENANT_CROSS_SCHOOL',
            statusCode: 404,
          });
        }
      }
    );
  });

  // TC-API-000-003: Request with revoked session cookie returns HTTP 401 ERR_AUTH_SESSION_EXPIRED
  it('[TC-API-000-003] SessionGuard with revoked session cookie throws SessionExpiredException mapping to 401', async () => {
    const { token, session } = await sessionService.createSession({
      userId: 'user-api-1',
      role: 'PLATFORM_ADMIN',
    });

    // Revoke the session
    await sessionService.revokeSession(session.id);

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: { cs_sess: token },
          headers: {},
        }),
      }),
    };

    try {
      await sessionGuard.canActivate(mockContext);
      fail('Should have thrown SessionExpiredException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(SessionExpiredException);
      expect(err.getStatus()).toBe(401);
      expect(err.getResponse()).toMatchObject({
        errorCode: 'ERR_AUTH_SESSION_EXPIRED',
        statusCode: 401,
      });
    }
  });

  // TC-API-000-004: Facade appendAuditEvent returns audit ID
  it('[TC-API-000-004] Facade appendAuditEvent creates record and returns audit ID', async () => {
    const auditId = await facade.appendAuditEvent({
      requestId: 'req-api-1',
      actorId: 'user-api-2',
      actorRole: 'SCHOOL_OPERATOR',
      schoolId: 'school-aaa-111',
      action: 'OPERATOR_STUDENT_UPDATED',
      resourceType: 'STUDENT',
      resourceId: 'stu-500',
    });

    expect(auditId).toBeDefined();
    expect(typeof auditId).toBe('string');
  });

  // TC-API-000-005: getSignedDownloadUrl returns signed URL with TTL ≤ 300s
  it('[TC-API-000-005] getSignedDownloadUrl returns presigned URL with expires parameter ≤ 300', async () => {
    const file = await facade.uploadSchoolFile({
      schoolId: 'school-aaa-111',
      category: 'DOCUMENT',
      fileName: 'doc-report.pdf',
      fileSizeBytes: 1024,
      mimeType: 'application/pdf',
      contentBuffer: Buffer.from('PDF_STREAM'),
      uploadedBy: 'user-api-1',
    });

    const url = await facade.getSignedDownloadUrl('school-aaa-111', file.id, 600);
    expect(url).toContain('expires=300'); // Clamped to 300 max
  });

  // TC-API-000-006: BullMQ queue payload inspection confirms message body contains strictly { jobId }
  it('[TC-API-000-006] BullMQ message payload inspection confirms strictly { jobId } without extraneous parameters', async () => {
    const job = await facade.enqueueBackgroundJob({
      schoolId: 'school-aaa-111',
      jobType: 'RECEIPT_PDF',
      payloadSnapshot: { receiptId: 'rcpt-100', schoolId: 'school-aaa-111' },
      enqueuedBy: 'user-api-1',
    });

    expect(job.id).toBeDefined();
    expect(queueProducer.enqueuedMessages.length).toBe(1);
    expect(queueProducer.enqueuedMessages[0].data).toEqual({ jobId: job.id });
  });
});
