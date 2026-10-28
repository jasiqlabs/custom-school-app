import { ExamContextsService } from './application/exam-contexts.service';
import { AdmitCardsService } from './application/admit-cards.service';
import { PrismaService } from '../../database/prisma.service';
import { FeesPublicFacadeImpl } from '../fees/facade/fees-public.facade';
import { SensitiveFieldCryptoService } from '../../platform/crypto/sensitive-field-crypto.service';
import { PrivateFileService } from '../../platform/files/private-file.service';
import { JobService } from '../../platform/jobs/job.service';
import { AuditService } from '../../platform/audit/audit.service';
import { ApiError } from '../../common/http/api-error';
import type { SessionActor } from '@custom-school/contracts';

describe('Examination & Admit Card Services', () => {
  let examContextsService: ExamContextsService;
  let admitCardsService: AdmitCardsService;
  let mockPrisma: any;
  let mockFeesFacade: any;
  let mockCrypto: any;
  let mockFileService: any;
  let mockJobService: any;
  let mockAudit: any;

  const schoolId = 'school-alpha';
  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: 'op-1',
    schoolId,
    sessionId: 'sess-1',
    requestId: 'req-1',
    role: 'MANAGER',
  };

  beforeEach(() => {
    mockPrisma = {
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: schoolId, status: 'ACTIVE', name: 'Alpha Academy' }),
        findFirst: jest.fn().mockResolvedValue({ id: schoolId, status: 'ACTIVE', name: 'Alpha Academy' }),
      },
      academicSession: {
        findFirst: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
      examCardContext: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      studentEnrollment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      student: {
        findFirst: jest.fn(),
      },
      admitCardIssue: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      file: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => {
        if (typeof callback === 'function') {
          return callback(mockPrisma);
        }
        return Promise.resolve(callback);
      }),
    };

    mockFeesFacade = {
      checkStudentDocumentClearance: jest.fn(),
    };

    mockCrypto = {
      encryptField: jest.fn((str) => `enc:${str}`),
      decryptField: jest.fn((str) => str.replace('enc:', '')),
      encryptJson: jest.fn().mockReturnValue({
        ciphertext: 'enc-cipher',
        iv: 'iv',
        authTag: 'tag',
        alg: 'aes-256-gcm',
        keyVersion: 1,
      }),
      decryptJson: jest.fn((env) => ({})),
    };

    mockFileService = {
      storeGenerated: jest.fn().mockResolvedValue({ fileId: 'file-123' }),
      signedUrl: jest.fn().mockResolvedValue({
        url: 'https://storage.school.test/admit-cards/admit-123.pdf?sig=valid',
        expiresInSeconds: 300,
        mime: 'application/pdf',
        sha256: 'abc123sha',
      }),
    };

    mockJobService = {
      createInTransaction: jest.fn().mockResolvedValue({ id: 'job-123' }),
      resetForRetryInTransaction: jest.fn().mockResolvedValue(undefined),
      drainOutbox: jest.fn().mockResolvedValue(undefined),
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    examContextsService = new ExamContextsService(
      mockPrisma as unknown as PrismaService,
      mockAudit as unknown as AuditService,
      mockFeesFacade as unknown as FeesPublicFacadeImpl,
    );

    admitCardsService = new AdmitCardsService(
      mockPrisma as unknown as PrismaService,
      mockCrypto as unknown as SensitiveFieldCryptoService,
      mockFileService as unknown as PrivateFileService,
      mockJobService as unknown as JobService,
      mockAudit as unknown as AuditService,
      mockFeesFacade as unknown as FeesPublicFacadeImpl,
    );
  });

  describe('ExamContextsService', () => {
    it('rejects exam context creation when examEnd is before examStart', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue({ id: 'sess-1' });
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1' });

      await expect(
        examContextsService.create(actor, schoolId, {
          academicSessionId: 'sess-1',
          classId: 'cls-1',
          title: 'Mid Term 2026',
          examStart: '2026-11-20',
          examEnd: '2026-11-10', // Invalid: end < start
        }),
      ).rejects.toThrow(ApiError);
    });

    it('creates exam context in DRAFT state with version 1', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue({ id: 'sess-1', label: '2026-27' });
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1', name: 'Class 10' });
      mockPrisma.examCardContext.findFirst.mockResolvedValue(null); // No duplicate examCode
      mockPrisma.examCardContext.create.mockResolvedValue({
        id: 'ctx-1',
        schoolId,
        academicSessionId: 'sess-1',
        classId: 'cls-1',
        title: 'Mid Term 2026',
        examCode: 'MID-2026',
        examStart: new Date('2026-11-10'),
        examEnd: new Date('2026-11-20'),
        venue: 'Hall A',
        instructions: 'Follow rules',
        status: 'DRAFT',
        version: 1,
        createdBy: actor.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        academicSession: { label: '2026-27' },
        class: { name: 'Class 10' },
        _count: { admitCardIssues: 0 },
      });

      const res = await examContextsService.create(actor, schoolId, {
        academicSessionId: 'sess-1',
        classId: 'cls-1',
        title: 'Mid Term 2026',
        examCode: 'MID-2026',
        examStart: '2026-11-10',
        examEnd: '2026-11-20',
        venue: 'Hall A',
        instructions: 'Follow rules',
      });

      expect(res.id).toBe('ctx-1');
      expect(res.status).toBe('DRAFT');
      expect(res.version).toBe(1);
      expect(mockAudit.append).toHaveBeenCalled();
    });

    it('enforces optimistic locking on update and rejects version mismatch with ERR_EXAM_CONTEXT_STALE', async () => {
      mockPrisma.examCardContext.findFirst.mockResolvedValue({
        id: 'ctx-1',
        schoolId,
        version: 2, // Current version in DB is 2
        title: 'Current Title',
        examStart: new Date('2026-11-10'),
        examEnd: new Date('2026-11-20'),
        academicSession: { label: '2026-27' },
        class: { name: 'Class 10' },
      });

      await expect(
        examContextsService.update(actor, schoolId, 'ctx-1', {
          version: 1, // Stale version provided by client
          title: 'Attempted Update',
        }),
      ).rejects.toMatchObject({
        code: 'ERR_EXAM_CONTEXT_STALE',
      });
    });

    it('successfully updates status to READY when version matches', async () => {
      mockPrisma.examCardContext.findFirst.mockResolvedValue({
        id: 'ctx-1',
        schoolId,
        version: 1,
        title: 'Current Title',
        examStart: new Date('2026-11-10'),
        examEnd: new Date('2026-11-20'),
        academicSession: { label: '2026-27' },
        class: { name: 'Class 10' },
      });

      mockPrisma.examCardContext.update.mockResolvedValue({
        id: 'ctx-1',
        schoolId,
        version: 2,
        title: 'Updated Title',
        status: 'READY',
        examStart: new Date('2026-11-10'),
        examEnd: new Date('2026-11-20'),
        venue: 'Hall A',
        instructions: 'Follow rules',
        createdBy: actor.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        academicSession: { label: '2026-27' },
        class: { name: 'Class 10' },
        _count: { admitCardIssues: 0 },
      });

      const updated = await examContextsService.update(actor, schoolId, 'ctx-1', {
        version: 1,
        title: 'Updated Title',
        status: 'READY',
      });

      expect(updated.status).toBe('READY');
      expect(updated.version).toBe(2);
      expect(mockAudit.append).toHaveBeenCalled();
    });
  });

  describe('AdmitCardsService - Fee Clearance & Issuance Enforcement', () => {
    const examContextId = 'ctx-1';

    const mockExam = {
      id: examContextId,
      schoolId,
      academicSessionId: 'sess-1',
      classId: 'cls-1',
      title: 'Annual Final Examination',
      examStart: new Date('2026-12-01'),
      examEnd: new Date('2026-12-10'),
      venue: 'Main Auditorium',
      instructions: 'Carry School ID and Admit Card',
      status: 'READY',
      academicSession: { label: '2026-2027' },
      class: { name: 'Grade 10' },
    };

    beforeEach(() => {
      mockPrisma.examCardContext.findFirst.mockResolvedValue(mockExam);
    });

    it('blocks issuance with ERR_FEES_PENDING_FOR_ADMIT_CARD when single student has pending dues', async () => {
      mockPrisma.admitCardIssue.findFirst.mockResolvedValue(null);

      mockPrisma.studentEnrollment.findFirst.mockResolvedValue({
        studentId: 'student-with-dues',
        classId: 'cls-1',
        sectionId: 'sec-1',
        class: { name: 'Grade 10' },
        section: { name: 'A' },
        student: {
          id: 'student-with-dues',
          studentCode: 'SCH-2026-002',
          fullName: 'Rohan Verma',
          rollNumber: '102',
        },
      });

      // Student has 1500 outstanding dues
      mockFeesFacade.checkStudentDocumentClearance.mockResolvedValue({
        cleared: false,
        totalOutstanding: 1500,
        reasons: ['Pending fee balance of ₹1500 across 1 unpaid fee head(s)'],
        unpaidItems: [
          { categoryName: 'Tuition Fee', feeMonth: '2026-10', balance: 1500 },
        ],
      });

      await expect(
        admitCardsService.issue(actor, schoolId, {
          examContextId,
          studentIds: ['student-with-dues'],
        }),
      ).rejects.toMatchObject({
        code: 'ERR_FEES_PENDING_FOR_ADMIT_CARD',
      });

      expect(mockPrisma.admitCardIssue.create).not.toHaveBeenCalled();
      expect(mockJobService.createInTransaction).not.toHaveBeenCalled();
    });

    it('allows issuance and compiles admit card PDF when student has full fee clearance (0 dues)', async () => {
      mockPrisma.admitCardIssue.findFirst.mockResolvedValue(null);

      // Student is completely fee-cleared
      mockFeesFacade.checkStudentDocumentClearance.mockResolvedValue({
        cleared: true,
        totalOutstanding: 0,
        reasons: [],
        unpaidItems: [],
      });

      mockPrisma.studentEnrollment.findFirst.mockResolvedValue({
        studentId: 'student-cleared',
        classId: 'cls-1',
        sectionId: 'sec-1',
        class: { name: 'Grade 10' },
        section: { name: 'A' },
        student: {
          id: 'student-cleared',
          studentCode: 'SCH-2026-001',
          fullName: 'Aarav Sharma',
          fatherName: 'Rajesh Sharma',
          motherName: 'Sunita Sharma',
          dob: new Date('2010-05-15'),
          address: '123 Model Town',
          rollNumber: '101',
        },
      });

      mockPrisma.admitCardIssue.create.mockResolvedValue({
        id: 'issue-1',
        cardUuid: '550e8400-e29b-41d4-a716-446655440000',
        schoolId,
        examContextId,
        studentId: 'student-cleared',
        status: 'PROCESSING',
        templateVersion: 'standard-v1',
        fileId: null,
        jobId: 'job-123',
        issuedAt: new Date(),
        completedAt: null,
      });

      mockPrisma.admitCardIssue.update.mockResolvedValue({
        id: 'issue-1',
        status: 'COMPLETED',
        fileId: 'file-123',
      });

      const response = await admitCardsService.issue(actor, schoolId, {
        examContextId,
        studentIds: ['student-cleared'],
      });

      expect(response.totalRequested).toBe(1);
      expect(response.issuedCount).toBe(1);
      expect(response.blockedCount).toBe(0);
      expect(response.results[0].success).toBe(true);
      expect(['QUEUED', 'COMPLETED']).toContain(response.results[0].status);
      expect(mockJobService.createInTransaction).toHaveBeenCalled();
      expect(mockAudit.append).toHaveBeenCalled();
    });

    it('handles bulk issuance correctly: issues cleared students and marks blocked students without throwing error', async () => {
      mockPrisma.admitCardIssue.findFirst.mockResolvedValue(null);

      // Student 1 cleared, Student 2 blocked
      mockFeesFacade.checkStudentDocumentClearance
        .mockResolvedValueOnce({
          cleared: true,
          totalOutstanding: 0,
          reasons: [],
          unpaidItems: [],
        })
        .mockResolvedValueOnce({
          cleared: false,
          totalOutstanding: 2500,
          reasons: ['Pending fee balance of ₹2500 across 2 unpaid fee head(s)'],
          unpaidItems: [{ categoryName: 'Tuition Fee', balance: 2500 }],
        });

      mockPrisma.studentEnrollment.findFirst
        .mockResolvedValueOnce({
          studentId: 'student-1',
          classId: 'cls-1',
          sectionId: 'sec-1',
          class: { name: 'Grade 10' },
          section: { name: 'A' },
          student: {
            id: 'student-1',
            studentCode: 'SCH-2026-001',
            fullName: 'Student One',
            fatherName: 'Father One',
            motherName: 'Mother One',
            dob: new Date('2010-01-01'),
            address: 'City',
            rollNumber: '1',
          },
        })
        .mockResolvedValueOnce({
          studentId: 'student-2',
          classId: 'cls-1',
          sectionId: 'sec-1',
          class: { name: 'Grade 10' },
          section: { name: 'A' },
          student: {
            id: 'student-2',
            studentCode: 'SCH-2026-002',
            fullName: 'Student Two',
            fatherName: 'Father Two',
            motherName: 'Mother Two',
            dob: new Date('2010-02-02'),
            address: 'City',
            rollNumber: '2',
          },
        });

      mockPrisma.admitCardIssue.create.mockResolvedValue({
        id: 'issue-bulk-1',
        cardUuid: '550e8400-e29b-41d4-a716-446655440001',
        schoolId,
        examContextId,
        studentId: 'student-1',
        status: 'PROCESSING',
        templateVersion: 'standard-v1',
        jobId: 'job-bulk-1',
        issuedAt: new Date(),
      });

      mockPrisma.admitCardIssue.update.mockResolvedValue({
        id: 'issue-bulk-1',
        status: 'COMPLETED',
        fileId: 'file-123',
      });

      const response = await admitCardsService.issue(actor, schoolId, {
        examContextId,
        studentIds: ['student-1', 'student-2'],
      });

      expect(response.totalRequested).toBe(2);
      expect(response.issuedCount).toBe(1);
      expect(response.blockedCount).toBe(1);
      expect(response.results[0].studentId).toBe('student-1');
      expect(response.results[0].success).toBe(true);
      expect(response.results[1].studentId).toBe('student-2');
      expect(response.results[1].success).toBe(false);
      expect(response.results[1].error).toContain('Pending fee balance of ₹2500');
    });

    it('enforces multi-tenancy: returns 404 when downloading admit card belonging to another school', async () => {
      // Admit card belongs to school-beta, but requested by school-alpha
      mockPrisma.admitCardIssue.findFirst.mockResolvedValue(null);

      await expect(
        admitCardsService.download('school-alpha', 'issue-of-school-beta'),
      ).rejects.toMatchObject({
        code: 'ERR_ADMIT_CARD_NOT_FOUND',
      });
    });

    it('generates signed download URL for completed admit card', async () => {
      mockPrisma.admitCardIssue.findFirst.mockResolvedValue({
        id: 'issue-completed',
        schoolId,
        status: 'COMPLETED',
        fileId: 'file-xyz',
      });

      const res = await admitCardsService.download(schoolId, 'issue-completed');
      expect(res.url).toContain('https://storage.school.test/admit-cards');
      expect(mockFileService.signedUrl).toHaveBeenCalledWith('file-xyz', schoolId);
    });

    it('returns direct PDF buffer and filename for completed admit card', async () => {
      mockPrisma.admitCardIssue.findFirst.mockResolvedValue({
        id: 'issue-completed',
        schoolId,
        status: 'COMPLETED',
        fileId: 'file-xyz',
        student: { studentCode: 'SCH-001' },
      });
      mockFileService.readInternal = jest.fn().mockResolvedValue({
        file: { mime: 'application/pdf' },
        buffer: Buffer.from('%PDF-1.4 mock content'),
      });

      const res = await admitCardsService.getPdfBuffer(schoolId, 'issue-completed');
      expect(res.filename).toBe('admit-card-SCH-001.pdf');
      expect(res.mime).toBe('application/pdf');
      expect(res.buffer.toString()).toContain('%PDF-1.4');
    });
  });
});
