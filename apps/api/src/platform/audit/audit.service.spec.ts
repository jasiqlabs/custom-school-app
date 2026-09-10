import { AuditService } from './audit.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        findFirst: jest.fn(),
      },
    };
    service = new AuditService(mockPrisma as PrismaService);
  });

  it('redacts sensitive fields recursively from audit metadata', async () => {
    await service.append({
      requestId: 'req-1',
      actorType: 'PLATFORM_ADMIN',
      actorId: 'admin-1',
      eventType: 'TEST_EVENT',
      metadata: {
        safeField: 'visible',
        password: 'super-secret-password',
        nested: {
          token: 'jwt-or-session-token',
          aadhaar: '1234-5678-9012',
          pan: 'ABCDE1234F',
          normalData: 'kept',
          cookie: 'session=123',
          secret: 'api-secret',
        },
      },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    const callArg = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(callArg.data.metadata).toEqual({
      safeField: 'visible',
      nested: {
        normalData: 'kept',
      },
    });
  });

  it('preserves clean metadata without modification', async () => {
    await service.append({
      requestId: 'req-2',
      actorType: 'OPERATOR',
      eventType: 'SCHOOL_VIEWED',
      schoolId: 'school-1',
      metadata: { schoolName: 'Alpha Academy', action: 'preview' },
    });

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        requestId: 'req-2',
        actorType: 'OPERATOR',
        actorId: null,
        schoolId: 'school-1',
        eventType: 'SCHOOL_VIEWED',
        targetType: undefined,
        targetId: undefined,
        metadata: { schoolName: 'Alpha Academy', action: 'preview' },
        ipHash: null,
      },
    });
  });
});
