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
        findFirst: jest.fn(),
      },
      student: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      feeDue: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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

  describe('generateDueForStudent', () => {
    it('returns existing due if already present', async () => {
      mockPrisma.feeDue.findUnique.mockResolvedValue({ id: 'due-exists', netDue: 1000 });

      const due = await service.generateDueForStudent('SCH-TEST-001', 's1', '2026-09');

      expect(due).toEqual({ id: 'due-exists', netDue: 1000 });
      expect(mockPrisma.feeDue.create).not.toHaveBeenCalled();
    });

    it('generates due automatically when active config exists', async () => {
      mockPrisma.feeDue.findUnique.mockResolvedValue(null);
      mockPrisma.student = {
        findFirst: jest.fn().mockResolvedValue({
          id: 's-karan',
          studentCode: 'STU-0004',
          fullName: 'Karan Kumar',
          concessionType: 'NONE',
          concessionValue: 0,
          enrollments: [{ class: { id: 'c-class5', name: 'Class 5' } }],
        }),
      };
      mockRepo.findEffectiveConfig.mockResolvedValue({
        id: 'cfg-c5',
        amount: 2500,
      });
      mockPrisma.feeDue.create.mockResolvedValue({
        id: 'due-karan',
        studentId: 's-karan',
        classId: 'c-class5',
        netDue: 2500,
      });

      const due = await service.generateDueForStudent('SCH-TEST-001', 's-karan', '2026-09');

      expect(due).toBeDefined();
      expect(mockPrisma.feeDue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: 'SCH-TEST-001',
            studentId: 's-karan',
            classId: 'c-class5',
            baseAmount: expect.any(Object),
            netDue: expect.any(Object),
            status: 'UNPAID',
          }),
        })
      );
    });

    it('returns null if no fee config exists for student class', async () => {
      mockPrisma.feeDue.findUnique.mockResolvedValue(null);
      mockPrisma.student = {
        findFirst: jest.fn().mockResolvedValue({
          id: 's-no-fee',
          studentCode: 'STU-9999',
          fullName: 'No Fee Student',
          concessionType: 'NONE',
          concessionValue: 0,
          enrollments: [{ class: { id: 'c-nocfg', name: 'Class No Config' } }],
        }),
      };
      mockRepo.findEffectiveConfig.mockResolvedValue(null);

      const due = await service.generateDueForStudent('SCH-TEST-001', 's-no-fee', '2026-09');

      expect(due).toBeNull();
      expect(mockPrisma.feeDue.create).not.toHaveBeenCalled();
    });
  });

  describe('syncStudentConcessionDues', () => {
    it('immediately updates pending current month due when concession is modified', async () => {
      mockPrisma.student = {
        findFirst: jest.fn().mockResolvedValue({
          id: 's-concess',
          studentCode: 'STU-0010',
          concessionType: 'PERCENTAGE',
          concessionValue: 20,
          enrollments: [{ class: { id: 'c1', name: 'Class 1' } }],
        }),
      };
      mockPrisma.feeDue.findUnique = jest.fn().mockResolvedValue({
        id: 'due-curr',
        baseAmount: 1000,
        paidAmount: 0,
        balance: 1000,
        status: 'UNPAID',
      });
      mockPrisma.feeDue.update = jest.fn().mockResolvedValue({});
      mockPrisma.feeDue.findMany = jest.fn().mockResolvedValue([]);

      await service.syncStudentConcessionDues('SCH-TEST-001', 's-concess');

      expect(mockPrisma.feeDue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'due-curr' },
          data: expect.objectContaining({
            concessionTypeSnapshot: 'PERCENTAGE',
            status: 'UNPAID',
          }),
        })
      );
    });

    it('applies concession to next month fee if current month is fully paid', async () => {
      mockPrisma.student = {
        findFirst: jest.fn().mockResolvedValue({
          id: 's-paid',
          studentCode: 'STU-0011',
          concessionType: 'FIXED_AMOUNT',
          concessionValue: 500,
          enrollments: [{ class: { id: 'c1', name: 'Class 1' } }],
        }),
      };
      // Current month is PAID (balance: 0, paidAmount: 1000)
      mockPrisma.feeDue.findUnique = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'due-curr-paid',
          baseAmount: 1000,
          paidAmount: 1000,
          balance: 0,
          status: 'PAID',
        })
        .mockResolvedValueOnce({
          id: 'due-next-unpaid',
          baseAmount: 1000,
          paidAmount: 0,
          balance: 1000,
          status: 'UNPAID',
        });
      mockPrisma.feeDue.update = jest.fn().mockResolvedValue({});
      mockPrisma.feeDue.findMany = jest.fn().mockResolvedValue([]);

      await service.syncStudentConcessionDues('SCH-TEST-001', 's-paid');

      expect(mockPrisma.feeDue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'due-next-unpaid' },
          data: expect.objectContaining({
            concessionTypeSnapshot: 'FIXED_AMOUNT',
            status: 'UNPAID',
          }),
        })
      );
    });
  });
});

