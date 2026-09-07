import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { TransferCertificateService } from '../transfer-certificate/transfer-certificate.service';
import { SchoolsService } from '../schools/schools.service';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { DocumentJobRepository } from '../../platform-foundation/repositories/document-job.repository';
import { ExportJobRepository } from '../../platform-foundation/repositories/export-job.repository';
import { JobEnqueueService, MockQueueProducer } from '../../platform-foundation/services/job-enqueue.service';
import { TcPdfConsumer, ITcPdfDatabase } from '../../../../../worker/src/consumers/platform-admin/tc-pdf.consumer';
import { MOD_001_ERRORS } from '@custom-school/contracts';

describe('US-001-007 Generate and Recover School Transfer Certificate PDF', () => {
  let tcService: TransferCertificateService;
  let schoolsService: SchoolsService;
  let schoolsRepository: SchoolsRepository;
  let documentJobRepository: DocumentJobRepository;
  let fileRepository: SchoolFileRepository;
  let queueProducer: MockQueueProducer;
  let workerConsumer: TcPdfConsumer;
  let dlqItems: any[] = [];

  beforeEach(() => {
    schoolsRepository = new SchoolsRepository();
    const auditRepo = new AuditLogRepository();
    const auditService = new AuditService(auditRepo);
    fileRepository = new SchoolFileRepository();
    documentJobRepository = new DocumentJobRepository();
    const exportJobRepo = new ExportJobRepository();
    queueProducer = new MockQueueProducer();
    dlqItems = [];

    const jobEnqueueService = new JobEnqueueService(
      documentJobRepository,
      exportJobRepo,
      queueProducer,
    );

    schoolsService = new SchoolsService(
      schoolsRepository,
      auditService,
      fileRepository,
    );

    tcService = new TransferCertificateService(
      schoolsRepository,
      documentJobRepository,
      jobEnqueueService,
      auditService,
    );

    const mockWorkerDb: ITcPdfDatabase = {
      findJobById: async (jobId) => documentJobRepository.findById(jobId),
      findSchoolById: async (schoolId) => schoolsRepository.findById(schoolId),
      updateJobStatus: async (jobId, status, fileId, error) => {
        await documentJobRepository.updateStatus(jobId, status as any, fileId, error);
      },
      createSchoolFile: async (file) => {
        await fileRepository.create(file);
      },
      sendToDlq: async (jobId, error, payload) => {
        dlqItems.push({ jobId, error, payload });
      },
    };

    workerConsumer = new TcPdfConsumer(mockWorkerDb);
  });

  it('[VT-001-032] Generate TC for active school with trusted job pattern', async () => {
    const school = await schoolsService.createSchool({ name: 'Oxford International' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // 1. Enqueue via API service
    const { jobId } = await tcService.generateTransferCertificate(school.id, {
      includeLogo: false,
      includeSignature: false,
    });

    expect(jobId).toBeDefined();

    // Verify Trusted Job Pattern: BullMQ queue contains strictly { jobId }
    expect(queueProducer.enqueuedMessages.length).toBe(1);
    expect(queueProducer.enqueuedMessages[0].data).toEqual({ jobId });

    // 2. Process via worker consumer
    const result = await workerConsumer.processTcJob({ jobId });
    expect(result.success).toBe(true);
    expect(result.fileId).toBeDefined();
    expect(result.schoolUuid).toBe(school.schoolUuid);

    // Verify stored file
    const generatedFile = await fileRepository.findById(result.fileId!);
    expect(generatedFile).toBeDefined();
    expect(generatedFile?.schoolId).toBe(school.id);
  });

  it('[VT-001-033] Inactive school cannot generate TC', async () => {
    const draftSchool = await schoolsService.createSchool({ name: 'Dormant School' });
    expect(draftSchool.status).toBe('DRAFT');

    await expect(
      tcService.generateTransferCertificate(draftSchool.id, {
        includeLogo: false,
        includeSignature: false,
      }),
    ).rejects.toThrow(ConflictException);

    try {
      await tcService.generateTransferCertificate(draftSchool.id, {
        includeLogo: false,
        includeSignature: false,
      });
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_SCHOOL_NOT_ACTIVE);
    }
  });

  it('[VT-001-034] Missing signature prerequisite blocks TC when enabled', async () => {
    const school = await schoolsService.createSchool({ name: 'Signature Test School' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // School currently has no principal signature uploaded
    await expect(
      tcService.generateTransferCertificate(school.id, {
        includeSignature: true,
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    try {
      await tcService.generateTransferCertificate(school.id, {
        includeSignature: true,
      });
    } catch (err: any) {
      expect(err.getResponse().code).toBe(MOD_001_ERRORS.ERR_TC_PREREQUISITE_MISSING);
    }
  });

  it('[VT-001-035] Failed TC processing offers retry and enters DLQ after 3 attempts', async () => {
    const school = await schoolsService.createSchool({ name: 'Flaky School' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    const { jobId } = await tcService.generateTransferCertificate(school.id, {
      includeLogo: false,
      includeSignature: false,
    });

    // Attempt 1 fails -> Retried
    const attempt1 = await workerConsumer.processTcJob({ jobId }, 1, true);
    expect(attempt1.success).toBe(false);
    expect(attempt1.retried).toBe(true);
    let job = await documentJobRepository.findById(jobId);
    expect(job?.status).toBe('RETRYING');

    // Attempt 2 fails -> Retried
    const attempt2 = await workerConsumer.processTcJob({ jobId }, 2, true);
    expect(attempt2.success).toBe(false);
    expect(attempt2.retried).toBe(true);

    // Attempt 3 fails -> Terminal DLQ
    const attempt3 = await workerConsumer.processTcJob({ jobId }, 3, true);
    expect(attempt3.success).toBe(false);
    expect(attempt3.sentToDlq).toBe(true);

    job = await documentJobRepository.findById(jobId);
    expect(job?.status).toBe('FAILED');
    expect(dlqItems.length).toBe(1);
    expect(dlqItems[0].jobId).toBe(jobId);
  });

  it('[VT-001-036] Regeneration preserves immutable school identity', async () => {
    const school = await schoolsService.createSchool({ name: 'Highland Academy' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // First generation
    const res1 = await tcService.generateTransferCertificate(school.id, {});
    const workerRes1 = await workerConsumer.processTcJob({ jobId: res1.jobId });

    // Re-generation
    const res2 = await tcService.generateTransferCertificate(school.id, {});
    const workerRes2 = await workerConsumer.processTcJob({ jobId: res2.jobId });

    expect(workerRes1.fileId).not.toEqual(workerRes2.fileId);
    expect(workerRes1.schoolUuid).toBe(school.schoolUuid);
    expect(workerRes2.schoolUuid).toBe(school.schoolUuid);
  });

  it('[VT-001-037] Download/view TC returns authentic PDF-1.4 buffer sealed with immutable school identity', async () => {
    const school = await schoolsService.createSchool({ name: 'Cambridge Valley School' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    const genRes = await tcService.generateTransferCertificate(school.id, {
      includeLogo: false,
      includeSignature: false,
    });
    await workerConsumer.processTcJob({ jobId: genRes.jobId });

    const downloadData = await tcService.getJobPdfBuffer(school.id, genRes.jobId);
    expect(downloadData.fileName).toContain(`Transfer_Certificate_${school.code}_${genRes.jobId}.pdf`);
    expect(downloadData.buffer).toBeDefined();
    expect(downloadData.buffer.length).toBeGreaterThan(500);

    // Verify PDF header magic bytes (%PDF-1.4)
    const header = downloadData.buffer.toString('utf-8', 0, 8);
    expect(header).toContain('%PDF-1.4');

    // Verify PDF content includes the immutable school UUID
    const content = downloadData.buffer.toString('utf-8');
    expect(content).toContain(school.schoolUuid);
    expect(content).toContain(school.name);
    expect(content).toContain(school.code);
  });

  it('[VT-001-038] Generated Transfer Certificate embeds uploaded logo and principal signature images as XObjects', async () => {
    const minioAdapter = new (require('../../platform-foundation/adapters/minio-object-storage.adapter').MinioObjectStorageAdapter)();
    const objectStorageService = new (require('../../platform-foundation/services/object-storage.service').ObjectStorageService)(
      fileRepository,
      minioAdapter,
    );

    const tcServiceWithStorage = new TransferCertificateService(
      schoolsRepository,
      documentJobRepository,
      new (require('../../platform-foundation/services/job-enqueue.service').JobEnqueueService)(
        documentJobRepository,
        new (require('../../platform-foundation/repositories/export-job.repository').ExportJobRepository)(),
        queueProducer,
      ),
      new (require('../../platform-foundation/services/audit.service').AuditService)(new (require('../../platform-foundation/repositories/audit-log.repository').AuditLogRepository)()),
      fileRepository,
      objectStorageService,
    );

    const school = await schoolsService.createSchool({ name: 'Eton International' });
    await schoolsService.changeStatus(school.id, { status: 'ACTIVE' });

    // Upload 1x1 sample PNG logo
    const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const logoFile = await objectStorageService.putSchoolFile({
      schoolId: school.id,
      category: 'LOGO',
      fileName: 'logo.png',
      fileSizeBytes: samplePng.length,
      mimeType: 'image/png',
      contentBuffer: samplePng,
      uploadedBy: 'admin',
    });
    await schoolsService.updateProfile(school.id, { logoFileId: logoFile.id });

    // Upload sample signature
    const sigFile = await objectStorageService.putSchoolFile({
      schoolId: school.id,
      category: 'SIGNATURE',
      fileName: 'sig.png',
      fileSizeBytes: samplePng.length,
      mimeType: 'image/png',
      contentBuffer: samplePng,
      uploadedBy: 'admin',
    });
    await schoolsService.updatePrincipal(school.id, {
      principalName: 'Dr. Arthur Pendelton',
      signatureFileId: sigFile.id,
    });

    // Generate TC with both logo and signature
    const genRes = await tcServiceWithStorage.generateTransferCertificate(school.id, {
      includeLogo: true,
      includeSignature: true,
    });

    const pdfData = await tcServiceWithStorage.getJobPdfBuffer(school.id, genRes.jobId);
    const pdfStr = pdfData.buffer.toString('utf-8');

    // Verify embedded XObject image references and drawing calls
    expect(pdfStr).toContain('/XObject << /ImLogo');
    expect(pdfStr).toContain('/ImSig');
    expect(pdfStr).toContain('/ImLogo Do');
    expect(pdfStr).toContain('/ImSig Do');
    expect(pdfStr).toContain(school.schoolUuid);
    expect(pdfStr).toContain('Eton International');
    expect(pdfStr).toContain('Dr. Arthur Pendelton');
  });
});
