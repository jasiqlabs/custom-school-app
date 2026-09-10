import { AcademicsService } from './academics.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { ApiError } from '../../../common/http/api-error';
import type { SessionActor, StudentsPublicFacade } from '@custom-school/contracts';

describe('AcademicsService', () => {
  let service: AcademicsService;
  let mockPrisma: any;
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
        findUnique: jest.fn().mockResolvedValue({ id: 'sch-1' }),
      },
      class: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'cls-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'cls-1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 'cls-1' }),
      },
      section: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sec-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sec-1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 'sec-1' }),
      },
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };
    mockStudents = {
      countActiveEnrollment: jest.fn().mockResolvedValue(0),
    };

    service = new AcademicsService(
      mockPrisma as PrismaService,
      mockAudit as AuditService,
      mockStudents as StudentsPublicFacade,
    );
  });

  it('creates class with normalized name', async () => {
    const result = await service.createClass(actor, 'sch-1', {
      name: 'Class 10',
      sortOrder: 10,
    });

    expect(result.id).toBe('cls-1');
    expect(result.name).toBe('Class 10');
    expect(result.normalizedName).toBe('class 10');
  });

  it('blocks destructive delete of class when active enrollment exists', async () => {
    mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1', schoolId: 'sch-1' });
    mockStudents.countActiveEnrollment.mockResolvedValue(15); // 15 active students

    await expect(service.deleteClass(actor, 'sch-1', 'cls-1')).rejects.toThrow(ApiError);

    try {
      await service.deleteClass(actor, 'sch-1', 'cls-1');
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('ERR_ACADEMIC_IN_USE');
    }
  });

  it('blocks destructive delete of class when sections still exist', async () => {
    mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1', schoolId: 'sch-1' });
    mockStudents.countActiveEnrollment.mockResolvedValue(0);
    mockPrisma.section.count.mockResolvedValue(2); // 2 child sections

    await expect(service.deleteClass(actor, 'sch-1', 'cls-1')).rejects.toThrow(ApiError);

    try {
      await service.deleteClass(actor, 'sch-1', 'cls-1');
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('ERR_CLASS_HAS_SECTIONS');
    }
  });

  it('allows safe destructive delete when no enrollments and no sections', async () => {
    mockPrisma.class.findFirst.mockResolvedValue({ id: 'cls-1', schoolId: 'sch-1' });
    mockStudents.countActiveEnrollment.mockResolvedValue(0);
    mockPrisma.section.count.mockResolvedValue(0);

    await service.deleteClass(actor, 'sch-1', 'cls-1');
    expect(mockPrisma.class.delete).toHaveBeenCalledWith({ where: { id: 'cls-1' } });
  });
});
