import { SearchStudentsService } from './search-students.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import type { SessionActor } from '@custom-school/contracts';

describe('SearchStudentsService', () => {
  let service: SearchStudentsService;
  let mockPrisma: any;
  let mockRepo: any;
  let mockCrypto: any;
  let mockValidator: any;

  const actor: SessionActor = {
    userType: 'OPERATOR',
    userId: '11111111-1111-1111-1111-111111111111',
    schoolId: 'SCH-TEST-001',
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  const sampleStudent = {
    id: 'stu-1',
    schoolId: 'SCH-TEST-001',
    studentCode: 'SCH-0001',
    fullName: 'John Doe',
    fatherName: 'Father Doe',
    motherName: 'Mother Doe',
    dob: new Date('2015-05-10'),
    gender: 'BOY',
    admissionDate: new Date('2022-04-01'),
    address: '123 Main St',
    phone: '9876543210',
    emergencyContact: '9876543210',
    emergencyRelation: 'Father',
    udiseCode: 'LEGACY-UDISE-1234',
    penNumber: 'PEN-9999',
    concessionType: 'NONE',
    concessionValue: 0,
    transportRequired: false,
    transportSetupState: 'NOT_REQUIRED',
    status: 'ACTIVE',
    version: 1,
    createdAt: new Date('2022-04-01'),
    updatedAt: new Date('2022-04-01'),
    enrollments: [
      {
        classId: 'cls-1',
        sectionId: 'sec-1',
        status: 'ACTIVE',
        class: { name: 'Grade 5' },
        section: { name: 'A' },
      },
    ],
    privateProfile: null,
  };

  beforeEach(() => {
    mockPrisma = {
      school: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'SCH-TEST-001',
          name: 'Greenwood International School',
          address: '456 Campus Road',
          phone: '9988776655',
          email: 'admin@greenwood.edu',
          logoFileId: null,
          udiseNumber: '09280100101',
          schoolCode: '0042',
          affiliationNumber: 'CBSE-001234',
        }),
      },
      academicSession: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.schoolId === 'SCH-TEST-001') {
            if (where.id === 'sess-2025') {
              return { id: 'sess-2025', code: '2025-26', status: 'COMPLETED' };
            }
            if (where.id === 'sess-2026' || where.status === 'ACTIVE') {
              return { id: 'sess-2026', code: '2026-27', status: 'ACTIVE' };
            }
          }
          return null;
        }),
      },
      studentEnrollment: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where.academicSessionId === 'sess-2025') {
            return {
              id: 'enr-2025',
              classId: 'cls-old',
              sectionId: 'sec-old',
              classNameSnapshot: 'Grade 4',
              sectionNameSnapshot: 'B',
              status: 'ENDED',
              class: { name: 'Grade 4' },
              section: { name: 'B' },
              academicSession: { code: '2025-26', status: 'COMPLETED' },
            };
          }
          return null;
        }),
      },
    };

    mockRepo = {
      findById: jest.fn().mockImplementation(async (schoolId, id) => {
        if (schoolId === 'SCH-TEST-001' && id === 'stu-1') {
          return sampleStudent;
        }
        return null;
      }),
      search: jest.fn(),
      findDirectory: jest.fn(),
    };

    mockCrypto = {
      decryptJson: jest.fn(),
    };

    mockValidator = {
      maskAadhaar: jest.fn((val) => (val ? `XXXX-XXXX-${val}` : null)),
      maskPan: jest.fn(),
      maskAccountNumber: jest.fn(),
    };

    service = new SearchStudentsService(mockPrisma, mockRepo, mockCrypto, mockValidator);
  });

  describe('TASK-005 — getAdmissionFormPrint', () => {
    it('returns official school identifiers with exact leading zeros (TASK-005-BE02)', async () => {
      const res = await service.getAdmissionFormPrint(actor, 'stu-1');

      expect(res.school.id).toBe('SCH-TEST-001');
      expect(res.school.name).toBe('Greenwood International School');
      expect(res.school.udiseNumber).toBe('09280100101');
      expect(res.school.schoolCode).toBe('0042');
      expect(res.school.affiliationNumber).toBe('CBSE-001234');
      expect(res.student.studentCode).toBe('SCH-0001');
      expect(res.student.enrollment?.className).toBe('Grade 5');
      expect(res.student.enrollment?.sectionName).toBe('A');
    });

    it('preserves legacy student UDISE in student profile (TASK-005-BE01)', async () => {
      const res = await service.getAdmissionFormPrint(actor, 'stu-1');
      expect(res.student.udiseCode).toBe('LEGACY-UDISE-1234');
    });

    it('handles nullable school identifiers gracefully without crashing (TASK-005-BE04)', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'SCH-TEST-001',
        name: 'Legacy School',
        address: null,
        phone: null,
        email: null,
        logoFileId: null,
        udiseNumber: null,
        schoolCode: null,
        affiliationNumber: null,
      });

      const res = await service.getAdmissionFormPrint(actor, 'stu-1');
      expect(res.school.udiseNumber).toBeNull();
      expect(res.school.schoolCode).toBeNull();
      expect(res.school.affiliationNumber).toBeNull();
    });

    it('rejects cross-school student ID with 404 NotFoundException (TASK-005-BE03)', async () => {
      await expect(service.getAdmissionFormPrint(actor, 'foreign-stu-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('rejects call when operator session lacks school context', async () => {
      const invalidActor: SessionActor = {
        ...actor,
        schoolId: undefined as any,
      };
      await expect(service.getAdmissionFormPrint(invalidActor, 'stu-1')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('TASK-010 — Current-year context in existing student screens', () => {
    it('getDirectory filters by academicSessionId and validates school ownership (TASK-010-BE01)', async () => {
      mockRepo.findDirectory.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      const res = await service.getDirectory(actor, {
        academicSessionId: 'sess-2025',
        page: 1,
        pageSize: 50,
      });

      expect(mockPrisma.academicSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'sess-2025', schoolId: 'SCH-TEST-001' },
      });
      expect(mockRepo.findDirectory).toHaveBeenCalledWith('SCH-TEST-001', {
        academicSessionId: 'sess-2025',
        page: 1,
        pageSize: 50,
      });
      expect(res.items).toEqual([]);
    });

    it('getDirectory rejects foreign-school academicSessionId with 404 (TASK-010-BE02)', async () => {
      await expect(
        service.getDirectory(actor, {
          academicSessionId: 'foreign-session-id',
          page: 1,
          pageSize: 50,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('getProfile with session returns historical class snapshot and sessionStatus (TASK-010-BE03)', async () => {
      const res = await service.getProfile(actor, 'stu-1', 'sess-2025');

      expect(res.sessionStatus).toBe('COMPLETED');
      expect(res.enrollment?.className).toBe('Grade 4');
      expect(res.enrollment?.sectionName).toBe('B');
      expect(res.enrollment?.academicSessionCode).toBe('2025-26');
    });

    it('getProfile without academicSessionId falls back to active session (TASK-010-BE04)', async () => {
      const res = await service.getProfile(actor, 'stu-1');

      expect(res.sessionStatus).toBe('ACTIVE');
      expect(res.enrollment?.className).toBe('Grade 5');
      expect(res.enrollment?.sectionName).toBe('A');
    });

    it('getProfile rejects foreign-school academicSessionId with 404 (TASK-010-BE05)', async () => {
      await expect(service.getProfile(actor, 'stu-1', 'foreign-session-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

