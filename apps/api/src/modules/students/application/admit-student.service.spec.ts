import { AdmitStudentService } from './admit-student.service';
import { BadRequestException } from '@nestjs/common';
import type { SessionActor, StudentAdmissionInput } from '@custom-school/contracts';

describe('AdmitStudentService', () => {
  let service: AdmitStudentService;
  let mockPrisma: any;
  let mockCrypto: any;
  let mockAudit: any;
  let mockAllocator: any;
  let mockValidator: any;
  let mockFeesFacade: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  const baseInput: StudentAdmissionInput = {
    studentCodeMode: 'AUTO',
    fullName: 'Test Pupil',
    fatherName: 'Father Name',
    motherName: 'Mother Name',
    dateOfBirth: '2015-05-10',
    gender: 'BOY',
    address: '123 Test St',
    phone: '9876543210',
    emergencyContact: '9876543210',
    emergencyContactRelation: 'Father',
    classId: 'cls-1',
    sectionId: 'sec-1',
    concession: { type: 'NONE', value: 0 },
    transportRequired: false,
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (callback) => callback(mockPrisma)),
      student: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'stu-admit-1',
          ...data,
        })),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      studentPrivateProfile: {
        create: jest.fn().mockResolvedValue({ id: 'priv-1' }),
      },
      studentEnrollment: {
        create: jest.fn().mockResolvedValue({ id: 'enr-1' }),
      },
      academicSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 'ses-active-1', name: '2026-2027' }),
      },
      class: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cls-1', name: 'Grade 1' }),
      },
      section: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sec-1', name: 'A' }),
      },
    };

    mockCrypto = {
      encryptJson: jest.fn().mockReturnValue({ keyVersion: 'v1', ciphertext: 'enc-xyz' }),
    };

    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };

    mockAllocator = {
      allocateAutoCode: jest.fn().mockResolvedValue('SCH-0001'),
      normalizeCode: jest.fn((c) => c.toUpperCase()),
    };

    mockValidator = {
      validateDob: jest.fn(() => new Date('2015-05-10')),
      validateConcession: jest.fn(),
      validateAcademics: jest.fn().mockResolvedValue(undefined),
      validatePhotoFile: jest.fn().mockResolvedValue(undefined),
      validateAadhaar: jest.fn(),
    };

    mockFeesFacade = {
      ensureStudentDues: jest.fn().mockResolvedValue(undefined),
    };

    service = new AdmitStudentService(
      mockPrisma,
      mockCrypto,
      mockAudit,
      mockAllocator,
      mockValidator,
      mockFeesFacade
    );
  });

  it('admits student with blank/null Aadhaar and sets aadhaarLast4 to null', async () => {
    const input: StudentAdmissionInput = {
      ...baseInput,
      aadhaarNumber: undefined,
    };

    const res = await service.admit(actor, input);

    expect(res.id).toBe('stu-admit-1');
    expect(mockValidator.validateAadhaar).not.toHaveBeenCalled();
    expect(mockCrypto.encryptJson).toHaveBeenCalledWith(
      expect.objectContaining({
        aadhaarNumber: null,
      }),
      { schoolId: 'SCH-TEST-001', studentId: 'stu-admit-1' }
    );
    expect(mockPrisma.studentPrivateProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aadhaarLast4: null,
        }),
      })
    );
  });

  it('admits student with valid Aadhaar and sets aadhaarLast4 correctly', async () => {
    mockValidator.validateAadhaar.mockReturnValue({ clean: '999999990019', last4: '0019' });
    const input: StudentAdmissionInput = {
      ...baseInput,
      aadhaarNumber: '999999990019',
    };

    const res = await service.admit(actor, input);

    expect(res.id).toBe('stu-admit-1');
    expect(mockValidator.validateAadhaar).toHaveBeenCalledWith('999999990019');
    expect(mockCrypto.encryptJson).toHaveBeenCalledWith(
      expect.objectContaining({
        aadhaarNumber: '999999990019',
      }),
      { schoolId: 'SCH-TEST-001', studentId: 'stu-admit-1' }
    );
    expect(mockPrisma.studentPrivateProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aadhaarLast4: '0019',
        }),
      })
    );
  });

  it('rejects admission when non-blank Aadhaar fails checksum validation', async () => {
    mockValidator.validateAadhaar.mockImplementation(() => {
      throw new BadRequestException('Invalid Aadhaar number');
    });
    const input: StudentAdmissionInput = {
      ...baseInput,
      aadhaarNumber: '123456789012',
    };

    await expect(service.admit(actor, input)).rejects.toThrow(BadRequestException);
    expect(mockPrisma.student.create).not.toHaveBeenCalled();
  });

  it('links active academic session and records class and section snapshots in enrollment', async () => {
    const input: StudentAdmissionInput = { ...baseInput };

    const res = await service.admit(actor, input);

    expect(res.id).toBe('stu-admit-1');
    expect(mockPrisma.academicSession.findFirst).toHaveBeenCalledWith({
      where: {
        schoolId: 'SCH-TEST-001',
        status: 'ACTIVE',
      },
    });
    expect(mockPrisma.studentEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          academicSessionId: 'ses-active-1',
          classNameSnapshot: 'Grade 1',
          sectionNameSnapshot: 'A',
          enrollmentVersion: 1,
        }),
      })
    );
  });
});
