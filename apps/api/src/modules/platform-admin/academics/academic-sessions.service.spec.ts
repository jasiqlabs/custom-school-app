import { AcademicSessionsService } from './academic-sessions.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import type { SessionActor } from '@custom-school/contracts';

describe('AcademicSessionsService', () => {
  let service: AcademicSessionsService;
  let mockPrisma: any;
  let mockAudit: any;

  const adminActor: SessionActor = {
    userType: 'PLATFORM_ADMIN',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: null,
    sessionId: 'admin-sess-1',
    requestId: 'req-admin-1',
  };

  const operatorActor: SessionActor = {
    userType: 'OPERATOR',
    userId: '22222222-2222-2222-2222-222222222222',
    schoolId: 'SCH-TEST-001',
    sessionId: 'op-sess-1',
    requestId: 'req-op-1',
    role: 'MANAGER',
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 'SCH-TEST-001', status: 'ACTIVE' }),
      },
      academicSession: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      feeRule: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
      classFeeConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      class: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    service = new AcademicSessionsService(mockPrisma, mockAudit);
  });

  describe('create', () => {
    it('creates a new academic session in DRAFT status', async () => {
      mockPrisma.academicSession.findUnique.mockResolvedValue(null);
      mockPrisma.academicSession.create.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
        version: 1,
        createdBy: operatorActor.userId,
        activatedAt: null,
        closedAt: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      });

      const res = await service.create(operatorActor, 'SCH-TEST-001', {
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
      });

      expect(res.id).toBe('sess-1');
      expect(res.status).toBe('DRAFT');
      expect(res.code).toBe('2026-27');
      expect(res.startDate).toBe('2026-04-01');
      expect(res.endDate).toBe('2027-03-31');
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACADEMIC_SESSION_CREATED',
          targetId: 'sess-1',
        }),
        expect.anything()
      );
    });

    it('rejects creation when endDate is before startDate', async () => {
      await expect(
        service.create(operatorActor, 'SCH-TEST-001', {
          code: '2026-27',
          label: 'Academic Year 2026-27',
          startDate: '2027-04-01',
          endDate: '2026-03-31',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation when session code already exists in school', async () => {
      mockPrisma.academicSession.findUnique.mockResolvedValue({ id: 'existing-sess' });

      await expect(
        service.create(operatorActor, 'SCH-TEST-001', {
          code: '2026-27',
          label: 'Academic Year 2026-27',
          startDate: '2026-04-01',
          endDate: '2027-03-31',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('allows Platform Admin to create session for DRAFT school (TASK-007-BE04)', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({ id: 'SCH-DRAFT-001', status: 'DRAFT' });
      mockPrisma.academicSession.findUnique.mockResolvedValue(null);
      mockPrisma.academicSession.create.mockResolvedValue({
        id: 'sess-draft-1',
        schoolId: 'SCH-DRAFT-001',
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
        version: 1,
        createdBy: adminActor.userId,
        activatedAt: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.create(adminActor, 'SCH-DRAFT-001', {
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
      });

      expect(res.id).toBe('sess-draft-1');
      expect(res.status).toBe('DRAFT');
    });

    it('prevents Operator from creating session for non-active school (TASK-007-BE05)', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({ id: 'SCH-DRAFT-001', status: 'DRAFT' });

      await expect(
        service.create(operatorActor, 'SCH-DRAFT-001', {
          code: '2026-27',
          label: 'Academic Year 2026-27',
          startDate: '2026-04-01',
          endDate: '2027-03-31',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('activate', () => {
    it('activates a DRAFT session when no other active session exists (TASK-007-BE01)', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({ id: 'SCH-TEST-001', status: 'ACTIVE' });
      mockPrisma.academicSession.findFirst
        .mockResolvedValueOnce({
          id: 'sess-1',
          schoolId: 'SCH-TEST-001',
          code: '2026-27',
          label: 'Academic Year 2026-27',
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          endDate: new Date('2027-03-31T00:00:00.000Z'),
          status: 'DRAFT',
          version: 1,
        }) // session target
        .mockResolvedValueOnce(null); // active session check

      mockPrisma.academicSession.update.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'ACTIVE',
        version: 2,
        activatedAt: new Date('2026-04-01T00:00:00.000Z'),
        closedAt: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      });

      const res = await service.activate(operatorActor, 'SCH-TEST-001', 'sess-1', { version: 1 });

      expect(res.status).toBe('ACTIVE');
      expect(res.version).toBe(2);
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACADEMIC_SESSION_ACTIVATED',
          targetId: 'sess-1',
        }),
        expect.anything()
      );
    });

    it('rejects activation when another session is already ACTIVE (TASK-007-BE02)', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({ id: 'SCH-TEST-001', status: 'ACTIVE' });
      mockPrisma.academicSession.findFirst
        .mockResolvedValueOnce({
          id: 'sess-2',
          schoolId: 'SCH-TEST-001',
          code: '2027-28',
          label: 'Academic Year 2027-28',
          status: 'DRAFT',
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'sess-1',
          schoolId: 'SCH-TEST-001',
          code: '2026-27',
          label: 'Academic Year 2026-27',
          status: 'ACTIVE',
        });

      await expect(
        service.activate(operatorActor, 'SCH-TEST-001', 'sess-2', { version: 1 })
      ).rejects.toThrow(ConflictException);
    });

    it('rejects activation on version conflict (TASK-007-BE03)', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({ id: 'SCH-TEST-001', status: 'ACTIVE' });
      mockPrisma.academicSession.findFirst.mockResolvedValueOnce({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        status: 'DRAFT',
        version: 2,
      });

      await expect(
        service.activate(operatorActor, 'SCH-TEST-001', 'sess-1', { version: 1 })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates academic session label and dates with valid version', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        label: 'Old Label',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
        version: 1,
      });
      mockPrisma.academicSession.update.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        code: '2026-27',
        label: 'Updated Label',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'DRAFT',
        version: 2,
        activatedAt: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.update(operatorActor, 'SCH-TEST-001', 'sess-1', {
        version: 1,
        label: 'Updated Label',
      });

      expect(res.label).toBe('Updated Label');
      expect(res.version).toBe(2);
    });

    it('rejects update when session does not exist (cross-school 404)', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue(null);

      await expect(
        service.update(operatorActor, 'SCH-TEST-001', 'foreign-id', {
          version: 1,
          label: 'Updated',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('fee configuration reuse on session creation', () => {
    it('automatically reuses prior session fee rules and class fee configs for the new session', async () => {
      mockPrisma.academicSession.findUnique.mockResolvedValue(null);
      mockPrisma.academicSession.findFirst.mockResolvedValue({
        id: 'sess-prior',
        code: '2026-27',
        status: 'ACTIVE',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
      });

      mockPrisma.academicSession.create.mockResolvedValue({
        id: 'sess-new',
        schoolId: 'SCH-TEST-001',
        code: '2027-28',
        label: 'Academic Year 2027-28',
        startDate: new Date('2027-04-01T00:00:00.000Z'),
        endDate: new Date('2028-03-31T00:00:00.000Z'),
        status: 'DRAFT',
        version: 1,
        createdBy: operatorActor.userId,
        activatedAt: null,
        closedAt: null,
        createdAt: new Date('2027-04-01T00:00:00.000Z'),
        updatedAt: new Date('2027-04-01T00:00:00.000Z'),
      });

      mockPrisma.feeRule.findMany.mockResolvedValue([
        {
          id: 'rule-class5',
          schoolId: 'SCH-TEST-001',
          categoryId: 'cat-tuition',
          academicSessionId: 'sess-prior',
          classId: 'cls-5',
          transportId: null,
          amount: 2500,
          recurrencePolicy: 'MONTHLY',
          paymentDueOffset: 10,
          status: 'ACTIVE',
        },
        {
          id: 'rule-all-classes',
          schoolId: 'SCH-TEST-001',
          categoryId: 'cat-exam',
          academicSessionId: 'sess-prior',
          classId: null, // All classes rule
          transportId: null,
          amount: 500,
          recurrencePolicy: 'TERM',
          paymentDueOffset: 15,
          status: 'ACTIVE',
        },
      ]);

      mockPrisma.class.findMany.mockResolvedValue([
        { id: 'cls-5', name: 'Class 5' },
      ]);

      mockPrisma.classFeeConfig.findFirst.mockResolvedValue({
        id: 'cfg-prior',
        amount: 2500,
        effectiveMonth: '2026-04',
      });
      mockPrisma.classFeeConfig.findUnique.mockResolvedValue(null);

      const res = await service.create(operatorActor, 'SCH-TEST-001', {
        code: '2027-28',
        label: 'Academic Year 2027-28',
        startDate: '2027-04-01',
        endDate: '2028-03-31',
      });

      expect(res.id).toBe('sess-new');
      // Verify both class-specific rule and all-classes rule were cloned for the new session
      expect(mockPrisma.feeRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            academicSessionId: 'sess-new',
            classId: 'cls-5',
            amount: 2500,
          }),
        })
      );
      expect(mockPrisma.feeRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            academicSessionId: 'sess-new',
            classId: null,
            amount: 500,
          }),
        })
      );
      // Verify classFeeConfig was cloned for new session start month
      expect(mockPrisma.classFeeConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classId: 'cls-5',
            effectiveMonth: '2027-04',
            amount: 2500,
          }),
        })
      );
    });
  });

  describe('close', () => {
    it('successfully closes an active session and increments version', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'ACTIVE',
        version: 1,
        createdBy: operatorActor.userId,
        activatedAt: new Date('2026-04-01T00:00:00.000Z'),
        closedAt: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      });

      mockPrisma.academicSession.update.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        code: '2026-27',
        label: 'Academic Year 2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T00:00:00.000Z'),
        status: 'CLOSED',
        version: 2,
        createdBy: operatorActor.userId,
        activatedAt: new Date('2026-04-01T00:00:00.000Z'),
        closedAt: new Date('2027-03-31T23:59:59.000Z'),
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2027-03-31T23:59:59.000Z'),
      });

      const res = await service.close(operatorActor, 'SCH-TEST-001', 'sess-1', { version: 1 });

      expect(res.status).toBe('CLOSED');
      expect(res.version).toBe(2);
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACADEMIC_SESSION_CLOSED',
          targetId: 'sess-1',
        }),
        expect.anything()
      );
    });

    it('rejects close on version conflict', async () => {
      mockPrisma.academicSession.findFirst.mockResolvedValue({
        id: 'sess-1',
        schoolId: 'SCH-TEST-001',
        version: 2,
        status: 'ACTIVE',
      });

      await expect(
        service.close(operatorActor, 'SCH-TEST-001', 'sess-1', { version: 1 })
      ).rejects.toThrow(ConflictException);
    });
  });
});
