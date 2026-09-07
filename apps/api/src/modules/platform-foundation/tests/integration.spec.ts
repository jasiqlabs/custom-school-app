import { HealthController } from '../controllers/health.controller';
import { TenantContextService } from '../services/tenant-context.service';
import { SessionService } from '../services/session.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { SchoolFileRepository } from '../repositories/school-file.repository';
import { ObjectStorageService } from '../services/object-storage.service';
import { DocumentJobRepository } from '../repositories/document-job.repository';
import { ExportJobRepository } from '../repositories/export-job.repository';
import { JobEnqueueService, MockQueueProducer } from '../services/job-enqueue.service';
import { UserSessionRepository } from '../repositories/user-session.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { MinioObjectStorageAdapter } from '../adapters/minio-object-storage.adapter';
import { RedisRateLimitAdapter } from '../adapters/redis-rate-limit.adapter';

class ConcreteStudentRepository extends TenantRepository<{ id: string; schoolId: string; name: string }> {
  private students = [
    { id: 'stu-a-1', schoolId: 'school-aaa-111', name: 'Alice School A' },
    { id: 'stu-b-1', schoolId: 'school-bbb-222', name: 'Bob School B' },
  ];

  findById(id: string) {
    const student = this.students.find((s) => s.id === id) || null;
    return this.filterByTenant(student);
  }
}

describe('MOD-000 Integration Test Matrix (TC-INT-000-001..006)', () => {
  let healthController: HealthController;
  let tenantContextService: TenantContextService;
  let studentRepository: ConcreteStudentRepository;
  let sessionService: SessionService;
  let userSessionRepository: UserSessionRepository;
  let auditRepository: AuditLogRepository;
  let objectStorageService: ObjectStorageService;
  let exportJobRepository: ExportJobRepository;
  let jobEnqueueService: JobEnqueueService;
  let queueProducer: MockQueueProducer;

  beforeEach(() => {
    const minioAdapter = new MinioObjectStorageAdapter();
    const redisAdapter = new RedisRateLimitAdapter();
    healthController = new HealthController(minioAdapter, redisAdapter);

    tenantContextService = new TenantContextService();
    studentRepository = new ConcreteStudentRepository(tenantContextService);

    userSessionRepository = new UserSessionRepository();
    sessionService = new SessionService(userSessionRepository);

    auditRepository = new AuditLogRepository();
    const fileRepository = new SchoolFileRepository();
    objectStorageService = new ObjectStorageService(fileRepository, minioAdapter);

    const docJobRepo = new DocumentJobRepository();
    exportJobRepository = new ExportJobRepository();
    queueProducer = new MockQueueProducer();
    jobEnqueueService = new JobEnqueueService(docJobRepo, exportJobRepository, queueProducer);
  });

  // TC-INT-000-001: HealthController ready returns HTTP 200 ready when subsystems are up
  it('[TC-INT-000-001] GET /health/ready returns status ready when all services are healthy', async () => {
    let statusCode = 0;
    let jsonBody: any = null;

    const mockRes: any = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (body: any) => {
        jsonBody = body;
      },
    };

    await healthController.getReadiness(mockRes);
    expect(statusCode).toBe(200);
    expect(jsonBody.status).toBe('ready');
    expect(jsonBody.checks.database.status).toBe('up');
    expect(jsonBody.checks.redis.status).toBe('up');
    expect(jsonBody.checks.minio.status).toBe('up');
  });

  // TC-INT-000-002: TenantRepository queries from Operator session school A for student B return zero rows
  it('[TC-INT-000-002] TenantRepository filter returns null on cross-tenant resource query without existence leak', () => {
    tenantContextService.runWithContext(
      {
        schoolId: 'school-aaa-111',
        role: 'SCHOOL_OPERATOR',
        userId: 'op-1',
        sessionId: 'sess-1',
      },
      () => {
        // Own school student returns entity
        const ownStudent = studentRepository.findById('stu-a-1');
        expect(ownStudent).not.toBeNull();
        expect(ownStudent?.name).toBe('Alice School A');

        // Other school student returns null
        const crossStudent = studentRepository.findById('stu-b-1');
        expect(crossStudent).toBeNull();
      }
    );
  });

  // TC-INT-000-003: Session past expires_at returns EXPIRED without session extension
  it('[TC-INT-000-003] SessionService.validateSession on expired token returns EXPIRED without extension', async () => {
    const { token, session } = await sessionService.createSession({
      userId: 'user-int-1',
      role: 'PLATFORM_ADMIN',
    });

    // Artificially expire the session in the repository
    const expiredDate = new Date(Date.now() - 1000);
    session.expiresAt = expiredDate;
    session.idleExpiresAt = expiredDate;

    const validation = await sessionService.validateSession(token);
    expect(validation.status).toBe('EXPIRED');
    expect(session.expiresAt).toEqual(expiredDate);
  });

  // TC-INT-000-004: Audit repository append-only integrity check
  it('[TC-INT-000-004] AuditLogRepository is strictly append-only with no update path', async () => {
    const initialCount = await auditRepository.count();
    await auditRepository.insert({
      id: 'audit-int-1',
      occurredAt: new Date(),
      requestId: 'req-int-1',
      actorId: 'user-int-2',
      actorRole: 'SCHOOL_OPERATOR',
      schoolId: 'school-aaa-111',
      action: 'FINANCIAL_FEE_COLLECTED',
      resourceType: 'FEE_RECEIPT',
      resourceId: 'rcpt-1001',
      metadata: { amount: 5000 },
      ipHash: 'hash123',
    });

    const newCount = await auditRepository.count();
    expect(newCount).toBe(initialCount + 1);
    expect((auditRepository as any).update).toBeUndefined();
  });

  // TC-INT-000-005: MinIO adapter stores object with tenants/{schoolId}/... prefix and generates valid expiring URL
  it('[TC-INT-000-005] MinIO storage adapter puts object and generates presigned URL with tenant prefix', async () => {
    const file = await objectStorageService.putSchoolFile({
      schoolId: 'school-aaa-111',
      category: 'RECEIPT',
      fileName: 'receipt-2026.pdf',
      fileSizeBytes: 2048,
      mimeType: 'application/pdf',
      contentBuffer: Buffer.from('RECEIPT_PDF_CONTENT'),
      uploadedBy: 'op-1',
    });

    expect(file.storageKey).toMatch(/^tenants\/school-aaa-111\/RECEIPT\//);

    const signedUrl = await objectStorageService.getSignedDownloadUrl('school-aaa-111', file.id, 120);
    expect(signedUrl).toContain('storage.customschool.internal');
    expect(signedUrl).toContain(file.storageKey);
  });

  // TC-INT-000-006: Export job with filter_snapshot preserves authoritative filter state
  it('[TC-INT-000-006] Export job preserves filter_snapshot in persistent database row', async () => {
    const filterSnapshot = { classId: 'cls-grade-5', academicYear: '2026-2027' };
    const job = await jobEnqueueService.enqueueJob({
      schoolId: 'school-aaa-111',
      jobType: 'EXCEL_EXPORT',
      payloadSnapshot: filterSnapshot,
      enqueuedBy: 'op-1',
    });

    const stored = await exportJobRepository.findById(job.id);
    expect(stored).not.toBeNull();
    expect(stored?.payloadSnapshot).toEqual(filterSnapshot);
    expect(stored?.status).toBe('QUEUED');
  });
});
