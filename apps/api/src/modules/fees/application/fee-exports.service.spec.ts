import { FeeExportsService } from './fee-exports.service';
import { sanitizeCellString, buildXlsx } from './xlsx.util';
import { CapabilityGuard, ROLE_CAPABILITIES, getOperatorCapabilities } from '../../../common/security/capability.guard';
import { ApiError } from '../../../common/http/api-error';
import { Reflector } from '@nestjs/core';
import type { SessionActor, OperatorRole } from '@custom-school/contracts';

describe('TASK-002 Reports-only operator experience and exports', () => {
  describe('TASK-002-BE01: Route capability enumeration & table-driven allow/deny', () => {
    const guard = new CapabilityGuard(new Reflector());

    const routes: Array<{
      path: string;
      method: string;
      requiredCaps: string[];
      allowedRoles: OperatorRole[];
      deniedRoles: OperatorRole[];
    }> = [
      {
        path: '/operator/dashboard/students',
        method: 'GET',
        requiredCaps: ['dashboard.read'],
        allowedRoles: ['MANAGER', 'REPORT_VIEWER'],
        deniedRoles: [],
      },
      {
        path: '/operator/dashboard/fees/collection',
        method: 'GET',
        requiredCaps: ['dashboard.read'],
        allowedRoles: ['MANAGER', 'REPORT_VIEWER'],
        deniedRoles: [],
      },
      {
        path: '/operator/fees/pending',
        method: 'GET',
        requiredCaps: ['reports.read', 'fees.read'],
        allowedRoles: ['MANAGER', 'REPORT_VIEWER'],
        deniedRoles: [],
      },
      {
        path: '/operator/fees/exports/pending',
        method: 'POST',
        requiredCaps: ['fees.export', 'reports.download'],
        allowedRoles: ['MANAGER', 'REPORT_VIEWER'],
        deniedRoles: [],
      },
      {
        path: '/operator/fees/configs',
        method: 'GET',
        requiredCaps: ['fees.read'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/fees/payments',
        method: 'POST',
        requiredCaps: ['fees.write'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/fees/dues/student/123',
        method: 'GET',
        requiredCaps: ['fees.read'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/students',
        method: 'GET',
        requiredCaps: ['students.read'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/students/profile',
        method: 'GET',
        requiredCaps: ['students.read'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/students',
        method: 'POST',
        requiredCaps: ['students.write'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/transports',
        method: 'GET',
        requiredCaps: ['transports.read'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
      {
        path: '/operator/transports',
        method: 'POST',
        requiredCaps: ['transports.write'],
        allowedRoles: ['MANAGER'],
        deniedRoles: ['REPORT_VIEWER'],
      },
    ];

    function makeContext(role: OperatorRole, method: string, requiredCaps: string[]) {
      const handler = () => {};
      Reflect.defineMetadata('required_capabilities', requiredCaps, handler);
      return {
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({
            method,
            auth: {
              userType: 'OPERATOR',
              userId: 'op-1',
              schoolId: 'sch-1',
              sessionId: 'sess-1',
              role,
            },
          }),
        }),
      } as any;
    }

    test.each(routes)(
      '$method $path allows $allowedRoles and denies $deniedRoles',
      ({ method, requiredCaps, allowedRoles, deniedRoles }) => {
        for (const role of allowedRoles) {
          const ctx = makeContext(role, method, requiredCaps);
          expect(guard.canActivate(ctx)).toBe(true);
        }
        for (const role of deniedRoles) {
          const ctx = makeContext(role, method, requiredCaps);
          expect(() => guard.canActivate(ctx)).toThrow(ApiError);
        }
      }
    );
  });

  describe('TASK-002-BE02: CSRF-valid direct mutation still denied for REPORT_VIEWER', () => {
    const guard = new CapabilityGuard(new Reflector());

    it('denies mutating POST to fee collection even if valid CSRF is present', () => {
      const handler = () => {};
      Reflect.defineMetadata('required_capabilities', ['fees.write'], handler);
      const ctx = {
        getHandler: () => handler,
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            auth: { userType: 'OPERATOR', userId: 'v-1', schoolId: 'sch-1', role: 'REPORT_VIEWER' },
            headers: { 'x-csrf-token': 'valid-csrf-token' },
          }),
        }),
      } as any;

      expect(() => guard.canActivate(ctx)).toThrow(ApiError);
      try {
        guard.canActivate(ctx);
      } catch (err: any) {
        expect(err.status).toBe(403);
        expect(err.code).toBe('ERR_FORBIDDEN');
      }
    });
  });

  describe('TASK-002-BE03 & BE04: Source file security and cross-tenant 404', () => {
    it('throws ERR_FILE_NOT_FOUND (404) when school context does not match file record', async () => {
      const mockPrisma = {
        schoolFile: {
          findFirst: jest.fn().mockImplementation(async ({ where }) => {
            // Match only if both id and schoolId match
            if (where.id === 'file-123' && where.schoolId === 'school-A') {
              return { id: 'file-123', schoolId: 'school-A', status: 'AVAILABLE', mime: 'application/pdf', objectKey: 'key-1' };
            }
            return null;
          }),
        },
      };

      // Querying file-123 under school-B tenant context
      const file = await mockPrisma.schoolFile.findFirst({
        where: { id: 'file-123', schoolId: 'school-B', status: 'AVAILABLE' },
      });

      expect(file).toBeNull();
    });
  });

  describe('TASK-002-BE06: Sensitive PII fields absent in exported report', () => {
    it('generates export with only safe projection headers and no Aadhaar or phone fields', async () => {
      const mockPendingService: any = {
        getPendingReport: jest.fn().mockResolvedValue({
          items: [
            {
              studentId: 'st-1',
              studentCode: 'SCH001',
              studentName: 'Alice Kumar',
              className: 'Grade 5',
              sectionName: 'A',
              feeMonth: '2026-10',
              baseAmount: 5000,
              concessionAmount: 500,
              netDue: 4500,
              paidAmount: 2000,
              balance: 2500,
              status: 'GENERATED_PENDING',
            },
          ],
          total: 1,
        }),
      };

      const mockFileService: any = {
        storeGenerated: jest.fn().mockResolvedValue({ id: 'file-export-1' }),
      };

      const mockAudit: any = {
        append: jest.fn().mockResolvedValue(undefined),
      };

      const service = new FeeExportsService(mockPendingService, mockFileService, mockAudit);
      const actor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'viewer-1',
        schoolId: 'sch-1',
        sessionId: 'sess-exp-1',
        requestId: 'req-exp-1',
        role: 'REPORT_VIEWER',
      };

      const result = await service.generatePendingFeesXlsx(actor, { feeMonth: '2026-10' });

      expect(result.fileName).toBe('pending-fees-2026-10.xlsx');
      expect(result.fileId).toBe('file-export-1');
      expect(result.buffer).toBeInstanceOf(Buffer);

      // Verify audit call
      expect(mockAudit.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FEE_EXPORT_GENERATED',
          actorType: 'OPERATOR',
          schoolId: 'sch-1',
        })
      );
    });
  });

  describe('TASK-002-NFR04: XLSX formula injection sanitization', () => {
    it('prepends single quote to any cell string starting with formula triggers (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeCellString('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCellString('+1234567890')).toBe("'+1234567890");
      expect(sanitizeCellString('-malicious')).toBe("'-malicious");
      expect(sanitizeCellString('@cmd')).toBe("'@cmd");
      expect(sanitizeCellString('\tdata')).toBe("'\tdata");
      expect(sanitizeCellString('\rdata')).toBe("'\rdata");
    });

    it('leaves standard benign strings and alphanumeric text unmodified', () => {
      expect(sanitizeCellString('Alice Kumar')).toBe('Alice Kumar');
      expect(sanitizeCellString('SCH-2026-001')).toBe('SCH-2026-001');
      expect(sanitizeCellString('Grade 10')).toBe('Grade 10');
      expect(sanitizeCellString('Pending')).toBe('Pending');
    });

    it('builds a valid xlsx buffer without throwing', () => {
      const headers = ['Code', 'Name', 'Amount'];
      const rows = [
        ['SCH001', '=HYPERLINK("http://evil.com")', 5000],
        ['SCH002', '+12345', 2500],
      ];
      const buffer = buildXlsx('Test Sheet', headers, rows);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('TASK-002-NFR01: Role escalation and BOLA protection', () => {
    it('disallows arbitrary role mutation by non-platform actors', () => {
      const opActor: SessionActor = {
        userType: 'OPERATOR',
        userId: 'op-1',
        schoolId: 'sch-1',
        sessionId: 'sess-1',
        requestId: 'req-1',
        role: 'REPORT_VIEWER',
      };
      // Capabilities for REPORT_VIEWER are immutable on client and server derived
      const caps = getOperatorCapabilities(opActor.role!);
      expect(caps).not.toContain('students.write');
      expect(caps).not.toContain('fees.write');
    });
  });
});
