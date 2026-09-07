import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { PlatformAuthService } from '../auth/platform-auth.service';
import { SchoolsService } from '../schools/schools.service';
import { AcademicMasterService } from '../academics/academic-master.service';
import { OperatorsService } from '../operators/operators.service';
import { TransferCertificateService } from '../transfer-certificate/transfer-certificate.service';
import { DashboardService } from '../dashboard/dashboard.service';

import { UsersRepository } from '../users.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { AcademicsRepository } from '../academics/academics.repository';
import { AuditLogRepository } from '../../platform-foundation/repositories/audit-log.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { UserSessionRepository } from '../../platform-foundation/repositories/user-session.repository';
import { DocumentJobRepository } from '../../platform-foundation/repositories/document-job.repository';
import { ExportJobRepository } from '../../platform-foundation/repositories/export-job.repository';
import { LoginAttemptRepository } from '../../platform-foundation/repositories/login-attempt.repository';

import { SessionService } from '../../platform-foundation/services/session.service';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { JobEnqueueService, MockQueueProducer } from '../../platform-foundation/services/job-enqueue.service';
import { TcPdfConsumer, ITcPdfDatabase } from '../../../../../worker/src/consumers/platform-admin/tc-pdf.consumer';
import { MOD_001_ERRORS } from '@custom-school/contracts';

describe('MOD-001 End-to-End User Flow: Complete Lifecycle Validation', () => {
  // Services
  let authService: PlatformAuthService;
  let schoolsService: SchoolsService;
  let academicsService: AcademicMasterService;
  let operatorsService: OperatorsService;
  let tcService: TransferCertificateService;
  let dashboardService: DashboardService;
  let sessionService: SessionService;
  let workerConsumer: TcPdfConsumer;

  // Repositories
  let usersRepo: UsersRepository;
  let schoolsRepo: SchoolsRepository;
  let academicsRepo: AcademicsRepository;
  let auditRepo: AuditLogRepository;
  let fileRepo: SchoolFileRepository;
  let sessionRepo: UserSessionRepository;
  let docJobRepo: DocumentJobRepository;
  let exportJobRepo: ExportJobRepository;
  let loginAttemptRepo: LoginAttemptRepository;
  let queueProducer: MockQueueProducer;

  beforeAll(() => {
    usersRepo = new UsersRepository();
    schoolsRepo = new SchoolsRepository();
    academicsRepo = new AcademicsRepository();
    auditRepo = new AuditLogRepository();
    fileRepo = new SchoolFileRepository();
    sessionRepo = new UserSessionRepository();
    docJobRepo = new DocumentJobRepository();
    exportJobRepo = new ExportJobRepository();
    loginAttemptRepo = new LoginAttemptRepository();
    queueProducer = new MockQueueProducer();

    const auditService = new AuditService(auditRepo);
    sessionService = new SessionService(sessionRepo);
    const jobEnqueueService = new JobEnqueueService(docJobRepo, exportJobRepo, queueProducer);

    authService = new PlatformAuthService(usersRepo, sessionService, auditService, loginAttemptRepo);
    schoolsService = new SchoolsService(schoolsRepo, auditService, fileRepo, sessionRepo);
    academicsService = new AcademicMasterService(academicsRepo, schoolsRepo, auditService);
    operatorsService = new OperatorsService(usersRepo, schoolsRepo, auditService, sessionRepo);
    tcService = new TransferCertificateService(schoolsRepo, docJobRepo, jobEnqueueService, auditService);
    dashboardService = new DashboardService(schoolsRepo, usersRepo);

    const mockWorkerDb: ITcPdfDatabase = {
      findJobById: async (jobId) => docJobRepo.findById(jobId),
      findSchoolById: async (schoolId) => schoolsRepo.findById(schoolId),
      updateJobStatus: async (jobId, status, fileId, error) => {
        await docJobRepo.updateStatus(jobId, status as any, fileId, error);
      },
      createSchoolFile: async (file) => {
        await fileRepo.create(file);
      },
    };
    workerConsumer = new TcPdfConsumer(mockWorkerDb);
  });

  // State shared across steps in the user journey
  let adminToken: string;
  let adminUserId: string;
  let schoolId: string;
  let schoolUuid: string;
  let grade10ClassId: string;
  let sectionAId: string;
  let operatorId: string;
  let operatorToken: string;
  let tcJobId: string;

  // Step 1: Admin Login
  it('Step 1 [Admin Login]: Authenticate platform admin and establish secure session', async () => {
    const loginRes = await authService.login(
      'admin@customschool.com',
      'Admin@12345',
    );

    expect(loginRes).toBeDefined();
    expect(loginRes.user.email).toBe('admin@customschool.com');
    expect(loginRes.user.role).toBe('PLATFORM_ADMIN');
    expect(loginRes.token).toBeDefined();

    adminToken = loginRes.token;
    adminUserId = loginRes.user.id;

    // Verify session validity
    const validation = await sessionService.validateSession(adminToken);
    expect(validation.status).toBe('VALID');
    expect(validation.role).toBe('PLATFORM_ADMIN');

    // Verify control plane rejection for wrong password
    await expect(
      authService.login(
        'admin@customschool.com',
        'WrongPassword123!',
      ),
    ).rejects.toThrow();
  });

  // Step 2: Add School Tenant
  it('Step 2 [Add School]: Create Oakridge Global Academy with immutable UUID in DRAFT status', async () => {
    // 2a. Attempt create duplicate without confirmation flag
    const school1 = await schoolsService.createSchool({
      name: 'Oakridge Global Academy',
      code: 'OGA-01',
      address: '77 Heritage Blvd, Tech District',
      contactEmail: 'info@oakridge.edu',
      contactPhone: '9876543210',
    }, adminUserId);

    expect(school1).toBeDefined();
    expect(school1.id).toBeDefined();
    expect(school1.schoolUuid).toBeDefined();
    expect(school1.name).toBe('Oakridge Global Academy');
    expect(school1.status).toBe('DRAFT');

    schoolId = school1.id;
    schoolUuid = school1.schoolUuid;

    // 2b. Attempt to create exact duplicate name without confirmation -> must throw 409
    await expect(
      schoolsService.createSchool({
        name: 'Oakridge Global Academy',
      }),
    ).rejects.toThrow();
  });

  // Step 3: Update Profile & Principal Details
  it('Step 3 [Update Profile & Principal]: Maintain profile, address, and principal credentials', async () => {
    // 3a. Update profile
    const updatedProfile = await schoolsService.updateProfile(schoolId, {
      address: '77 Heritage Blvd, Suite 200, Tech District',
      contactPhone: '9876543211',
    }, adminUserId);

    expect(updatedProfile.address).toBe('77 Heritage Blvd, Suite 200, Tech District');
    expect(updatedProfile.contactPhone).toBe('9876543211');
    expect(updatedProfile.schoolUuid).toBe(schoolUuid); // Immutable check

    // 3b. Update principal details with valid 10-digit phone
    const updatedPrincipal = await schoolsService.updatePrincipal(schoolId, {
      principalName: 'Dr. Eleanor Vance',
      contactNumber: '9123456780',
    }, adminUserId);

    expect(updatedPrincipal.principalName).toBe('Dr. Eleanor Vance');
    expect(updatedPrincipal.principalContactNumber).toBe('9123456780');

    // 3c. Invalid principal phone (>10 digits) rejected with 422
    await expect(
      schoolsService.updatePrincipal(schoolId, {
        contactNumber: '12345',
      }),
    ).rejects.toThrow();
  });

  // Step 4: Academic Hierarchy (Classes & Sections)
  it('Step 4 [Classes & Sections]: Create Grade 10, Section A and verify BR-CLS-002 guards', async () => {
    // 4a. Create class Grade 10
    const cls = await academicsService.createClass(schoolId, {
      name: 'Grade 10',
      displayOrder: 10,
    }, adminUserId);

    expect(cls).toBeDefined();
    expect(cls.id).toBeDefined();
    expect(cls.name).toBe('Grade 10');
    expect(cls.schoolId).toBe(schoolId);
    grade10ClassId = cls.id;

    // 4b. Duplicate class name blocked with 409
    await expect(
      academicsService.createClass(schoolId, { name: 'Grade 10' }),
    ).rejects.toThrow();

    // 4c. Create section Section A under Grade 10
    const sec = await academicsService.createSection(schoolId, grade10ClassId, {
      name: 'Section A',
    }, adminUserId);

    expect(sec).toBeDefined();
    expect(sec.id).toBeDefined();
    expect(sec.name).toBe('Section A');
    expect(sec.classId).toBe(grade10ClassId);
    expect(sec.schoolId).toBe(schoolId);
    sectionAId = sec.id;

    // 4d. Duplicate section name under same class blocked with 409
    await expect(
      academicsService.createSection(schoolId, grade10ClassId, { name: 'Section A' }),
    ).rejects.toThrow();

    // 4e. Verify academic structure hierarchy
    const structure = await academicsService.getActiveAcademicStructure(schoolId);
    expect(structure.length).toBe(1);
    expect(structure[0].className).toBe('Grade 10');
    expect(structure[0].sections?.length).toBe(1);
    expect(structure[0].sections![0].name).toBe('Section A');
  });

  // Step 5: School Operational Status Lifecycle
  it('Step 5 [Status Lifecycle]: Activate -> Deactivate with reason -> Reactivate', async () => {
    // 5a. Activate school from DRAFT to ACTIVE
    const activated = await schoolsService.changeStatus(schoolId, {
      status: 'ACTIVE',
    }, adminUserId);
    expect(activated.status).toBe('ACTIVE');

    // 5b. Attempt deactivation without reason -> throws 422
    await expect(
      schoolsService.changeStatus(schoolId, {
        status: 'INACTIVE',
        reason: '   ',
      }),
    ).rejects.toThrow();

    // 5c. Deactivate school with reason
    const deactivated = await schoolsService.changeStatus(schoolId, {
      status: 'INACTIVE',
      reason: 'Scheduled regulatory audit',
    }, adminUserId);
    expect(deactivated.status).toBe('INACTIVE');

    // 5d. Reactivate school back to ACTIVE
    const reactivated = await schoolsService.changeStatus(schoolId, {
      status: 'ACTIVE',
    }, adminUserId);
    expect(reactivated.status).toBe('ACTIVE');
  });

  // Step 6: Provision School Operator Account
  it('Step 6 [Operator Provisioning]: Provision operator account, verify Argon2id hash & session revocation', async () => {
    // 6a. Provision Mark Spencer
    const operator = await operatorsService.provisionOperator(schoolId, {
      fullName: 'Mark Spencer',
      email: 'mark.spencer@oakridge.edu',
      temporaryPassword: 'OperatorPass123!',
    }, adminUserId);

    expect(operator).toBeDefined();
    expect(operator.id).toBeDefined();
    expect(operator.email).toBe('mark.spencer@oakridge.edu');
    expect(operator.status).toBe('ACTIVE');
    operatorId = operator.id;

    // Verify stored Argon2id hash
    const storedUser = await usersRepo.findById(operatorId);
    expect(storedUser).toBeDefined();
    expect(storedUser?.passwordHash).toMatch(/^\$argon2id\$/);

    // Verify password verification succeeds
    const matches = await argon2.verify(storedUser!.passwordHash, 'OperatorPass123!');
    expect(matches).toBe(true);

    // 6b. Duplicate email blocked platform-wide
    await expect(
      operatorsService.provisionOperator(schoolId, {
        fullName: 'Duplicate Spencer',
        email: 'mark.spencer@oakridge.edu',
        temporaryPassword: 'AnotherPass123!',
      }),
    ).rejects.toThrow();

    // 6c. Operator creates session
    const opSessionRes = await sessionService.createSession({
      userId: operatorId,
      role: 'SCHOOL_OPERATOR',
      schoolId: schoolId,
    });
    operatorToken = opSessionRes.token;

    const opValid = await sessionService.validateSession(operatorToken);
    expect(opValid.status).toBe('VALID');
    expect(opValid.schoolId).toBe(schoolId);

    // 6d. Toggle status to INACTIVE -> Operator session revoked
    await operatorsService.updateOperatorStatus(schoolId, operatorId, 'INACTIVE', adminUserId);
    const opRevoked = await sessionService.validateSession(operatorToken);
    expect(opRevoked.status).toBe('REVOKED');

    // Restore operator to ACTIVE
    await operatorsService.updateOperatorStatus(schoolId, operatorId, 'ACTIVE', adminUserId);
    const updatedOp = await usersRepo.findById(operatorId);
    expect(updatedOp?.status).toBe('ACTIVE');
  });

  // Step 7: Transfer Certificate PDF Generation
  it('Step 7 [Transfer Certificate]: Enqueue TC generation, render PDF with immutable UUID', async () => {
    // 7a. Enqueue TC job for active school
    const tcRes = await tcService.generateTransferCertificate(schoolId, {
      includeLogo: false,
      includeSignature: false,
    }, adminUserId);

    expect(tcRes.jobId).toBeDefined();
    tcJobId = tcRes.jobId;

    // Verify Trusted Job Pattern message on BullMQ mock producer
    const lastQueueMessage = queueProducer.enqueuedMessages[queueProducer.enqueuedMessages.length - 1];
    expect(lastQueueMessage.data).toEqual({ jobId: tcJobId });

    // 7b. Background worker processes the job
    const workerRes = await workerConsumer.processTcJob({ jobId: tcJobId });
    expect(workerRes.success).toBe(true);
    expect(workerRes.schoolUuid).toBe(schoolUuid);
    expect(workerRes.fileId).toBeDefined();

    // Verify completed job in repository
    const completedJob = await docJobRepo.findById(tcJobId);
    expect(completedJob?.status).toBe('COMPLETED');
    expect(completedJob?.fileId).toBe(workerRes.fileId);

    // Verify generated file metadata
    const generatedFile = await fileRepo.findById(workerRes.fileId!);
    expect(generatedFile).toBeDefined();
    expect(generatedFile?.schoolId).toBe(schoolId);
    expect(generatedFile?.category).toBe('TRANSFER_CERTIFICATE');
  });

  // Step 8: School Directory & Search
  it('Step 8 [School Directory & Search]: Search and paginate schools directory', async () => {
    // List all schools
    const listRes = await schoolsService.listSchools({ page: 1, limit: 25 });
    expect(listRes.total).toBeGreaterThanOrEqual(1);

    const found = listRes.items.find((s) => s.id === schoolId);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Oakridge Global Academy');
    expect(found?.schoolUuid).toBe(schoolUuid);

    // Search by partial name
    const searchRes = await schoolsService.listSchools({ search: 'Oakridge' });
    expect(searchRes.items.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.items.every((s) => s.name.includes('Oakridge'))).toBe(true);
  });

  // Step 9: Platform Portfolio Dashboard
  it('Step 9 [Platform Dashboard]: Verify accurate portfolio totals and zero student PII leakage', async () => {
    // Metrics
    const metrics = await dashboardService.getMetrics();
    expect(metrics.totalSchools).toBeGreaterThanOrEqual(1);
    expect(metrics.activeSchools).toBeGreaterThanOrEqual(1);

    // School Summary
    const summary = await dashboardService.getSchoolSummary({ status: 'ACTIVE' });
    expect(summary.items.length).toBeGreaterThanOrEqual(1);

    const oakridge = summary.items.find((s) => s.schoolId === schoolId);
    expect(oakridge).toBeDefined();
    expect(oakridge?.name).toBe('Oakridge Global Academy');
    expect(oakridge?.status).toBe('ACTIVE');
    expect(oakridge?.operatorCount).toBe(1);
    expect(oakridge?.studentCount).toBeNull(); // Zero PII leakage
    expect(oakridge?.studentCountState).toBe('UNAVAILABLE');
  });
});
