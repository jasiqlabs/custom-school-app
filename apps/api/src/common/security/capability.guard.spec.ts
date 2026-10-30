import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CapabilityGuard, RequiresCapability, getOperatorCapabilities, ROLE_CAPABILITIES } from './capability.guard';
import { ApiError } from '../http/api-error';
import type { OperatorRole, SessionActor } from '@custom-school/contracts';

describe('TASK-001 Operator roles and server-side capability enforcement', () => {
  let guard: CapabilityGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CapabilityGuard(reflector);
  });

  function createMockContext(options: {
    actor?: SessionActor;
    method?: string;
    capabilities?: string[];
  }): ExecutionContext {
    const handler = () => {};
    const controller = class {};
    if (options.capabilities) {
      Reflect.defineMetadata('required_capabilities', options.capabilities, handler);
    }
    const req: any = {
      method: options.method || 'GET',
      auth: options.actor,
      cookies: {},
      requestId: 'req-test-123',
    };
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  describe('TASK-001-BE01: Role capabilities registry & defaults', () => {
    it('defaults MANAGER to full operational capability suite', () => {
      const managerCaps = getOperatorCapabilities('MANAGER');
      expect(managerCaps).toContain('students.read');
      expect(managerCaps).toContain('students.write');
      expect(managerCaps).toContain('fees.read');
      expect(managerCaps).toContain('fees.write');
      expect(managerCaps).toContain('transports.read');
      expect(managerCaps).toContain('transports.write');
      expect(managerCaps).toContain('reports.read');
      expect(managerCaps).toContain('reports.download');
    });

    it('restricts REPORT_VIEWER to reports and read-only exports', () => {
      const viewerCaps = getOperatorCapabilities('REPORT_VIEWER');
      expect(viewerCaps).toContain('reports.read');
      expect(viewerCaps).toContain('reports.download');
      expect(viewerCaps).toContain('fees.export');
      expect(viewerCaps).toContain('dashboard.read');
      expect(viewerCaps).not.toContain('students.write');
      expect(viewerCaps).not.toContain('fees.write');
      expect(viewerCaps).not.toContain('transports.write');
    });
  });

  describe('TASK-001-BE02 & BE04: Route capability enforcement', () => {
    it('allows MANAGER to access students.write endpoint', () => {
      const managerActor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'op-1',
        schoolId: 'sch-1',
        sessionId: 'sess-1',
        requestId: 'req-1',
        role: 'MANAGER',
      };
      const ctx = createMockContext({
        actor: managerActor,
        method: 'POST',
        capabilities: ['students.write'],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('denies REPORT_VIEWER on students.write endpoint with 403 ERR_FORBIDDEN', () => {
      const viewerActor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'op-2',
        schoolId: 'sch-1',
        sessionId: 'sess-2',
        requestId: 'req-2',
        role: 'REPORT_VIEWER',
      };
      const ctx = createMockContext({
        actor: viewerActor,
        method: 'POST',
        capabilities: ['students.write'],
      });
      expect(() => guard.canActivate(ctx)).toThrow(ApiError);
      try {
        guard.canActivate(ctx);
      } catch (e: any) {
        expect(e.status).toBe(403);
        expect(e.code).toBe('ERR_FORBIDDEN');
      }
    });

    it('allows REPORT_VIEWER to access reports.read endpoint', () => {
      const viewerActor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'op-2',
        schoolId: 'sch-1',
        sessionId: 'sess-2',
        requestId: 'req-2',
        role: 'REPORT_VIEWER',
      };
      const ctx = createMockContext({
        actor: viewerActor,
        method: 'GET',
        capabilities: ['reports.read'],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('FIX-01: viewer cannot use inherited class read permission to mutate', () => {
    const actor: SessionActor = {
      userType: 'OPERATOR', userId: 'report-1', schoolId: 'school-1',
      sessionId: 'session-1', requestId: 'req-1', role: 'REPORT_VIEWER',
    };
    it('denies POST/PUT/PATCH even if a class-level transports.read requirement is present', () => {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        expect(() => guard.canActivate(createMockContext({ actor, method, capabilities: ['transports.read'] }))).toThrow(ApiError);
      }
    });
    it('still permits CSRF-protected report export POST with explicit report-only capability', () => {
      expect(guard.canActivate(createMockContext({ actor, method: 'POST', capabilities: ['fees.export', 'reports.download'] }))).toBe(true);
    });
    it('does not grant student profile or transport directory access to viewers', () => {
      expect(getOperatorCapabilities('REPORT_VIEWER')).not.toContain('students.read');
      expect(getOperatorCapabilities('REPORT_VIEWER')).not.toContain('transports.read');
      expect(getOperatorCapabilities('REPORT_VIEWER')).not.toContain('tc.read');
    });
  });

  describe('TASK-001-NFR02: Deny-by-default regression scanner for mutating endpoints', () => {
    it('denies REPORT_VIEWER on any mutating HTTP method even without explicit decorator', () => {
      const viewerActor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'op-2',
        schoolId: 'sch-1',
        sessionId: 'sess-2',
        requestId: 'req-2',
        role: 'REPORT_VIEWER',
      };

      for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
        const ctx = createMockContext({
          actor: viewerActor,
          method,
          // no explicit capabilities defined
        });
        expect(() => guard.canActivate(ctx)).toThrow(ApiError);
      }
    });
  });

  describe('TASK-001-BE05: Platform Admin segregation', () => {
    it('allows PLATFORM_ADMIN to bypass operator capability checks', () => {
      const adminActor: SessionActor = {
        userType: 'PLATFORM_ADMIN',
        userId: 'admin-1',
        schoolId: null,
        sessionId: 'sess-admin',
        requestId: 'req-admin',
      };
      const ctx = createMockContext({
        actor: adminActor,
        method: 'POST',
        capabilities: ['students.write'],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('TASK-001-NFR01: Overhead at 50 parallel requests', () => {
    it('executes 50 parallel capability evaluations in under 15ms total', () => {
      const managerActor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'op-perf',
        schoolId: 'sch-1',
        sessionId: 'sess-perf',
        requestId: 'req-perf',
        role: 'MANAGER',
      };
      const ctx = createMockContext({
        actor: managerActor,
        method: 'POST',
        capabilities: ['fees.write'],
      });

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        expect(guard.canActivate(ctx)).toBe(true);
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(15);
    });
  });
});
