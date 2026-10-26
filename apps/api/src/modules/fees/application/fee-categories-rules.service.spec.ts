import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FeeCategoriesRulesService } from './fee-categories-rules.service';

describe('FeeCategoriesRulesService (TASK-012)', () => {
  let service: FeeCategoriesRulesService;
  let mockPrisma: any;
  let mockAudit: any;

  const schoolA = 'SCH-TEST-A';
  const schoolB = 'SCH-TEST-B';
  const mockActor: any = {
    userId: '11111111-1111-1111-1111-111111111111',
    userType: 'OPERATOR',
    requestId: 'req-123',
    schoolId: schoolA,
  };

  beforeEach(() => {
    mockPrisma = {
      feeCategory: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      feeRule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
      academicSession: {
        findFirst: jest.fn(),
      },
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    service = new FeeCategoriesRulesService(mockPrisma, mockAudit);
  });

  describe('TASK-012-BE01: Category and Rule CRUD', () => {
    it('creates fee category with normalized uppercase code', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue(null);
      mockPrisma.feeCategory.create.mockImplementation((args: any) => ({
        id: 'cat-1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.createCategory(
        schoolA,
        {
          code: 'tuition',
          displayName: 'Tuition Fee',
          chargeKind: 'RECURRING',
          description: 'Monthly tuition',
        },
        mockActor,
      );

      expect(result.code).toBe('TUITION');
      expect(result.displayName).toBe('Tuition Fee');
      expect(mockPrisma.feeCategory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            code: 'TUITION',
          }),
        }),
      );
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FEE_CATEGORY_CREATE' }),
      );
    });

    it('creates fee rule and links category and class', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue({ id: 'cat-1', schoolId: schoolA, code: 'TUITION' });
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-1', schoolId: schoolA, name: 'Grade 1' });
      mockPrisma.feeRule.findMany.mockResolvedValue([]); // no overlap

      mockPrisma.feeRule.create.mockImplementation((args: any) => ({
        id: 'rule-1',
        ...args.data,
        category: { code: 'TUITION', displayName: 'Tuition Fee', chargeKind: 'RECURRING' },
        class: { name: 'Grade 1' },
        academicSession: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const rule = await service.createRule(
        schoolA,
        {
          categoryId: 'cat-1',
          classId: 'class-1',
          amount: 900,
          effectiveFrom: '2026-04-01',
          recurrencePolicy: 'MONTHLY',
        },
        mockActor,
      );

      expect(rule.id).toBe('rule-1');
      expect(rule.amount).toBe(900);
      expect(rule.categoryCode).toBe('TUITION');
      expect(rule.className).toBe('Grade 1');
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'FEE_RULE_CREATE' }),
      );
    });
  });

  describe('TASK-012-BE02: Tenant Isolation', () => {
    it('throws NotFoundException if updating category belonging to another school', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCategory(schoolA, 'cat-from-school-b', {
          displayName: 'Hacked',
          version: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if creating rule for category belonging to another school', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.createRule(schoolA, {
          categoryId: 'cat-foreign',
          amount: 500,
          effectiveFrom: '2026-04-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('TASK-012-BE03: Overlapping Rule Conflict Prevention', () => {
    it('throws ConflictException when active rule exists with overlapping dates for same scope', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue({ id: 'cat-1', schoolId: schoolA });
      mockPrisma.feeRule.findMany.mockResolvedValue([
        {
          id: 'existing-rule-1',
          schoolId: schoolA,
          categoryId: 'cat-1',
          classId: null,
          academicSessionId: null,
          effectiveFrom: new Date('2026-04-01'),
          validUntil: new Date('2026-12-31'),
          status: 'ACTIVE',
        },
      ]);

      await expect(
        service.createRule(schoolA, {
          categoryId: 'cat-1',
          amount: 1000,
          effectiveFrom: '2026-06-01',
          validUntil: '2027-03-31',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('TASK-012-BE04: Optimistic Locking on Concurrent Edits', () => {
    it('throws ConflictException when updating fee category with stale version', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue({
        id: 'cat-1',
        schoolId: schoolA,
        version: 2, // database has version 2
      });

      await expect(
        service.updateCategory(schoolA, 'cat-1', {
          displayName: 'Updated Tuition',
          version: 1, // client provides stale version 1
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when updating fee rule with stale version', async () => {
      mockPrisma.feeRule.findFirst.mockResolvedValue({
        id: 'rule-1',
        schoolId: schoolA,
        version: 3,
        category: { code: 'TUITION' },
      });

      await expect(
        service.updateRule(schoolA, 'rule-1', {
          amount: 1200,
          version: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('TASK-012-BE05: Rule Resolution Hierarchy', () => {
    it('resolves class-specific rule over school-wide fallback', async () => {
      const activeCat = { id: 'cat-1', code: 'TUITION', displayName: 'Tuition', status: 'ACTIVE', chargeKind: 'RECURRING' };
      mockPrisma.feeCategory.findMany.mockResolvedValue([activeCat]);

      const schoolWideRule = {
        id: 'rule-general',
        schoolId: schoolA,
        categoryId: 'cat-1',
        classId: null,
        academicSessionId: null,
        amount: 800,
        effectiveFrom: new Date('2026-01-01'),
        validUntil: null,
        recurrencePolicy: 'MONTHLY',
        status: 'ACTIVE',
        version: 1,
        category: activeCat,
      };

      const classRule = {
        id: 'rule-grade10',
        schoolId: schoolA,
        categoryId: 'cat-1',
        classId: 'class-grade-10',
        academicSessionId: null,
        amount: 1500,
        effectiveFrom: new Date('2026-01-01'),
        validUntil: null,
        recurrencePolicy: 'MONTHLY',
        status: 'ACTIVE',
        version: 1,
        category: activeCat,
        class: { name: 'Grade 10' },
      };

      mockPrisma.feeRule.findMany.mockResolvedValue([schoolWideRule, classRule]);

      // Query for Grade 10: should get 1500
      const resolvedGrade10 = await service.resolveApplicableRules(schoolA, {
        classId: 'class-grade-10',
        asOfDate: '2026-05-01',
      });
      expect(resolvedGrade10).toHaveLength(1);
      expect(resolvedGrade10[0].amount).toBe(1500);

      // Query for another class: should fall back to school-wide 800
      const resolvedOther = await service.resolveApplicableRules(schoolA, {
        classId: 'class-other',
        asOfDate: '2026-05-01',
      });
      expect(resolvedOther).toHaveLength(1);
      expect(resolvedOther[0].amount).toBe(800);
    });
  });

  describe('TASK-012-BE06: Negative Validation and Edge Cases', () => {
    it('throws ConflictException on duplicate category code within same school', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue({
        id: 'cat-existing',
        code: 'REGISTRATION',
      });

      await expect(
        service.createCategory(schoolA, {
          code: 'registration',
          displayName: 'New Registration',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if validUntil is before effectiveFrom', async () => {
      mockPrisma.feeCategory.findFirst.mockResolvedValue({ id: 'cat-1', schoolId: schoolA });

      await expect(
        service.createRule(schoolA, {
          categoryId: 'cat-1',
          amount: 500,
          effectiveFrom: '2026-06-01',
          validUntil: '2026-05-01', // Before effectiveFrom
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
