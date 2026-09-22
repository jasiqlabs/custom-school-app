import { GenerateDuesService } from './generate-dues.service';
import { PrismaService } from '../../../database/prisma.service';
import { FeesRepository } from '../repository/fees.repository';
import { AuditService } from '../../../platform/audit/audit.service';
import type { SessionActor } from '@custom-school/contracts';

describe('GenerateDuesService', () => {
  let service: GenerateDuesService;
  let mockPrisma: any;
  let mockRepo: any;
  let mockAudit: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockPrisma = {
      studentEnrollment: {
        findMany: jest.fn(),
      },
      feeDue: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    mockRepo = {
      findEffectiveConfig: jest.fn(),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    service = new GenerateDuesService(
      mockPrisma as PrismaService,
      mockRepo as FeesRepository,
      mockAudit as AuditService
    );
  });

  it('skips students when existing fee due is already present', async () => {
    mockPrisma.studentEnrollment.findMany.mockResolvedValue([
      {
        student: { id: 's1', studentCode: 'STU-001', fullName: 'Alice', concessionType: 'NONE', concessionValue: 0 },
        class: { id: 'c1', name: 'Class 1' },
      },
    ]);
    mockPrisma.feeDue.findUnique.mockResolvedValue({ id: 'due-existing' });

    const result = await service.generateDues(actor, { feeMonth: '2026-05' });

    expect(result.createdCount).toBe(0);
    expect(result.existingCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(mockPrisma.feeDue.create).not.toHaveBeenCalled();
  });

  it('records skipped reasons if class lacks active fee config', async () => {
    mockPrisma.studentEnrollment.findMany.mockResolvedValue([
      {
        student: { id: 's2', studentCode: 'STU-002', fullName: 'Bob', concessionType: 'NONE', concessionValue: 0 },
        class: { id: 'c2', name: 'Class 2' },
      },
    ]);
    mockPrisma.feeDue.findUnique.mockResolvedValue(null);
    mockRepo.findEffectiveConfig.mockResolvedValue(null);

    const result = await service.generateDues(actor, { feeMonth: '2026-05' });

    expect(result.createdCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedReasons[0].studentCode).toBe('STU-002');
  });

  it('creates dues with concession calculation', async () => {
    mockPrisma.studentEnrollment.findMany.mockResolvedValue([
      {
        student: { id: 's3', studentCode: 'STU-003', fullName: 'Charlie', concessionType: 'PERCENTAGE', concessionValue: 20 },
        class: { id: 'c1', name: 'Class 1' },
      },
    ]);
    mockPrisma.feeDue.findUnique.mockResolvedValue(null);
    mockRepo.findEffectiveConfig.mockResolvedValue({ id: 'cfg-1', amount: 1000 });
    mockPrisma.feeDue.create.mockResolvedValue({ id: 'due-1' });

    const result = await service.generateDues(actor, { feeMonth: '2026-05' });

    expect(result.createdCount).toBe(1);
    expect(mockPrisma.feeDue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          baseAmount: expect.any(Object),
          concessionAmount: expect.any(Object),
          netDue: expect.any(Object),
          balance: expect.any(Object),
          status: 'UNPAID',
        }),
      })
    );
  });
});
