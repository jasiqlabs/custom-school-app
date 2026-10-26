import { SchoolsService } from './schools.service';
import { PrismaService } from '../../../database/prisma.service';
import { AppConfig } from '../../../config/app-config';
import { AuditService } from '../../../platform/audit/audit.service';
import { PrivateFileService } from '../../../platform/files/private-file.service';
import { SessionService } from '../../../platform/auth/session.service';
import { ApiError } from '../../../common/http/api-error';
import type { SessionActor } from '@custom-school/contracts';

describe('SchoolsService', () => {
  let service: SchoolsService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockFiles: any;
  let mockSessions: any;

  const config = {
    duplicateConfirmationSecret: 'test-dup-secret-at-least-32-chars-long-1234',
  } as AppConfig;

  const actor: SessionActor = {
    userType: 'PLATFORM_ADMIN',
    userId: 'admin-1',
    schoolId: null,
    sessionId: 'sess-1',
    requestId: 'req-1',
  };

  beforeEach(() => {
    mockPrisma = {
      school: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: data.id || 'sch-1', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'sch-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockImplementation(async (callbackOrArr: any) => {
        if (typeof callbackOrArr === 'function') {
          return callbackOrArr(mockPrisma);
        }
        return Promise.all(callbackOrArr);
      }),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };
    mockFiles = {
      storeImage: jest.fn(),
      signedUrl: jest.fn(),
    };
    mockSessions = {
      revokeSchool: jest.fn().mockResolvedValue(undefined),
    };

    service = new SchoolsService(
      mockPrisma as PrismaService,
      config,
      mockAudit as AuditService,
      mockFiles as PrivateFileService,
      mockSessions as SessionService,
    );
  });

  it('creates DRAFT school when no duplicate candidate exists', async () => {
    mockPrisma.school.findMany.mockResolvedValue([]);

    const result = await service.create(actor, {
      name: 'Delhi Public Academy',
      phone: '+91 9876543210',
      email: 'contact@dpa.edu',
    });

    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(result.name).toBe('Delhi Public Academy');
    expect(result.status).toBe('DRAFT');
    expect(mockAudit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'SCHOOL_CREATED',
        actorType: 'PLATFORM_ADMIN',
        actorId: 'admin-1',
      }),
      mockPrisma,
    );
  });

  it('detects duplicate school name and returns 409 with duplicateConfirmationToken', async () => {
    mockPrisma.school.findMany.mockResolvedValue([
      { id: 'sch-existing-1', name: 'Delhi Public Academy', status: 'ACTIVE' },
    ]);

    await expect(
      service.create(actor, { name: 'delhi   public academy' }),
    ).rejects.toThrow(ApiError);

    try {
      await service.create(actor, { name: 'delhi   public academy' });
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('ERR_SCHOOL_DUPLICATE_CONFIRMATION_REQUIRED');
      expect(e.details.candidates).toHaveLength(1);
      expect(e.details.duplicateConfirmationToken).toBeDefined();
    }
  });

  it('allows duplicate creation when a valid confirmation token is supplied', async () => {
    mockPrisma.school.findMany.mockResolvedValue([
      { id: 'sch-existing-1', name: 'Delhi Public Academy', status: 'ACTIVE' },
    ]);

    let token = '';
    try {
      await service.create(actor, { name: 'Delhi Public Academy' });
    } catch (e: any) {
      token = e.details.duplicateConfirmationToken;
    }

    expect(token).toBeTruthy();

    const created = await service.create(actor, {
      name: 'Delhi Public Academy',
      duplicateConfirmationToken: token,
    });

    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(created.name).toBe('Delhi Public Academy');
  });

  it('rejects school update with 409 on version conflict', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      id: 'sch-1',
      version: 5,
    });

    await expect(
      service.update(actor, 'sch-1', {
        name: 'New Name',
        version: 4, // Stale version
      }),
    ).rejects.toThrow(ApiError);

    try {
      await service.update(actor, 'sch-1', { name: 'New Name', version: 4 });
    } catch (e: any) {
      expect(e.status).toBe(409);
      expect(e.code).toBe('ERR_VERSION_CONFLICT');
    }
  });

  describe('TASK-003 Official school identity fields', () => {
    it('TASK-003-BE01 & BE04: creates school preserving leading zeroes in UDISE and custom school codes', async () => {
      mockPrisma.school.findMany.mockResolvedValue([]);

      const created = await service.create(actor, {
        name: 'Aryabhatta Public School',
        udiseNumber: '00001234567',
        schoolCode: 'APS-DEL-01',
        affiliationNumber: 'CBSE/AFF/2026/9988',
      });

      expect(created.udiseNumber).toBe('00001234567');
      expect(created.schoolCode).toBe('APS-DEL-01');
      expect(created.affiliationNumber).toBe('CBSE/AFF/2026/9988');
      expect(mockPrisma.school.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            udiseNumber: '00001234567',
            schoolCode: 'APS-DEL-01',
            affiliationNumber: 'CBSE/AFF/2026/9988',
          }),
        }),
      );
    });

    it('TASK-003-BE03 & BE05: updates identifiers and allows clearing them to null without losing logo or principal', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-1',
        name: 'Aryabhatta Public School',
        normalizedName: 'aryabhatta public school',
        logoFileId: 'logo-uuid-1',
        udiseNumber: '00001234567',
        schoolCode: 'APS-DEL-01',
        affiliationNumber: 'CBSE/AFF/2026/9988',
        version: 2,
      });

      await service.update(actor, 'sch-1', {
        version: 2,
        affiliationNumber: null, // explicit clear
        schoolCode: 'APS-DEL-02',
      });

      expect(mockPrisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sch-1' },
          data: expect.objectContaining({
            version: { increment: 1 },
            affiliationNumber: null,
            schoolCode: 'APS-DEL-02',
          }),
        }),
      );

      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SCHOOL_PROFILE_UPDATED',
          targetType: 'SCHOOL',
          targetId: 'sch-1',
          metadata: expect.objectContaining({
            fields: expect.arrayContaining(['affiliationNumber', 'schoolCode']),
          }),
        }),
        mockPrisma,
      );
    });

    it('TASK-003-NFR01 & BE01: safely handles existing schools with null identifiers', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-legacy',
        name: 'Legacy School',
        udiseNumber: null,
        schoolCode: null,
        affiliationNumber: null,
        principal: null,
        version: 1,
      });

      const school = await service.get('sch-legacy');
      expect(school.udiseNumber).toBeNull();
      expect(school.schoolCode).toBeNull();
      expect(school.affiliationNumber).toBeNull();
    });
  });

  describe('TASK-011: School go-live readiness and activation', () => {
    beforeEach(() => {
      mockPrisma.academicSession = {
        findMany: jest.fn().mockResolvedValue([]),
      };
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([]);
    });

    it('TASK-011-BE01: calculates readiness deficiencies (blockers) for new DRAFT school', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-draft',
        name: 'New Horizon School',
        status: 'DRAFT',
        version: 1,
        address: null,
        phone: null,
        email: null,
        principal: null,
        operators: [],
        classes: [],
      });
      mockPrisma.academicSession.findMany.mockResolvedValue([]);

      const readiness = await service.getReadiness('sch-draft');

      expect(readiness.ready).toBe(false);
      expect(readiness.hasBlockers).toBe(true);
      expect(readiness.hasWarnings).toBe(true);
      const sessionCheck = readiness.checks.find(c => c.code === 'ACADEMIC_SESSION');
      const classesCheck = readiness.checks.find(c => c.code === 'CLASSES');
      const operatorCheck = readiness.checks.find(c => c.code === 'OPERATOR');

      expect(sessionCheck?.satisfied).toBe(false);
      expect(sessionCheck?.severity).toBe('BLOCKER');
      expect(classesCheck?.satisfied).toBe(false);
      expect(classesCheck?.severity).toBe('BLOCKER');
      expect(operatorCheck?.satisfied).toBe(false);
      expect(operatorCheck?.severity).toBe('WARNING');
    });

    it('TASK-011-BE02: calculates readiness as ready when blockers are satisfied', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-configured',
        name: 'Ready Public School',
        status: 'DRAFT',
        version: 2,
        address: '123 Main Road',
        phone: '9876543210',
        email: 'info@school.edu',
        principal: { name: 'Dr. Principal' },
        operators: [{ id: 'op-1', status: 'ACTIVE' }],
        classes: [
          { id: 'c-1', status: 'ACTIVE', sections: [{ id: 's-1', status: 'ACTIVE' }] },
        ],
      });
      mockPrisma.academicSession.findMany.mockResolvedValue([
        { id: 'sess-1', code: '2026-27', label: '2026-2027', status: 'ACTIVE' },
      ]);

      const readiness = await service.getReadiness('sch-configured');

      expect(readiness.ready).toBe(true);
      expect(readiness.hasBlockers).toBe(false);
      expect(readiness.hasWarnings).toBe(false);
      expect(readiness.checks.every(c => c.satisfied)).toBe(true);
    });

    it('TASK-011-BE03: rejects activation with 422 if blockers are present', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-draft',
        name: 'New School',
        status: 'DRAFT',
        version: 1,
        address: null,
        phone: null,
        email: null,
        principal: null,
        operators: [],
        classes: [],
      });
      mockPrisma.academicSession.findMany.mockResolvedValue([]);

      await expect(
        service.activate(actor, 'sch-draft', { expectedVersion: 1 }),
      ).rejects.toThrow(ApiError);

      try {
        await service.activate(actor, 'sch-draft', { expectedVersion: 1 });
      } catch (e: any) {
        expect(e.status).toBe(422);
        expect(e.code).toBe('ERR_READINESS_BLOCKERS');
      }
    });

    it('TASK-011-BE04: requires confirmWarnings when warnings exist and confirmWarnings is false', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-configured',
        name: 'Ready School',
        status: 'DRAFT',
        version: 1,
        address: null, // triggers warning
        phone: null,
        email: null,
        principal: null, // triggers warning
        operators: [], // triggers warning
        classes: [
          { id: 'c-1', status: 'ACTIVE', sections: [{ id: 's-1', status: 'ACTIVE' }] },
        ],
      });
      mockPrisma.academicSession.findMany.mockResolvedValue([
        { id: 'sess-1', code: '2026-27', label: '2026-2027', status: 'ACTIVE' },
      ]);

      await expect(
        service.activate(actor, 'sch-configured', { expectedVersion: 1, confirmWarnings: false }),
      ).rejects.toThrow(ApiError);

      try {
        await service.activate(actor, 'sch-configured', { expectedVersion: 1, confirmWarnings: false });
      } catch (e: any) {
        expect(e.status).toBe(409);
        expect(e.code).toBe('ERR_WARNINGS_UNCONFIRMED');
      }
    });

    it('TASK-011-BE05: activates school atomically when warnings are confirmed', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-configured',
        name: 'Ready School',
        status: 'DRAFT',
        version: 3,
        address: null,
        phone: null,
        email: null,
        principal: null,
        operators: [],
        classes: [
          { id: 'c-1', status: 'ACTIVE', sections: [{ id: 's-1', status: 'ACTIVE' }] },
        ],
      });
      mockPrisma.academicSession.findMany.mockResolvedValue([
        { id: 'sess-1', code: '2026-27', label: '2026-2027', status: 'ACTIVE' },
      ]);
      mockPrisma.school.update.mockResolvedValue({
        id: 'sch-configured',
        status: 'ACTIVE',
        version: 4,
      });

      const result = await service.activate(actor, 'sch-configured', {
        expectedVersion: 3,
        confirmWarnings: true,
      });

      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sch-configured' },
          data: expect.objectContaining({
            status: 'ACTIVE',
            accessVersion: { increment: 1 },
            version: { increment: 1 },
          }),
        }),
      );
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'SCHOOL_ACTIVATED',
          targetId: 'sch-configured',
        }),
        mockPrisma,
      );
    });

    it('TASK-011-BE06: rejects activation with 409 on version conflict', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        id: 'sch-draft',
        status: 'DRAFT',
        version: 5,
      });

      await expect(
        service.activate(actor, 'sch-draft', { expectedVersion: 4 }),
      ).rejects.toThrow(ApiError);

      try {
        await service.activate(actor, 'sch-draft', { expectedVersion: 4 });
      } catch (e: any) {
        expect(e.status).toBe(409);
        expect(e.code).toBe('ERR_VERSION_CONFLICT');
      }
    });
  });
});
