import { OperatorsService } from './operators.service';
import type { SessionActor } from '@custom-school/contracts';

describe('OperatorsService — Error Drafts ERR-01', () => {
  it('locks the school using UUID typing and creates the requested operator once', async () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    const queryRaw = jest.fn().mockResolvedValue([{ id: schoolId }]);
    const create = jest.fn().mockImplementation(({ select }: any) => {
      const stored = {
        id: '22222222-2222-4222-8222-222222222222',
        schoolId, email: 'operator@example.com', fullName: 'New Operator',
        status: 'ACTIVE', role: 'MANAGER', createdAt: new Date(),
        passwordHash: 'private',
      };
      return Promise.resolve(Object.fromEntries(
        Object.entries(stored).filter(([field]) => select[field] === true),
      ));
    });
    const tx = {
      $queryRaw: queryRaw,
      school: { findUnique: jest.fn().mockResolvedValue({ id: schoolId, status: 'ACTIVE' }) },
      schoolOperator: { create },
    };
    const prisma: any = { $transaction: jest.fn((cb: any) => cb(tx)) };
    const audit: any = { append: jest.fn().mockResolvedValue(undefined) };
    const sessions: any = {};
    const actor = {
      userType: 'PLATFORM_ADMIN',
      userId: '33333333-3333-4333-8333-333333333333',
      requestId: 'request-1', sessionId: 'session-1', schoolId: null,
    } as SessionActor;

    const result = await new OperatorsService(prisma, audit, sessions).create(actor, schoolId, {
      email: 'Operator@Example.com', fullName: 'New Operator',
      password: 'TemporaryPassword123!', role: 'MANAGER',
    });
    expect(result.passwordHash).toBeUndefined();
    expect(queryRaw.mock.calls[0][0].join('$')).toContain('WHERE id=$::uuid FOR UPDATE');
    expect(queryRaw.mock.calls[0][1]).toBe(schoolId);
    expect(create.mock.calls[0][0].select.passwordHash).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.email).toBe('operator@example.com');
    expect(audit.append).toHaveBeenCalledTimes(1);
  });
  it('does not disclose password hash when updating an operator', async () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    const operatorId = '22222222-2222-4222-8222-222222222222';
    const stored = { id: operatorId, schoolId, email: 'op@example.com', fullName: 'Operator',
      status: 'ACTIVE', role: 'MANAGER', createdAt: new Date(), passwordHash: 'secret-hash' };
    const update = jest.fn().mockImplementation(({ select }: any) =>
      Promise.resolve(Object.fromEntries(Object.entries(stored).filter(([key]) => select[key] === true))));
    const tx: any = {
      schoolOperator: { findFirst: jest.fn().mockResolvedValue(stored), update },
    };
    const prisma: any = { $transaction: (fn: any) => fn(tx) };
    const audit: any = { append: jest.fn().mockResolvedValue(undefined) };
    const sessions: any = { revokeUser: jest.fn() };
    const actor: any = { userType: 'PLATFORM_ADMIN', userId: 'admin', requestId: 'req-1' };
    const result = await new OperatorsService(prisma, audit, sessions)
      .update(actor, schoolId, operatorId, { fullName: 'Operator' });
    expect(result.passwordHash).toBeUndefined();
    expect(update.mock.calls[0][0].select.passwordHash).toBeUndefined();
  });

  it('does not disclose password hash when changing operator status', async () => {
    const schoolId = '11111111-1111-4111-8111-111111111111';
    const operatorId = '22222222-2222-4222-8222-222222222222';
    const stored = { id: operatorId, schoolId, email: 'op@example.com', fullName: 'Operator',
      status: 'ACTIVE', role: 'MANAGER', createdAt: new Date(), passwordHash: 'secret-hash' };
    const update = jest.fn().mockImplementation(({ select }: any) =>
      Promise.resolve(Object.fromEntries(Object.entries(stored).filter(([key]) => select[key] === true))));
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: operatorId }]),
      schoolOperator: { findFirst: jest.fn().mockResolvedValue(stored), update },
    };
    const prisma: any = { $transaction: (fn: any) => fn(tx) };
    const audit: any = { append: jest.fn().mockResolvedValue(undefined) };
    const sessions: any = { revokeUser: jest.fn().mockResolvedValue(undefined) };
    const actor: any = { userType: 'PLATFORM_ADMIN', userId: 'admin', requestId: 'req-1' };
    const result = await new OperatorsService(prisma, audit, sessions)
      .setStatus(actor, schoolId, operatorId, 'INACTIVE');
    expect(result.passwordHash).toBeUndefined();
    expect(update.mock.calls[0][0].select.passwordHash).toBeUndefined();
  });

});
