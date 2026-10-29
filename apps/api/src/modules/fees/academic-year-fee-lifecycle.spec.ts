import { AcademicSessionsService } from '../platform-admin/academics/academic-sessions.service';
import { FeeCategoriesRulesService } from './application/fee-categories-rules.service';
import { GenerateDuesService } from './application/generate-dues.service';
import { CollectPaymentService } from './application/collect-payment.service';
import { ConfigureFeeService } from './application/configure-fee.service';
import { FeesPublicFacadeImpl } from './facade/fees-public.facade';
import { AdmitCardsService } from '../examination/application/admit-cards.service';
import { ExamContextsService } from '../examination/application/exam-contexts.service';
import { ReceiptNumberAllocator } from './domain/receipt-number-allocator';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { SessionActor } from '@custom-school/contracts';

describe('Academic Year Fee Lifecycle, Billing Rules & Admit Card Clearance (TASK-032, TASK-034, TASK-035)', () => {
  // ---------------------------------------------------------------------------
  // Actors across 2 distinct school tenants
  // ---------------------------------------------------------------------------
  const schoolA = 'SCH-DELHI-001';
  const schoolB = 'SCH-MUMBAI-002';

  const actorSchoolA: SessionActor = {
    userType: 'OPERATOR',
    userId: 'op-delhi-1',
    schoolId: schoolA,
    sessionId: 'sess-delhi-1',
    requestId: 'req-delhi-1',
    role: 'MANAGER',
  };

  const actorSchoolB: SessionActor = {
    userType: 'OPERATOR',
    userId: 'op-mumbai-1',
    schoolId: schoolB,
    sessionId: 'sess-mumbai-1',
    requestId: 'req-mumbai-1',
    role: 'MANAGER',
  };

  // Mocks
  let mockPrisma: any;
  let mockFeesRepo: any;
  let mockAllocator: any;
  let mockAudit: any;
  let mockCrypto: any;
  let mockFileService: any;
  let mockJobService: any;

  // Services under test
  let academicSessionsService: AcademicSessionsService;
  let feeCategoriesRulesService: FeeCategoriesRulesService;
  let configureFeeService: ConfigureFeeService;
  let generateDuesService: GenerateDuesService;
  let collectPaymentService: CollectPaymentService;
  let feesPublicFacade: FeesPublicFacadeImpl;
  let admitCardsService: AdmitCardsService;
  let examContextsService: ExamContextsService;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback: any) => callback(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      school: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === schoolA) return { id: schoolA, status: 'ACTIVE', name: 'Delhi Public Academy' };
          if (where.id === schoolB) return { id: schoolB, status: 'ACTIVE', name: 'Mumbai Grammar High' };
          return null;
        }),
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === schoolA) return { id: schoolA, status: 'ACTIVE', name: 'Delhi Public Academy' };
          if (where.id === schoolB) return { id: schoolB, status: 'ACTIVE', name: 'Mumbai Grammar High' };
          return null;
        }),
      },
      academicSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      class: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      feeCategory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      feeRule: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      classFeeConfig: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      student: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      studentEnrollment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      feeCharge: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      feeDue: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      feePayment: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      feePaymentAllocation: {
        create: jest.fn(),
      },
      examCardContext: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      admitCardIssue: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    mockFeesRepo = {
      findPaymentByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findPaymentById: jest.fn(),
      listDuesByStudent: jest.fn().mockResolvedValue([]),
      findDueByIdForUpdate: jest.fn(),
      findEffectiveConfig: jest.fn(),
      findOutstandingDues: jest.fn().mockResolvedValue([]),
      findPaymentsForDashboard: jest.fn().mockResolvedValue([]),
    };

    mockAllocator = {
      allocateReceiptNumber: jest.fn().mockResolvedValue('REC-2026-00001'),
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    mockCrypto = {
      encryptNullable: jest.fn((val: string) => (val ? `enc_${val}` : null)),
      decryptNullable: jest.fn((val: string) => (val ? val.replace('enc_', '') : null)),
      encryptJson: jest.fn().mockReturnValue({
        ciphertext: 'enc-cipher',
        iv: 'iv',
        authTag: 'tag',
        alg: 'aes-256-gcm',
        keyVersion: 1,
      }),
      decryptJson: jest.fn().mockReturnValue({}),
    };

    mockFileService = {
      saveBuffer: jest.fn().mockResolvedValue({ id: 'file-doc-1' }),
      signedUrl: jest.fn().mockResolvedValue('https://storage.school.test/download'),
      readInternal: jest.fn().mockResolvedValue({
        file: { mime: 'application/pdf' },
        buffer: Buffer.from('%PDF-1.4 Mock Admit Card Content'),
      }),
    };

    mockJobService = {
      createInTransaction: jest.fn().mockResolvedValue({ id: 'job-123' }),
      resetForRetryInTransaction: jest.fn().mockResolvedValue(undefined),
      drainOutbox: jest.fn().mockResolvedValue(undefined),
      dispatch: jest.fn().mockResolvedValue({ jobId: 'job-123' }),
    };

    // Instantiate domain services
    academicSessionsService = new AcademicSessionsService(mockPrisma, mockAudit);
    feeCategoriesRulesService = new FeeCategoriesRulesService(mockPrisma, mockAudit);
    generateDuesService = new GenerateDuesService(mockPrisma, mockFeesRepo, mockAudit);
    configureFeeService = new ConfigureFeeService(mockPrisma, mockFeesRepo, mockAudit, generateDuesService);
    collectPaymentService = new CollectPaymentService(mockPrisma, mockFeesRepo, mockAllocator, mockAudit, generateDuesService);
    feesPublicFacade = new FeesPublicFacadeImpl(mockPrisma, mockFeesRepo, generateDuesService);

    examContextsService = new ExamContextsService(
      mockPrisma,
      mockAudit,
      feesPublicFacade
    );

    admitCardsService = new AdmitCardsService(
      mockPrisma,
      mockCrypto,
      mockFileService,
      mockJobService,
      mockAudit,
      feesPublicFacade
    );
  });

  // ===========================================================================
  // SCENARIO 1: Completed Academic Year with All Fees Paid Shows No Future Months
  // ===========================================================================
  describe('Scenario 1: Completed academic year with all applicable fees paid shows no future-month payment options', () => {
    it('does not generate or return future-month charges when completed year fees are fully cleared', async () => {
      const studentId = 'stu-delhi-001';
      const sessionDelhi2026 = {
        id: 'sess-delhi-2026',
        schoolId: schoolA,
        code: '2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T23:59:59.999Z'),
        status: 'CLOSED',
        version: 2,
      };

      // Delhi student enrolled in closed session
      mockPrisma.student.findFirst.mockResolvedValue({
        id: studentId,
        schoolId: schoolA,
        studentCode: 'DEL-001',
        fullName: 'Aarav Sharma',
        status: 'ACTIVE',
        concessionType: 'NONE',
        concessionValue: 0,
        enrollments: [
          {
            status: 'ACTIVE',
            class: { id: 'cls-1', name: 'Class 1' },
            academicSession: sessionDelhi2026,
          },
        ],
      });

      // All applicable charges through March 2027 are PAID
      const paidCharges = [
        {
          id: 'chg-1',
          schoolId: schoolA,
          studentId,
          originRef: '2027-02',
          baseAmount: 2000,
          concessionAmount: 0,
          netAmount: 2000,
          paidAmount: 2000,
          balance: 0,
          status: 'PAID',
          category: { code: 'TUITION', displayName: 'Tuition Fee' },
          class: { id: 'cls-1', name: 'Class 1' },
          createdAt: new Date('2027-02-01'),
          updatedAt: new Date('2027-02-01'),
        },
        {
          id: 'chg-2',
          schoolId: schoolA,
          studentId,
          originRef: '2027-03',
          baseAmount: 2000,
          concessionAmount: 0,
          netAmount: 2000,
          paidAmount: 2000,
          balance: 0,
          status: 'PAID',
          category: { code: 'TUITION', displayName: 'Tuition Fee' },
          class: { id: 'cls-1', name: 'Class 1' },
          createdAt: new Date('2027-03-01'),
          updatedAt: new Date('2027-03-01'),
        },
      ];
      mockPrisma.feeCharge.findMany.mockResolvedValue(paidCharges);
      mockFeesRepo.listDuesByStudent.mockResolvedValue([]);

      const duesResult = await collectPaymentService.getStudentDues(schoolA, studentId);

      // Verify no future charges (e.g. 2027-04 or beyond) are created
      expect(mockPrisma.feeCharge.create).not.toHaveBeenCalled();
      expect(mockPrisma.feeDue.create).not.toHaveBeenCalled();

      // All items returned are fully cleared (balance = 0)
      const pendingItems = duesResult.dues.filter((i: any) => i.balance > 0);
      expect(pendingItems).toHaveLength(0);
      expect(duesResult.dues.every((c: any) => c.feeMonth <= '2027-03')).toBe(true);
    });
  });

  // ===========================================================================
  // SCENARIO 2: Completed Academic Year with Genuine Unpaid Dues Retains Balance
  // ===========================================================================
  describe('Scenario 2: Completed academic year with genuine unpaid dues retains correct balance without new future charges', () => {
    it('preserves genuine historical unpaid dues from completed year and does not generate unconfigured future charges', async () => {
      const studentId = 'stu-delhi-002';
      const sessionDelhi2026 = {
        id: 'sess-delhi-2026',
        schoolId: schoolA,
        code: '2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T23:59:59.999Z'),
        status: 'CLOSED',
        version: 2,
      };

      mockPrisma.student.findFirst.mockResolvedValue({
        id: studentId,
        schoolId: schoolA,
        studentCode: 'DEL-002',
        fullName: 'Priya Verma',
        status: 'ACTIVE',
        concessionType: 'NONE',
        concessionValue: 0,
        enrollments: [
          {
            status: 'ACTIVE',
            class: { id: 'cls-1', name: 'Class 1' },
            academicSession: sessionDelhi2026,
          },
        ],
      });

      // Student has unpaid dues for 2027-02 and 2027-03
      const genuineUnpaidCharges = [
        {
          id: 'chg-feb',
          schoolId: schoolA,
          studentId,
          originRef: '2027-02',
          baseAmount: 2000,
          concessionAmount: 0,
          netAmount: 2000,
          paidAmount: 500,
          balance: 1500,
          status: 'PARTIAL',
          category: { code: 'TUITION', displayName: 'Tuition Fee' },
          class: { id: 'cls-1', name: 'Class 1' },
          createdAt: new Date('2027-02-01'),
          updatedAt: new Date('2027-02-01'),
        },
        {
          id: 'chg-mar',
          schoolId: schoolA,
          studentId,
          originRef: '2027-03',
          baseAmount: 2000,
          concessionAmount: 0,
          netAmount: 2000,
          paidAmount: 0,
          balance: 2000,
          status: 'UNPAID',
          category: { code: 'TUITION', displayName: 'Tuition Fee' },
          class: { id: 'cls-1', name: 'Class 1' },
          createdAt: new Date('2027-03-01'),
          updatedAt: new Date('2027-03-01'),
        },
      ];
      mockPrisma.feeCharge.findMany.mockResolvedValue(genuineUnpaidCharges);
      mockFeesRepo.listDuesByStudent.mockResolvedValue([]);

      const duesResult = await collectPaymentService.getStudentDues(schoolA, studentId);

      const pendingItems = duesResult.dues.filter((i: any) => i.balance > 0);
      expect(pendingItems).toHaveLength(2);
      expect(pendingItems[0].feeMonth).toBe('2027-02');
      expect(pendingItems[0].balance).toBe(1500);
      expect(pendingItems[1].feeMonth).toBe('2027-03');
      expect(pendingItems[1].balance).toBe(2000);

      // Verify no future month beyond 2027-03 exists or was created
      expect(mockPrisma.feeCharge.create).not.toHaveBeenCalled();
      expect(duesResult.dues.some((c: any) => c.feeMonth > '2027-03')).toBe(false);
    });
  });

  // ===========================================================================
  // SCENARIO 3: Creating New Academic Year Reuses Fee Configuration Automatically
  // ===========================================================================
  describe('Scenario 3: Creating a new academic year reuses class-specific and all-classes fee configuration', () => {
    it('automatically copies existing fee rules and class fee configs to new academic session', async () => {
      // Prior session in School A
      const priorSession = {
        id: 'sess-prior-2026',
        schoolId: schoolA,
        code: '2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T23:59:59.999Z'),
        status: 'ACTIVE',
      };

      const tuitionCategory = { id: 'cat-tuition', schoolId: schoolA, code: 'TUITION', displayName: 'Tuition' };
      const examCategory = { id: 'cat-exam', schoolId: schoolA, code: 'EXAM', displayName: 'Exam Fee' };

      // Existing rules in prior session:
      // 1. Class-specific for Class 1 (Tuition ₹2000)
      // 2. Class-specific for Class 2 (Tuition ₹2500)
      // 3. All-classes rule for Exam Fee (Exam ₹1000, classId: null)
      const existingRules = [
        {
          id: 'rule-cls1-tuition',
          schoolId: schoolA,
          categoryId: tuitionCategory.id,
          classId: 'cls-1',
          academicSessionId: priorSession.id,
          amount: 2000,
          recurrencePolicy: 'MONTHLY',
          paymentDueOffset: 10,
          status: 'ACTIVE',
        },
        {
          id: 'rule-cls2-tuition',
          schoolId: schoolA,
          categoryId: tuitionCategory.id,
          classId: 'cls-2',
          academicSessionId: priorSession.id,
          amount: 2500,
          recurrencePolicy: 'MONTHLY',
          paymentDueOffset: 10,
          status: 'ACTIVE',
        },
        {
          id: 'rule-all-exam',
          schoolId: schoolA,
          categoryId: examCategory.id,
          classId: null, // all classes
          academicSessionId: priorSession.id,
          amount: 1000,
          recurrencePolicy: 'PER_TERM',
          paymentDueOffset: 5,
          status: 'ACTIVE',
        },
      ];

      mockPrisma.academicSession.findUnique.mockResolvedValue(null); // code is unique
      mockPrisma.academicSession.findFirst.mockResolvedValue(priorSession); // prior session
      mockPrisma.feeRule.findMany.mockResolvedValue(existingRules);

      mockPrisma.class.findMany.mockResolvedValue([
        { id: 'cls-1', name: 'Class 1', schoolId: schoolA, status: 'ACTIVE' },
        { id: 'cls-2', name: 'Class 2', schoolId: schoolA, status: 'ACTIVE' },
      ]);
      mockPrisma.classFeeConfig.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.classId === 'cls-1') return { id: 'cfg-1', amount: 2000 };
        if (where.classId === 'cls-2') return { id: 'cfg-2', amount: 2500 };
        return null;
      });
      mockPrisma.classFeeConfig.findUnique.mockResolvedValue(null);

      // Create new academic session 2027-28
      const newSessionCreated = {
        id: 'sess-new-2027',
        schoolId: schoolA,
        code: '2027-28',
        label: 'Academic Year 2027-28',
        startDate: new Date('2027-04-01T00:00:00.000Z'),
        endDate: new Date('2028-03-31T23:59:59.999Z'),
        status: 'DRAFT',
        version: 1,
        createdBy: actorSchoolA.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.academicSession.create.mockResolvedValue(newSessionCreated);

      const createdDto = await academicSessionsService.create(actorSchoolA, schoolA, {
        code: '2027-28',
        label: 'Academic Year 2027-28',
        startDate: '2027-04-01',
        endDate: '2028-03-31',
      });

      expect(createdDto.id).toBe('sess-new-2027');

      // Verify that fee rules were cloned for the new session
      expect(mockPrisma.feeRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            academicSessionId: 'sess-new-2027',
            classId: 'cls-1',
            amount: 2000,
          }),
        })
      );
      expect(mockPrisma.feeRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            academicSessionId: 'sess-new-2027',
            classId: 'cls-2',
            amount: 2500,
          }),
        })
      );
      expect(mockPrisma.feeRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            academicSessionId: 'sess-new-2027',
            classId: null, // all classes preserved
            amount: 1000,
          }),
        })
      );

      // Verify ClassFeeConfig was replicated for new session start month
      expect(mockPrisma.classFeeConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            classId: 'cls-1',
            effectiveMonth: '2027-04',
            amount: 2000,
          }),
        })
      );
      expect(mockPrisma.classFeeConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: schoolA,
            classId: 'cls-2',
            effectiveMonth: '2027-04',
            amount: 2500,
          }),
        })
      );
    });
  });

  // ===========================================================================
  // SCENARIO 4: Operator Can Edit Reused Fees and Rules in Fee Management
  // ===========================================================================
  describe('Scenario 4: Authorized operator can edit the new academic year fees and billing rules', () => {
    it('allows operator to adjust cloned rules for the new academic year without affecting the old year', async () => {
      const clonedRuleInNewSession = {
        id: 'rule-cloned-cls2',
        schoolId: schoolA,
        categoryId: 'cat-tuition',
        classId: 'cls-2',
        academicSessionId: 'sess-new-2027',
        amount: 2500,
        effectiveFrom: new Date('2027-04-01T00:00:00.000Z'),
        validUntil: new Date('2028-03-31T23:59:59.999Z'),
        status: 'ACTIVE',
        version: 1,
        category: { code: 'TUITION' },
      };

      mockPrisma.feeRule.findFirst.mockResolvedValue(clonedRuleInNewSession);
      mockPrisma.feeRule.findMany.mockResolvedValue([]); // no overlap conflict
      mockPrisma.feeRule.update.mockResolvedValue({
        ...clonedRuleInNewSession,
        amount: 3000, // adjusted to ₹3000
        version: 2,
      });

      const updatedRule = await feeCategoriesRulesService.updateRule(
        schoolA,
        'rule-cloned-cls2',
        {
          amount: 3000,
          version: 1,
        },
        actorSchoolA
      );

      expect(updatedRule.amount).toBe(3000);
      expect(mockPrisma.feeRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-cloned-cls2' },
          data: expect.objectContaining({
            amount: 3000,
            version: { increment: 1 },
          }),
        })
      );

      // Audit log recorded
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FEE_RULE_UPDATE',
          targetId: 'rule-cloned-cls2',
        })
      );
    });
  });

  // ===========================================================================
  // SCENARIO 5: Class Promotion Applies Correct New-Class Fee Rules
  // ===========================================================================
  describe('Scenario 5: Class promotion or assignment applies the correct new-class fee rules', () => {
    it('charges the promoted student according to the new class fee rule (₹3000) instead of old class rule (₹2000)', async () => {
      const studentId = 'stu-promoted-001';
      const session2027 = {
        id: 'sess-new-2027',
        code: '2027-28',
        startDate: new Date('2027-04-01T00:00:00.000Z'),
        endDate: new Date('2028-03-31T23:59:59.999Z'),
        status: 'ACTIVE',
      };

      // Student is promoted to Class 2
      mockPrisma.student.findFirst.mockResolvedValue({
        id: studentId,
        schoolId: schoolA,
        status: 'ACTIVE',
        concessionType: 'NONE',
        concessionValue: 0,
        admissionDate: '2026-04-01',
        enrollments: [
          {
            status: 'ACTIVE',
            class: { id: 'cls-2', name: 'Class 2' },
            academicSession: session2027,
          },
        ],
      });

      mockPrisma.feeCategory.findMany.mockResolvedValue([
        { id: 'cat-tuition', schoolId: schoolA, code: 'TUITION', displayName: 'Tuition Fee', status: 'ACTIVE' },
      ]);

      // Rules active for 2027-04:
      // Class 1 is ₹2000, Class 2 is ₹3000
      mockPrisma.feeRule.findMany.mockResolvedValue([
        {
          id: 'rule-cls1',
          schoolId: schoolA,
          categoryId: 'cat-tuition',
          classId: 'cls-1',
          academicSessionId: session2027.id,
          amount: 2000,
          status: 'ACTIVE',
          effectiveFrom: new Date('2027-04-01'),
          validUntil: new Date('2028-03-31'),
        },
        {
          id: 'rule-cls2',
          schoolId: schoolA,
          categoryId: 'cat-tuition',
          classId: 'cls-2', // matches student's new class
          academicSessionId: session2027.id,
          amount: 3000,
          status: 'ACTIVE',
          effectiveFrom: new Date('2027-04-01'),
          validUntil: new Date('2028-03-31'),
        },
      ]);

      mockPrisma.feeCharge.findUnique.mockResolvedValue(null);
      mockPrisma.feeCharge.create.mockImplementation(async ({ data }: any) => ({
        id: 'chg-new-c2',
        ...data,
      }));

      const assessed = await generateDuesService.assessChargesForStudent(
        schoolA,
        studentId,
        '2027-04'
      );

      expect(assessed).toHaveLength(1);
      // Evaluated under Class 2 rate: ₹3000
      expect(assessed[0].classId).toBe('cls-2');
      expect(Number(assessed[0].baseAmount)).toBe(3000);
      expect(Number(assessed[0].netAmount)).toBe(3000);
    });
  });

  // ===========================================================================
  // SCENARIO 6: Idempotent - No Duplicate Charges on Academic Transitions
  // ===========================================================================
  describe('Scenario 6: No duplicate charges created when a new academic year or billing configuration is applied', () => {
    it('guarantees idempotency when dues and charges are assessed repeatedly for the same month', async () => {
      const studentId = 'stu-delhi-001';
      const existingCharge = {
        id: 'chg-existing-2027-04',
        schoolId: schoolA,
        studentId,
        categoryId: 'cat-tuition',
        sourceKey: `${schoolA}:${studentId}:TUITION:sess-new-2027-2027-04`,
        originRef: '2027-04',
        baseAmount: 3000,
        paidAmount: 0,
        balance: 3000,
        status: 'UNPAID',
        class: { id: 'cls-2', name: 'Class 2' },
        category: { code: 'TUITION', displayName: 'Tuition Fee' },
      };

      mockPrisma.student.findFirst.mockResolvedValue({
        id: studentId,
        schoolId: schoolA,
        status: 'ACTIVE',
        concessionType: 'NONE',
        concessionValue: 0,
        enrollments: [
          {
            status: 'ACTIVE',
            class: { id: 'cls-2', name: 'Class 2' },
            academicSession: {
              id: 'sess-new-2027',
              code: '2027-28',
              startDate: new Date('2027-04-01T00:00:00.000Z'),
              endDate: new Date('2028-03-31T23:59:59.999Z'),
              status: 'ACTIVE',
            },
          },
        ],
      });

      mockPrisma.feeCategory.findMany.mockResolvedValue([
        { id: 'cat-tuition', schoolId: schoolA, code: 'TUITION', displayName: 'Tuition Fee', status: 'ACTIVE' },
      ]);
      mockPrisma.feeRule.findMany.mockResolvedValue([
        {
          id: 'rule-cls2',
          schoolId: schoolA,
          categoryId: 'cat-tuition',
          classId: 'cls-2',
          academicSessionId: 'sess-new-2027',
          amount: 3000,
          status: 'ACTIVE',
          effectiveFrom: new Date('2027-04-01'),
          validUntil: new Date('2028-03-31'),
        },
      ]);

      // Return existing charge
      mockPrisma.feeCharge.findUnique.mockResolvedValue(existingCharge);
      mockPrisma.feeCharge.update.mockResolvedValue(existingCharge);

      // Re-run assessment
      const results = await generateDuesService.assessChargesForStudent(
        schoolA,
        studentId,
        '2027-04'
      );

      expect(results).toHaveLength(1);
      // create was NOT called again; no duplicate rows
      expect(mockPrisma.feeCharge.create).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SCENARIO 7: February Exam Not Blocked by Non-Applicable/Future March Fee
  // ===========================================================================
  describe('Scenario 7: February examination is not blocked by a March fee that is not applicable or due', () => {
    it('clears student for February admit card when all dues through February are paid, even if March fee exists', async () => {
      const studentId = 'stu-feb-exam-001';

      // Student has paid January and February dues fully.
      // March fee is generated/due on 2027-03-10.
      mockPrisma.feeCharge.findMany.mockResolvedValue([
        {
          id: 'chg-jan',
          schoolId: schoolA,
          studentId,
          originRef: '2027-01',
          dueDate: new Date('2027-01-10'),
          balance: 0,
          status: 'PAID',
          category: { displayName: 'Tuition Fee' },
        },
        {
          id: 'chg-feb',
          schoolId: schoolA,
          studentId,
          originRef: '2027-02',
          dueDate: new Date('2027-02-10'),
          balance: 0,
          status: 'PAID',
          category: { displayName: 'Tuition Fee' },
        },
        {
          id: 'chg-mar',
          schoolId: schoolA,
          studentId,
          originRef: '2027-03', // Future month relative to February examination
          dueDate: new Date('2027-03-10'),
          balance: 2000,
          status: 'UNPAID',
          category: { displayName: 'Tuition Fee' },
        },
      ]);
      mockFeesRepo.listDuesByStudent.mockResolvedValue([]);

      // Examination context: exam starts on 2027-02-15
      const clearance = await feesPublicFacade.checkStudentDocumentClearance({
        schoolId: schoolA,
        studentId,
        cutoffMonth: '2027-02',
        asOfDate: '2027-02-15',
        purpose: 'ADMIT_CARD',
      });

      // Must be cleared because fees up to February are 100% paid
      expect(clearance.cleared).toBe(true);
      expect(clearance.totalOutstanding).toBe(0);
      expect(clearance.unpaidItems).toHaveLength(0);
    });
  });

  // ===========================================================================
  // SCENARIO 8: Unpaid Applicable Previous/Current Dues Block Admit Card with Breakdown
  // ===========================================================================
  describe('Scenario 8: Unpaid applicable previous or current dues block Admit Card issuance with accurate breakdown', () => {
    it('blocks admit card when student has outstanding dues in or before exam month and provides itemized breakdown', async () => {
      const studentId = 'stu-unpaid-001';

      // Examination in February 2027.
      // Student has unpaid balance in January (Tuition ₹1500) and February (Exam Fee ₹500)
      mockPrisma.feeCharge.findMany.mockResolvedValue([
        {
          id: 'chg-jan-unpaid',
          schoolId: schoolA,
          studentId,
          originRef: '2027-01',
          dueDate: new Date('2027-01-10'),
          balance: 1500,
          status: 'PARTIAL',
          category: { displayName: 'Tuition Fee' },
        },
        {
          id: 'chg-feb-unpaid',
          schoolId: schoolA,
          studentId,
          originRef: '2027-02',
          dueDate: new Date('2027-02-10'),
          balance: 500,
          status: 'UNPAID',
          category: { displayName: 'Examination Fee' },
        },
      ]);
      mockFeesRepo.listDuesByStudent.mockResolvedValue([]);

      const clearance = await feesPublicFacade.checkStudentDocumentClearance({
        schoolId: schoolA,
        studentId,
        cutoffMonth: '2027-02',
        asOfDate: '2027-02-15',
        purpose: 'ADMIT_CARD',
      });

      expect(clearance.cleared).toBe(false);
      expect(clearance.totalOutstanding).toBe(2000);
      expect(clearance.unpaidItems).toHaveLength(2);
      expect(clearance.unpaidItems[0].categoryName).toBe('Tuition Fee');
      expect(clearance.unpaidItems[0].balance).toBe(1500);
      expect(clearance.unpaidItems[1].categoryName).toBe('Examination Fee');
      expect(clearance.unpaidItems[1].balance).toBe(500);
      expect(clearance.reasons[0]).toContain('Tuition Fee');
      expect(clearance.reasons[0]).toContain('Examination Fee');
    });
  });

  // ===========================================================================
  // SCENARIO 9: Multi-Student Independence - Fully Paid Students Receive Admit Cards
  // ===========================================================================
  describe('Scenario 9: Fully paid students can receive Admit Cards, regardless of whether other students have pending dues', () => {
    it('successfully issues admit card for paid student while blocking only the indebted student', async () => {
      const examContextId = 'exam-ctx-annual-2027';

      mockPrisma.examCardContext.findFirst.mockResolvedValue({
        id: examContextId,
        schoolId: schoolA,
        academicSessionId: 'sess-delhi-2026',
        classId: 'cls-1',
        title: 'Annual Exam 2027',
        examCode: 'EXAM-2027-01',
        examStart: new Date('2027-02-20T09:00:00.000Z'),
        examEnd: new Date('2027-02-28T12:00:00.000Z'),
        status: 'READY',
        templateVersion: 'standard-v1',
        academicSession: { label: 'Academic Year 2026-27' },
        class: { name: 'Class 1' },
      });

      mockPrisma.academicSession.findFirst.mockResolvedValue({
        id: 'sess-delhi-2026',
        endDate: new Date('2027-03-31'),
      });

      // Enrollment includes student-1 (fully paid) and student-2 (unpaid)
      mockPrisma.studentEnrollment.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.studentId === 'student-paid') {
          return {
            id: 'enr-1',
            studentId: 'student-paid',
            classId: 'cls-1',
            class: { name: 'Class 1' },
            section: { name: 'Section A' },
            student: { fullName: 'Paid Student', studentCode: 'P-01' },
          };
        }
        if (where.studentId === 'student-indebted') {
          return {
            id: 'enr-2',
            studentId: 'student-indebted',
            classId: 'cls-1',
            class: { name: 'Class 1' },
            section: { name: 'Section A' },
            student: { fullName: 'Indebted Student', studentCode: 'I-02' },
          };
        }
        return null;
      });

      // Mock fee charges:
      // student-paid: 0 balance
      // student-indebted: 2000 balance in 2027-02
      mockPrisma.feeCharge.findMany.mockImplementation(async ({ where }: any) => {
        if (where.studentId === 'student-paid') return [];
        if (where.studentId === 'student-indebted') {
          return [
            {
              id: 'chg-debt',
              schoolId: schoolA,
              studentId: 'student-indebted',
              originRef: '2027-02',
              balance: 2000,
              status: 'UNPAID',
              category: { displayName: 'Tuition Fee' },
            },
          ];
        }
        return [];
      });
      mockFeesRepo.listDuesByStudent.mockResolvedValue([]);

      mockPrisma.admitCardIssue.create.mockResolvedValue({
        id: 'issue-paid-1',
        cardUuid: 'uuid-paid-1',
        schoolId: schoolA,
        examContextId,
        studentId: 'student-paid',
        status: 'PROCESSING',
        templateVersion: 'standard-v1',
        jobId: 'job-1',
        issuedAt: new Date(),
      });
      mockPrisma.admitCardIssue.update.mockResolvedValue({
        id: 'issue-paid-1',
        status: 'COMPLETED',
        fileId: 'file-doc-1',
      });

      const issueResult = await admitCardsService.issue(actorSchoolA, schoolA, {
        examContextId,
        studentIds: ['student-paid', 'student-indebted'],
      });

      expect(issueResult.totalRequested).toBe(2);
      expect(issueResult.issuedCount).toBe(1);
      expect(issueResult.blockedCount).toBe(1);

      // Student 1 succeeded
      const s1Res = issueResult.results.find((r) => r.studentId === 'student-paid');
      expect(s1Res?.success).toBe(true);

      // Student 2 was blocked with pending fee message
      const s2Res = issueResult.results.find((r) => r.studentId === 'student-indebted');
      expect(s2Res?.success).toBe(false);
      expect(s2Res?.error).toContain('Outstanding balance of ₹2000.00');
      expect(s2Res?.error).toContain('Tuition Fee');
    });
  });

  // ===========================================================================
  // SCENARIO 10: Fee Collection, Ledgers, Concessions Continue Working
  // ===========================================================================
  describe('Scenario 10: Fee collection, student ledgers, receipts, and concessions continue working correctly', () => {
    it('records payment, allocates receipt, updates balance, and applies concession accurately', async () => {
      const studentId = 'stu-concess-001';
      const dueId = 'due-active-01';

      mockPrisma.student.findFirst.mockResolvedValue({
        id: studentId,
        schoolId: schoolA,
        studentCode: 'DEL-010',
        fullName: 'Rohit Gupta',
        status: 'ACTIVE',
        concessionType: 'PERCENTAGE',
        concessionValue: 20, // 20% concession
        enrollments: [
          {
            status: 'ACTIVE',
            class: { id: 'cls-1', name: 'Class 1' },
            academicSession: {
              id: 'sess-active',
              code: '2026-27',
              startDate: new Date('2026-04-01'),
              endDate: new Date('2027-03-31'),
              status: 'ACTIVE',
            },
          },
        ],
      });

      const lockedDue = {
        id: dueId,
        school_id: schoolA,
        student_id: studentId,
        class_id: 'cls-1',
        fee_month: '2026-06',
        base_amount: 2000,
        concession_amount: 400,
        net_due: 1600,
        paid_amount: 0,
        balance: 1600,
        status: 'UNPAID',
      };
      mockFeesRepo.findDueByIdForUpdate.mockResolvedValue(lockedDue);

      mockPrisma.feePayment.create.mockResolvedValue({
        id: 'pay-001',
        receiptNumber: 'REC-2026-00001',
        schoolId: schoolA,
        studentId,
        studentCodeSnapshot: 'DEL-010',
        studentNameSnapshot: 'Rohit Gupta',
        amount: 1600,
        mode: 'CASH',
        paymentDate: new Date('2026-06-15'),
        status: 'ACTIVE',
      });

      mockPrisma.feeDue.update.mockResolvedValue({
        id: dueId,
        paidAmount: 1600,
        balance: 0,
        status: 'PAID',
      });

      mockPrisma.feeCategory.findFirst.mockResolvedValue({
        id: 'cat-tuition',
        code: 'TUITION',
        displayName: 'Tuition Fee',
      });
      mockPrisma.feeCharge.findFirst.mockResolvedValue({
        id: 'chg-tuition-06',
        studentId,
        category: { code: 'TUITION' },
      });
      mockPrisma.feeCharge.update.mockResolvedValue({});
      mockPrisma.feePaymentAllocation.create.mockResolvedValue({});

      mockFeesRepo.findPaymentById.mockResolvedValue({
        id: 'pay-001',
        receiptNumber: 'REC-2026-00001',
        schoolId: schoolA,
        studentId,
        studentCodeSnapshot: 'DEL-010',
        studentNameSnapshot: 'Rohit Gupta',
        amount: 1600,
        mode: 'CASH',
        paymentDate: new Date('2026-06-15'),
        status: 'ACTIVE',
        createdAt: new Date(),
        due: { feeMonth: '2026-06', netDue: 1600, paidAmount: 1600, balance: 0 },
        school: { name: 'Delhi Public Academy' },
        allocations: [],
      });

      const receipt = await collectPaymentService.collectPayment(actorSchoolA, {
        studentId,
        dueId,
        amount: 1600,
        mode: 'CASH',
        paymentDate: '2026-06-15',
        idempotencyKey: 'idem-pay-001',
      });

      expect(receipt.receiptNumber).toBe('REC-2026-00001');
      expect(receipt.amountPaidThisReceipt).toBe(1600);
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FEE_PAYMENT_RECORDED',
          schoolId: schoolA,
        })
      );
    });
  });

  // ===========================================================================
  // SCENARIO 11: Multitenancy & School-Level Data Isolation
  // ===========================================================================
  describe('Scenario 11: School-level tenant isolation remains intact', () => {
    it('strictly isolates configurations, rules, and records between School A and School B', async () => {
      // Setup School B (Mumbai: June 2026 to February 2027)
      const sessionMumbai = {
        id: 'sess-mumbai-2026',
        schoolId: schoolB,
        code: '2026-27-MUM',
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2027-02-28T23:59:59.999Z'),
        status: 'ACTIVE',
      };

      // Mock rules isolated by schoolId
      mockPrisma.feeRule.findMany.mockImplementation(async ({ where }: any) => {
        if (where.schoolId === schoolA) {
          return [
            {
              id: 'rule-delhi-1',
              schoolId: schoolA,
              amount: 2000,
              effectiveFrom: new Date('2026-04-01'),
              validUntil: null,
              recurrencePolicy: 'MONTHLY',
              version: 1,
              status: 'ACTIVE',
              category: { code: 'TUITION', displayName: 'Tuition Fee' },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        }
        if (where.schoolId === schoolB) {
          return [
            {
              id: 'rule-mumbai-1',
              schoolId: schoolB,
              amount: 4500, // Mumbai has higher tuition
              effectiveFrom: new Date('2026-06-01'),
              validUntil: null,
              recurrencePolicy: 'MONTHLY',
              version: 1,
              status: 'ACTIVE',
              category: { code: 'TUITION', displayName: 'Tuition Fee' },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        }
        return [];
      });

      // School A operator lists rules
      const rulesA = await feeCategoriesRulesService.listRules(schoolA, {});
      expect(rulesA).toHaveLength(1);
      expect(rulesA[0].schoolId).toBe(schoolA);
      expect(rulesA[0].amount).toBe(2000);

      // School B operator lists rules
      const rulesB = await feeCategoriesRulesService.listRules(schoolB, {});
      expect(rulesB).toHaveLength(1);
      expect(rulesB[0].schoolId).toBe(schoolB);
      expect(rulesB[0].amount).toBe(4500);

      // School A operator attempting to update School B rule receives NotFoundException
      mockPrisma.feeRule.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.id === 'rule-mumbai-1' && where.schoolId === schoolA) {
          return null; // isolated
        }
        return null;
      });

      await expect(
        feeCategoriesRulesService.updateRule(
          schoolA, // Actor belongs to School A
          'rule-mumbai-1', // Target rule belongs to School B
          { amount: 5000, version: 1 },
          actorSchoolA
        )
      ).rejects.toThrow(NotFoundException);

      // School B operator attempting to download School A admit card receives 404
      mockPrisma.admitCardIssue.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.id === 'issue-delhi-1' && where.schoolId === schoolB) {
          return null; // isolated
        }
        return null;
      });

      await expect(
        admitCardsService.download(schoolB, 'issue-delhi-1')
      ).rejects.toMatchObject({
        code: 'ERR_ADMIT_CARD_NOT_FOUND',
      });
    });
  });
});
