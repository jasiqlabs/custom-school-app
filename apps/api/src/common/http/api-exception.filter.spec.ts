import { ConflictException, HttpException } from '@nestjs/common';
import { z } from 'zod';
import { ApiError } from './api-error';
import { ApiExceptionFilter } from './api-exception.filter';

function run(error: unknown) {
  const status = jest.fn();
  const json = jest.fn();
  status.mockReturnValue({ json });
  const request = { requestId: 'request-123', method: 'POST', path: '/api/v1/test' };
  const host: any = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  };
  new ApiExceptionFilter().catch(error, host);
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as any };
}

describe('ApiExceptionFilter — user-safe error boundary', () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => { consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => { consoleError.mockRestore(); });

  it('does not expose database SQL, Prisma internals or stack traces in response or logs', () => {
    const secret = 'SECRET_SQL_DETAILS';
    const r = run(new Error('Invalid prisma.$queryRaw SELECT ' + secret + ' operator does not exist: uuid = text'));
    expect(r.status).toBe(500);
    expect(r.body).toEqual({
      code: 'ERR_INTERNAL',
      message: 'Something went wrong. Please try again. If the problem continues, contact support with the reference number.',
      requestId: 'request-123',
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('SELECT');
  });

  it('does not let an HTTP 500 passthrough leak a technical message', () => {
    const r = run(new HttpException({ message: 'SQLSTATE 42883 SELECT passwords' }, 500));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toMatch(/SQLSTATE|SELECT|passwords/);
  });

  it('uses readable field labels and requirement messages for structured validation', () => {
    let error: unknown;
    try {
      z.object({ email: z.string().email(), amount: z.number() }).parse({ email: 'invalid-address' });
    } catch (e) { error = e; }
    const r = run(error);
    expect(r.status).toBe(422);
    expect(r.body.code).toBe('ERR_VALIDATION');
    expect(r.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'Email' }),
      expect.objectContaining({ field: 'Amount', message: 'This field is required.' }),
    ]));
    expect(JSON.stringify(r.body)).not.toContain('invalid_type');
  });

  it('preserves nested duplicate-school confirmation business data but not secrets', () => {
    const token = 'abc_123.def_123';
    const r = run(new ApiError(409, 'ERR_SCHOOL_DUPLICATE_CONFIRMATION_REQUIRED',
      'A school with a similar name already exists', {
        candidates: [{ id: '11111111-1111-4111-8111-111111111111', name: 'North School', status: 'ACTIVE' }],
        duplicateConfirmationToken: token,
        passwordHash: 'must_not_leave',
      }));
    expect(r.status).toBe(409);
    expect(r.body.details.candidates[0].name).toBe('North School');
    expect(r.body.details.duplicateConfirmationToken).toBe(token);
    expect(JSON.stringify(r.body)).not.toContain('must_not_leave');
  });

  it('preserves structured active assignment count expected by transport UI', () => {
    const r = run(new ConflictException({ message: 'End active assignments first', activeAssignmentCount: 2 }));
    expect(r.status).toBe(409);
    expect(r.body.details.activeAssignmentCount).toBe(2);
  });

  it('rejects technical text in expected 4xx business messages', () => {
    const r = run(new ApiError(409, 'ERR_CONFLICT', 'prisma P2010 SELECT private-data'));
    expect(r.status).toBe(409);
    expect(JSON.stringify(r.body)).not.toContain('private-data');
  });
});
