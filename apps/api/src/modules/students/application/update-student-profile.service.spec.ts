import { UpdateStudentProfileService } from './update-student-profile.service';
import type { SessionActor } from '@custom-school/contracts';

describe('UpdateStudentProfileService', () => {
  let service: UpdateStudentProfileService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockValidator: any;
  let mockCrypto: any;
  let mockFeesFacade: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrisma)),
      student: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      transportAssignment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      transportStoppage: {
        findFirst: jest.fn(),
      },
      studentEnrollment: {
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    mockValidator = {
      validateDob: jest.fn((d) => new Date(d)),
      validateConcession: jest.fn(),
      validateAcademics: jest.fn().mockResolvedValue(undefined),
      validatePhotoFile: jest.fn().mockResolvedValue(undefined),
    };

    mockCrypto = {
      encryptJson: jest.fn(),
      decryptJson: jest.fn(),
    };

    mockFeesFacade = {
      syncConcessionDues: jest.fn().mockResolvedValue(undefined),
      ensureStudentDues: jest.fn().mockResolvedValue(undefined),
    };

    service = new UpdateStudentProfileService(
      mockPrisma,
      mockAudit,
      mockValidator,
      mockCrypto,
      mockFeesFacade
    );
  });

  it('triggers syncConcessionDues when student concession is updated', async () => {
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'stu-1',
      version: 1,
      concessionType: 'NONE',
      concessionValue: 0,
      transportRequired: false,
      enrollments: [{ classId: 'cls-1', sectionId: 'sec-1', status: 'ACTIVE' }],
    });
    mockPrisma.student.update.mockResolvedValue({
      id: 'stu-1',
      version: 2,
      updatedAt: new Date(),
    });

    const res = await service.update(actor, 'stu-1', {
      version: 1,
      concession: {
        type: 'PERCENTAGE',
        value: 25,
      },
    });

    expect(res.version).toBe(2);
    expect(mockFeesFacade.syncConcessionDues).toHaveBeenCalledWith({
      schoolId: 'SCH-TEST-001',
      studentId: 'stu-1',
    });
  });

  it('ends active transport assignments when transportRequired is set to false', async () => {
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'stu-2',
      version: 1,
      concessionType: 'NONE',
      concessionValue: 0,
      transportRequired: true,
      enrollments: [{ classId: 'cls-1', sectionId: 'sec-1', status: 'ACTIVE' }],
    });
    mockPrisma.transportAssignment.findMany.mockResolvedValue([
      { id: 'asgn-1', studentId: 'stu-2', status: 'ACTIVE' },
    ]);
    mockPrisma.transportAssignment.update.mockResolvedValue({ id: 'asgn-1', status: 'ENDED' });
    mockPrisma.student.update.mockResolvedValue({
      id: 'stu-2',
      version: 2,
      updatedAt: new Date(),
    });

    await service.update(actor, 'stu-2', {
      version: 1,
      transportRequired: false,
    });

    expect(mockPrisma.transportAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'asgn-1' },
        data: expect.objectContaining({
          status: 'ENDED',
          endedReason: 'Transport requirement removed in student profile',
        }),
      })
    );
    expect(mockPrisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transportRequired: false,
          transportSetupState: 'NOT_REQUIRED',
        }),
      })
    );
  });

  it('activates transport assignment when transportRequired is true with stoppageId', async () => {
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'stu-3',
      version: 1,
      concessionType: 'NONE',
      concessionValue: 0,
      transportRequired: false,
      enrollments: [{ classId: 'cls-1', sectionId: 'sec-1', status: 'ACTIVE' }],
    });
    mockPrisma.transportStoppage.findFirst.mockResolvedValue({
      id: 'stop-1',
      transportId: 'trans-1',
      transport: { status: 'ACTIVE' },
    });
    mockPrisma.transportAssignment.create.mockResolvedValue({ id: 'asgn-new', status: 'ACTIVE' });
    mockPrisma.student.update.mockResolvedValue({
      id: 'stu-3',
      version: 2,
      updatedAt: new Date(),
    });

    await service.update(actor, 'stu-3', {
      version: 1,
      transportRequired: true,
      stoppageId: 'stop-1',
    });

    expect(mockPrisma.transportAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'SCH-TEST-001',
          studentId: 'stu-3',
          transportId: 'trans-1',
          stoppageId: 'stop-1',
          status: 'ACTIVE',
        }),
      })
    );
    expect(mockPrisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transportRequired: true,
          transportSetupState: 'ACTIVE',
        }),
      })
    );
  });

  it('auto-activates previous transport stoppage when transportRequired is set to true without explicit stoppageId', async () => {
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'stu-4',
      version: 1,
      concessionType: 'NONE',
      concessionValue: 0,
      transportRequired: false,
      enrollments: [{ classId: 'cls-1', sectionId: 'sec-1', status: 'ACTIVE' }],
    });
    // Active assignment: none
    mockPrisma.transportAssignment.findFirst
      .mockResolvedValueOnce(null) // activeAsgn
      .mockResolvedValueOnce({    // prevAsgn
        id: 'asgn-old',
        transportId: 'trans-prev',
        stoppageId: 'stop-prev',
        transport: { status: 'ACTIVE' },
        stoppage: { status: 'ACTIVE' },
      })
      .mockResolvedValueOnce(null); // existingActive check
    mockPrisma.transportAssignment.create.mockResolvedValue({ id: 'asgn-reactivated', status: 'ACTIVE' });
    mockPrisma.student.update.mockResolvedValue({
      id: 'stu-4',
      version: 2,
      updatedAt: new Date(),
    });

    await service.update(actor, 'stu-4', {
      version: 1,
      transportRequired: true,
    });

    expect(mockPrisma.transportAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'SCH-TEST-001',
          studentId: 'stu-4',
          transportId: 'trans-prev',
          stoppageId: 'stop-prev',
          status: 'ACTIVE',
        }),
      })
    );
    expect(mockPrisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transportRequired: true,
          transportSetupState: 'ACTIVE',
        }),
      })
    );
  });

  it('auto-activates default school active stoppage when new transport student has no stoppageId and no history', async () => {
    mockPrisma.student.findFirst.mockResolvedValue({
      id: 'stu-5',
      version: 1,
      concessionType: 'NONE',
      concessionValue: 0,
      transportRequired: false,
      enrollments: [{ classId: 'cls-1', sectionId: 'sec-1', status: 'ACTIVE' }],
    });
    mockPrisma.transportAssignment.findFirst
      .mockResolvedValueOnce(null) // activeAsgn
      .mockResolvedValueOnce(null) // prevAsgn
      .mockResolvedValueOnce(null); // existingActive check
    mockPrisma.transportStoppage.findFirst.mockResolvedValue({
      id: 'stop-default',
      transportId: 'trans-default',
      transport: { status: 'ACTIVE' },
    });
    mockPrisma.transportAssignment.create.mockResolvedValue({ id: 'asgn-default', status: 'ACTIVE' });
    mockPrisma.student.update.mockResolvedValue({
      id: 'stu-5',
      version: 2,
      updatedAt: new Date(),
    });

    await service.update(actor, 'stu-5', {
      version: 1,
      transportRequired: true,
    });

    expect(mockPrisma.transportAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          schoolId: 'SCH-TEST-001',
          studentId: 'stu-5',
          transportId: 'trans-default',
          stoppageId: 'stop-default',
          status: 'ACTIVE',
        }),
      })
    );
    expect(mockPrisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transportRequired: true,
          transportSetupState: 'ACTIVE',
        }),
      })
    );
  });
});
