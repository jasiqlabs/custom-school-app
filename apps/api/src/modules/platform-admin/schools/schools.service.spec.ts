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
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sch-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sch-1', ...data })),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn().mockImplementation(async (callbackOrArr) => {
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

    expect(result.id).toBe('sch-1');
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

    expect(created.id).toBe('sch-1');
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
});
