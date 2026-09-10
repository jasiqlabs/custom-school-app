import { OperatorAuthService } from './operator-auth.service';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { SessionService } from '../../platform/auth/session.service';
import { AuthRateService } from '../../platform/auth/auth-rate.service';
import { AuditService } from '../../platform/audit/audit.service';
import { PlatformAdminPublicFacade } from '../platform-admin/public-facade/platform-admin.facade';
import { ApiError } from '../../common/http/api-error';
import * as argon2 from 'argon2';

describe('OperatorAuthService', () => {
  let service: OperatorAuthService;
  let mockPrisma: any;
  let mockSessions: any;
  let mockRate: any;
  let mockAudit: any;
  let mockAdmin: any;

  const config = {
    loginMaxFailures: 5,
    loginLockMinutes: 15,
  } as AppConfig;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
      passwordResetRequest: {
        create: jest.fn().mockResolvedValue({ id: 'pr-1' }),
      },
    };
    mockSessions = {
      create: jest.fn().mockResolvedValue({
        token: 'op-token-123',
        sessionId: 'sess-op-1',
        expiresAt: new Date(Date.now() + 8 * 3600_000),
      }),
      revokeCurrent: jest.fn().mockResolvedValue(undefined),
    };
    mockRate = {
      assertLoginAllowed: jest.fn().mockResolvedValue(undefined),
      record: jest.fn().mockResolvedValue(undefined),
      assertResetAllowed: jest.fn().mockResolvedValue(undefined),
      recordReset: jest.fn().mockResolvedValue(undefined),
      ipHash: jest.fn().mockReturnValue('ip-hash-123'),
    };
    mockAudit = {
      append: jest.fn().mockResolvedValue(undefined),
    };
    mockAdmin = {
      getOperatorForAuth: jest.fn(),
      recordOperatorLoginFailure: jest.fn().mockResolvedValue(undefined),
      withOperatorLoginGuard: jest.fn().mockImplementation((id, cb) => {
        return cb(
          {
            id,
            schoolId: 'sch-1',
            fullName: 'Operator Alice',
            accountVersion: 1,
            school: { id: 'sch-1', name: 'Springfield High', accessVersion: 1 },
          },
          mockPrisma,
        );
      }),
    };

    service = new OperatorAuthService(
      mockPrisma as PrismaService,
      config,
      mockSessions as SessionService,
      mockRate as AuthRateService,
      mockAudit as AuditService,
      mockAdmin as PlatformAdminPublicFacade,
    );
  });

  it('authenticates active operator with active school and creates 8h operator session', async () => {
    const password = 'StrongPassword123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    mockAdmin.getOperatorForAuth.mockResolvedValue({
      id: 'op-1',
      schoolId: 'sch-1',
      fullName: 'Operator Alice',
      passwordHash,
      status: 'ACTIVE',
      lockedUntil: null,
      accountVersion: 1,
      school: {
        id: 'sch-1',
        name: 'Springfield High',
        status: 'ACTIVE',
        accessVersion: 1,
      },
    });

    const result = await service.login('alice@springfield.edu', password, '127.0.0.1', 'req-1');
    expect(result.token).toBe('op-token-123');
    expect(result.operator.fullName).toBe('Operator Alice');
    expect(result.school.id).toBe('sch-1');
    expect(mockSessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userType: 'OPERATOR',
        userId: 'op-1',
        schoolId: 'sch-1',
      }),
      mockPrisma,
    );
  });

  it('denies inactive school even if operator is active', async () => {
    const password = 'StrongPassword123!';
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    mockAdmin.getOperatorForAuth.mockResolvedValue({
      id: 'op-1',
      schoolId: 'sch-1',
      fullName: 'Operator Alice',
      passwordHash,
      status: 'ACTIVE',
      lockedUntil: null,
      school: {
        id: 'sch-1',
        name: 'Springfield High',
        status: 'INACTIVE', // Inactive school
      },
    });

    await expect(
      service.login('alice@springfield.edu', password, '127.0.0.1', 'req-1'),
    ).rejects.toThrow(ApiError);

    try {
      await service.login('alice@springfield.edu', password, '127.0.0.1', 'req-1');
    } catch (e: any) {
      expect(e.status).toBe(403);
      expect(e.code).toBe('ERR_ACCOUNT_INACTIVE');
    }
  });

  it('gives generic 401 on wrong password without user enumeration', async () => {
    const correctHash = await argon2.hash('CorrectPassword123!', { type: argon2.argon2id });

    mockAdmin.getOperatorForAuth.mockResolvedValue({
      id: 'op-1',
      schoolId: 'sch-1',
      fullName: 'Operator Alice',
      passwordHash: correctHash,
      status: 'ACTIVE',
      lockedUntil: null,
      school: { id: 'sch-1', status: 'ACTIVE' },
    });

    await expect(
      service.login('alice@springfield.edu', 'WrongPassword123!', '127.0.0.1', 'req-1'),
    ).rejects.toThrow(ApiError);

    try {
      await service.login('alice@springfield.edu', 'WrongPassword123!', '127.0.0.1', 'req-1');
    } catch (e: any) {
      expect(e.status).toBe(401);
      expect(e.code).toBe('ERR_INVALID_CREDENTIALS');
      expect(e.message).toBe('Invalid email or password');
    }
  });

  it('gives indistinguishable public message on reset request for known and unknown email', async () => {
    // Known email
    mockAdmin.getOperatorForAuth.mockResolvedValue({ id: 'op-1' });
    const knownResult = await service.resetRequest('alice@springfield.edu', '127.0.0.1');

    // Unknown email
    mockAdmin.getOperatorForAuth.mockResolvedValue(null);
    const unknownResult = await service.resetRequest('nonexistent@springfield.edu', '127.0.0.1');

    expect(knownResult).toEqual(unknownResult);
    expect(knownResult.accepted).toBe(true);
    expect(knownResult.message).toContain('contact or wait for your administrator');
  });
});
