import { ExecutionContext } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';
import { CSRF_COOKIE } from './cookie.util';
import { ApiError } from '../http/api-error';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;

  beforeEach(() => {
    guard = new CsrfGuard();
  });

  function createMockContext(cookies: Record<string, string>, headers: Record<string, string>): ExecutionContext {
    const req = {
      cookies,
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows request when cookie matches x-csrf-token header', () => {
    const token = 'abcdef1234567890abcdef1234567890';
    const ctx = createMockContext({ [CSRF_COOKIE]: token }, { 'x-csrf-token': token });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects with 403 when cookie is missing', () => {
    const ctx = createMockContext({}, { 'x-csrf-token': 'token123' });
    expect(() => guard.canActivate(ctx)).toThrow(ApiError);
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      expect(e.status).toBe(403);
      expect(e.code).toBe('ERR_CSRF');
    }
  });

  it('rejects with 403 when header is missing', () => {
    const ctx = createMockContext({ [CSRF_COOKIE]: 'token123' }, {});
    expect(() => guard.canActivate(ctx)).toThrow(ApiError);
  });

  it('rejects with 403 when tokens do not match', () => {
    const ctx = createMockContext({ [CSRF_COOKIE]: 'tokenA123' }, { 'x-csrf-token': 'tokenB123' });
    expect(() => guard.canActivate(ctx)).toThrow(ApiError);
  });

  it('rejects with 403 when token lengths differ', () => {
    const ctx = createMockContext({ [CSRF_COOKIE]: 'tokenShort' }, { 'x-csrf-token': 'tokenLonger' });
    expect(() => guard.canActivate(ctx)).toThrow(ApiError);
  });
});
