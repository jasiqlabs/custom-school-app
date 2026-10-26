import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ChangeStudentEnrollmentService } from './change-student-enrollment.service';
import type { ChangeStudentEnrollmentInput, SessionActor } from '@custom-school/contracts';

describe('ChangeStudentEnrollmentService', () => {
  let service: ChangeStudentEnrollmentService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockFeesFacade: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  const activeSession = {
    id: 'ses-2026',
    schoolId: 'SCH-TEST-001',
    code: '2026-2027',
    label: 'Academic Year 2026-2027',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2027-03-31T23:59:59.000Z'),
    status: 'ACTIVE',
  };

  const student = {
    id: 'stu-1',
    schoolId: 'SCH-TEST-001',
    studentCode: 'SCH-0001',
    fullName: 'Rahul Sharma',
    version: 3,
  };

  const class2A = { id: 'cls-2', name: 'Class 2', schoolId: 'SCH-TEST-001', status: 'ACTIVE' };
  const secA = { id: 'sec-a', name: 'A', classId: 'cls-2', schoolId: 'SCH-TEST-001', status: 'ACTIVE' };
  const class3B = { id: 'cls-3', name: 'Class 3', schoolId: 'SCH-TEST-001', status: 'ACTIVE' };
  const secB = { id: 'sec-b', name: 'B', classId: 'cls-3', schoolId: 'SCH-TEST-001', status: 'ACTIVE' };

  const currentSegment = {
    id: 'enr-seg-1',
    schoolId: 'SCH-TEST-001',
    studentId: 'stu-1',
    academicSessionId: 'ses-2026',
    classId: 'cls-2',
    sectionId: 'sec-a',
    classNameSnapshot: 'Class 2',
    sectionNameSnapshot: 'A',
    status: 'ACTIVE',
    startedAt: new Date('2026-04-01T00:00:00.000Z'),
    validFrom: new Date('2026-04-01T00:00:00.000Z'),
    validUntil: null,
    enrollmentVersion: 1,
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrisma)),
      student: {
        findFirst: jest.fn().mockResolvedValue({ ...student }),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          ...student,
          ...data,
          version: student.version + (data.version?.increment || 1),
        })),
      },
      class: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'cls-3' && where.schoolId === 'SCH-TEST-001') return Promise.resolve(class3B);
          if (where.id === 'cls-2' && where.schoolId === 'SCH-TEST-001') return Promise.resolve(class2A);
          return Promise.resolve(null);
        }),
      },
      section: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'sec-b' && where.classId === 'cls-3' && where.schoolId === 'SCH-TEST-001') return Promise.resolve(secB);
          if (where.id === 'sec-a' && where.classId === 'cls-2' && where.schoolId === 'SCH-TEST-001') return Promise.resolve(secA);
          return Promise.resolve(null);
        }),
      },
      academicSession: {
        findFirst: jest.fn().mockResolvedValue({ ...activeSession }),
      },
      studentEnrollment: {
        findFirst: jest.fn().mockResolvedValue({ ...currentSegment }),
        update: jest.fn().mockImplementation(({ where, data }) => ({
          ...currentSegment,
          ...data,
        })),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'enr-seg-2',
          ...data,
        })),
      },
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    mockFeesFacade = {
      ensureStudentDues: jest.fn().mockResolvedValue(undefined),
    };

    service = new ChangeStudentEnrollmentService(mockPrisma, mockAudit, mockFeesFacade);
  });

  it('UC1: creates dated segment on 2026-10-15 and closes prior segment at 2026-10-14', async () => {
    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-3',
      sectionId: 'sec-b',
      effectiveDate: '2026-10-15',
      expectedVersion: 3,
      reason: 'Promoted to Class 3B',
    };

    const res = await service.changeEnrollment(actor, 'stu-1', input);

    expect(res.id).toBe('enr-seg-2');
    expect(res.className).toBe('Class 3');
    expect(res.sectionName).toBe('B');
    expect(res.validFrom).toBe('2026-10-15');
    expect(res.enrollmentVersion).toBe(2);
    expect(res.studentVersion).toBe(4);

    // Old segment should be completed with validUntil 2026-10-14
    expect(mockPrisma.studentEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enr-seg-1' },
        data: expect.objectContaining({
          status: 'ENDED',
          endedReason: 'Promoted to Class 3B',
          validUntil: expect.any(Date),
        }),
      })
    );

    const updateCall = mockPrisma.studentEnrollment.update.mock.calls[0][0];
    const validUntilDate: Date = updateCall.data.validUntil;
    expect(validUntilDate.toISOString().slice(0, 10)).toBe('2026-10-14');

    // Audit and dues updated
    expect(mockAudit.append).toHaveBeenCalled();
    expect(mockFeesFacade.ensureStudentDues).toHaveBeenCalledWith({
      schoolId: 'SCH-TEST-001',
      studentId: 'stu-1',
    });
  });

  it('UC2: preserves original label snapshot and increments version', async () => {
    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-3',
      sectionId: 'sec-b',
      effectiveDate: '2026-10-15',
    };

    await service.changeEnrollment(actor, 'stu-1', input);

    expect(mockPrisma.studentEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          classNameSnapshot: 'Class 3',
          sectionNameSnapshot: 'B',
          enrollmentVersion: 2,
        }),
      })
    );
  });

  it('UC3: blocks backdated or overlapping effective date with 409 ConflictException', async () => {
    // Current segment started 2026-04-01; effectiveDate 2026-04-01 or earlier is overlapping
    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-3',
      sectionId: 'sec-b',
      effectiveDate: '2026-04-01',
    };

    await expect(service.changeEnrollment(actor, 'stu-1', input)).rejects.toThrow(ConflictException);
    expect(mockPrisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it('UC4: blocks modification if academic session is CLOSED', async () => {
    mockPrisma.academicSession.findFirst.mockResolvedValue({
      ...activeSession,
      status: 'CLOSED',
    });

    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-3',
      sectionId: 'sec-b',
      effectiveDate: '2026-10-15',
    };

    await expect(service.changeEnrollment(actor, 'stu-1', input)).rejects.toThrow(ConflictException);
    expect(mockPrisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it('UC5: blocks effective date outside academic session date bounds', async () => {
    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-3',
      sectionId: 'sec-b',
      effectiveDate: '2028-01-01', // Out of session bounds (ends 2027-03-31)
    };

    await expect(service.changeEnrollment(actor, 'stu-1', input)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it('blocks update on concurrent modification / student version mismatch', async () => {
    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-3',
      sectionId: 'sec-b',
      effectiveDate: '2026-10-15',
      expectedVersion: 2, // Student current is 3
    };

    await expect(service.changeEnrollment(actor, 'stu-1', input)).rejects.toThrow(ConflictException);
    expect(mockPrisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it('blocks update if target class belongs to another school (tenant isolation)', async () => {
    mockPrisma.class.findFirst.mockResolvedValue(null);

    const input: ChangeStudentEnrollmentInput = {
      classId: 'cls-other-school',
      sectionId: 'sec-b',
      effectiveDate: '2026-10-15',
    };

    await expect(service.changeEnrollment(actor, 'stu-1', input)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.studentEnrollment.create).not.toHaveBeenCalled();
  });

  it('getEnrollmentAtDate resolves segment valid for the given date', async () => {
    const segmentOct14 = {
      id: 'enr-1',
      validFrom: new Date('2026-04-01'),
      validUntil: new Date('2026-10-14'),
      class: { name: 'Class 2' },
      section: { name: 'A' },
    };

    mockPrisma.studentEnrollment.findFirst.mockResolvedValue(segmentOct14);

    const res = await service.getEnrollmentAtDate('SCH-TEST-001', 'stu-1', '2026-10-14');
    expect(res).toBeDefined();
    expect(res?.class?.name).toBe('Class 2');
    expect(mockPrisma.studentEnrollment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'SCH-TEST-001',
          studentId: 'stu-1',
        }),
      })
    );
  });
});
