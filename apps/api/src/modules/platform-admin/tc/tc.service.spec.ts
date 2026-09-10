import { TcService } from './tc.service';
import { PrismaService } from '../../../database/prisma.service';
import { SensitiveFieldCryptoService } from '../../../platform/crypto/sensitive-field-crypto.service';
import { PrivateFileService } from '../../../platform/files/private-file.service';
import { JobService } from '../../../platform/jobs/job.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { ApiError } from '../../../common/http/api-error';
import type { SessionActor, StudentsPublicFacade } from '@custom-school/contracts';

describe('TcService', () => {
  let service: TcService;
  let mockPrisma: any;
  let mockCrypto: any;
  let mockFiles: any;
  let mockJobs: any;
  let mockAudit: any;
  let mockStudents: any;

  const actor: SessionActor = {
    userType: 'PLATFORM_ADMIN',
    userId: 'admin-1',
    schoolId: null,
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      school: {
        findUnique: jest.fn(),
      },
      transferCertificate: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'tc-1' }),
      },
    };
    mockCrypto = {
      encryptJson: jest.fn().mockReturnValue({
        ciphertext: 'cipher-123',
        iv: 'iv-123',
        tag: 'tag-123',
        keyVersion: 'v1',
      }),
      decryptJson: jest.fn().mockReturnValue({
        student: {
          id: 'stu-1',
          studentCode: 'STU-001',
          name: 'John Doe',
          className: 'X',
          sectionName: 'A',
        },
      }),
    };
    mockFiles = {
      metadata: jest.fn().mockResolvedValue({ id: 'f-1', sha256: 'hash1', mime: 'image/png' }),
      signedUrl: jest.fn().mockResolvedValue({ url: 'https://minio/signed', expiresInSeconds: 300 }),
    };
    mockJobs = {
      createInTransaction: jest.fn().mockResolvedValue(undefined),
      drainOutbox: jest.fn().mockResolvedValue(undefined),
      resetForRetryInTransaction: jest.fn().mockResolvedValue(undefined),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };
    mockStudents = {
      getTcSnapshot: jest.fn(),
      searchForPlatformTc: jest.fn(),
    };

    service = new TcService(
      mockPrisma as PrismaService,
      mockCrypto as SensitiveFieldCryptoService,
      mockFiles as PrivateFileService,
      mockJobs as JobService,
      mockAudit as AuditService,
      mockStudents as StudentsPublicFacade,
    );
  });

  it('rejects TC issuance with 409 if school is not ACTIVE', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      id: 'sch-1',
      status: 'DRAFT',
    });

    await expect(
      service.issue(actor, 'sch-1', 'stu-1', 'standard-v1'),
    ).rejects.toThrow(ApiError);

    try {
      await service.issue(actor, 'sch-1', 'stu-1', 'standard-v1');
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('ERR_SCHOOL_NOT_ACTIVE');
    }
  });

  it('rejects TC issuance with 409 if school logo, principal or signature is missing', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      id: 'sch-1',
      status: 'ACTIVE',
      logoFileId: null, // missing logo
      principal: { name: 'Principal Skinner', signatureFileId: 'sig-1' },
    });

    await expect(
      service.issue(actor, 'sch-1', 'stu-1', 'standard-v1'),
    ).rejects.toThrow(ApiError);

    try {
      await service.issue(actor, 'sch-1', 'stu-1', 'standard-v1');
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('ERR_TC_READINESS');
    }
  });

  it('issues TC successfully with immutable snapshot encryption, unique tcUuid and job creation', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      id: 'sch-1',
      name: 'Springfield Elementary',
      status: 'ACTIVE',
      logoFileId: 'logo-1',
      principal: { name: 'Principal Skinner', signatureFileId: 'sig-1' },
    });

    mockStudents.getTcSnapshot.mockResolvedValue({
      id: 'stu-1',
      studentCode: 'SR-101',
      name: 'Bart Simpson',
      className: '4',
      sectionName: 'A',
      status: 'ACTIVE',
    });

    const result = await service.issue(actor, 'sch-1', 'stu-1', 'standard-v1');

    expect(result.id).toBeDefined();
    expect(result.tcUuid).toBeDefined();
    expect(result.jobId).toBeDefined();
    expect(result.status).toBe('QUEUED');

    expect(mockCrypto.encryptJson).toHaveBeenCalledTimes(1);
    expect(mockJobs.createInTransaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.transferCertificate.create).toHaveBeenCalledTimes(1);
  });

  it('retry reuses the existing tcUuid and resets job state to QUEUED', async () => {
    mockPrisma.transferCertificate.findFirst.mockResolvedValue({
      id: 'tc-1',
      tcUuid: 'uuid-123',
      schoolId: 'sch-1',
      jobId: 'job-1',
      status: 'FAILED',
    });

    const result = await service.retry(actor, 'sch-1', 'tc-1');
    expect(result.tcUuid).toBe('uuid-123');
    expect(result.status).toBe('QUEUED');
    expect(mockJobs.resetForRetryInTransaction).toHaveBeenCalledWith(mockPrisma, 'job-1');
  });
});
