import { SessionService } from './session.service';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { SessionSubjectRegistry } from './session-subject.registry';
import { ApiError } from '../../common/http/api-error';

describe('SessionService', () => {
  let service: SessionService;
  let mockPrisma: any;
  let mockSubjects: any;
  const config = {
    sessionHmacSecret: 'test-secret-at-least-32-characters-long-1234',
  } as AppConfig;

  beforeEach(() => {
    mockPrisma = {
      userSession: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'sess-1', ...data })),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'sess-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockSubjects = {
      validate: jest.fn().mockResolvedValue(true),
    };
    service = new SessionService(mockPrisma as PrismaService, config, mockSubjects as SessionSubjectRegistry);
  });

  it('generates opaque token and stores only HMAC, never plaintext', async () => {
    const result = await service.create({
      userType: 'PLATFORM_ADMIN',
      userId: 'admin-1',
      schoolId: null,
      accountVersion: 1,
    });

    expect(result.token).toBeDefined();
    expect(result.sessionId).toBe('sess-1');
    expect(mockPrisma.userSession.create).toHaveBeenCalledTimes(1);

    const savedData = mockPrisma.userSession.create.mock.calls[0][0].data;
    expect(savedData.tokenHash).not.toBe(result.token);
    expect(savedData.tokenHash).toBe(service.hashToken(result.token));
  });

  it('sets 4-hour sliding window for admin and 8-hour for operator', async () => {
    const beforeAdmin = Date.now();
    const adminSess = await service.create({
      userType: 'PLATFORM_ADMIN',
      userId: 'admin-1',
      schoolId: null,
      accountVersion: 1,
    });
    const adminDurationMs = adminSess.expiresAt.getTime() - beforeAdmin;
    expect(adminDurationMs).toBeGreaterThanOrEqual(4 * 3600_000 - 1000);
    expect(adminDurationMs).toBeLessThanOrEqual(4 * 3600_000 + 1000);

    const beforeOper = Date.now();
    const operSess = await service.create({
      userType: 'OPERATOR',
      userId: 'oper-1',
      schoolId: 'school-1',
      accountVersion: 1,
    });
    const operDurationMs = operSess.expiresAt.getTime() - beforeOper;
    expect(operDurationMs).toBeGreaterThanOrEqual(8 * 3600_000 - 1000);
    expect(operDurationMs).toBeLessThanOrEqual(8 * 3600_000 + 1000);
  });

  it('resolves valid session and returns authenticated actor', async () => {
    const token = 'valid-token';
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userType: 'PLATFORM_ADMIN',
      userId: 'admin-1',
      schoolId: null,
      accountVersion: 1,
      schoolAccessVersion: null,
      expiresAt: new Date(Date.now() + 3600_000),
      lastSeenAt: new Date(),
      revokedAt: null,
    });

    const actor = await service.resolve(token, 'PLATFORM_ADMIN', 'req-1');
    expect(actor.userId).toBe('admin-1');
    expect(actor.userType).toBe('PLATFORM_ADMIN');
    expect(actor.sessionId).toBe('sess-1');
    expect(actor.requestId).toBe('req-1');
  });

  it('rejects expired session with 401', async () => {
    const token = 'expired-token';
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userType: 'OPERATOR',
      userId: 'op-1',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    });

    await expect(service.resolve(token, 'OPERATOR', 'req-1')).rejects.toThrow(ApiError);
  });

  it('rejects revoked session with 401', async () => {
    const token = 'revoked-token';
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userType: 'OPERATOR',
      userId: 'op-1',
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: new Date(),
    });

    await expect(service.resolve(token, 'OPERATOR', 'req-1')).rejects.toThrow(ApiError);
  });

  it('rejects session when userType does not match expected role', async () => {
    const token = 'operator-token';
    mockPrisma.userSession.findUnique.mockResolvedValue({
      id: 'sess-1',
      userType: 'OPERATOR',
      userId: 'op-1',
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
    });

    // Trying to use Operator session on Platform Admin endpoint
    await expect(service.resolve(token, 'PLATFORM_ADMIN', 'req-1')).rejects.toThrow(ApiError);
  });
});
