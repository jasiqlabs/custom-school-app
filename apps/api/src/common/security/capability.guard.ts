import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OperatorCapability, OperatorRole, SessionActor } from '@custom-school/contracts';
import { ApiError } from '../http/api-error';

export const CAPABILITY_KEY = 'required_capabilities';
export const RequiresCapability = (...capabilities: OperatorCapability[]) => SetMetadata(CAPABILITY_KEY, capabilities);

export const ROLE_CAPABILITIES: Record<OperatorRole, OperatorCapability[]> = {
  MANAGER: [
    'students.read',
    'students.write',
    'fees.read',
    'fees.write',
    'fees.export',
    'transports.read',
    'transports.write',
    'academics.read',
    'academics.write',
    'reports.read',
    'reports.download',
    'tc.read',
    'tc.write',
    'exams.read',
    'exams.write',
    'dashboard.read',
  ],
  REPORT_VIEWER: [
    'students.read',
    'fees.read',
    'transports.read',
    'academics.read',
    'reports.read',
    'reports.download',
    'fees.export',
    'dashboard.read',
    'tc.read',
    'exams.read',
  ],
};

export function getOperatorCapabilities(role: OperatorRole): OperatorCapability[] {
  return ROLE_CAPABILITIES[role] || [];
}

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<OperatorCapability[] | undefined>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<any>();
    const actor: SessionActor | undefined = req.auth;

    if (!actor) {
      throw new ApiError(401, 'ERR_AUTH_REQUIRED', 'Authentication required');
    }

    if (actor.userType === 'PLATFORM_ADMIN') {
      return true;
    }

    const role: OperatorRole = actor.role || 'MANAGER';
    const userCapabilities = getOperatorCapabilities(role);

    if (required && required.length > 0) {
      const hasCapability = required.some(cap => userCapabilities.includes(cap));
      if (!hasCapability) {
        throw new ApiError(403, 'ERR_FORBIDDEN', `Forbidden: operator role ${role} lacks required capability`);
      }
      return true;
    }

    // Default deny for REPORT_VIEWER on any mutating method without explicit capability grant
    if (role === 'REPORT_VIEWER' && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      throw new ApiError(403, 'ERR_FORBIDDEN', 'Forbidden: report viewer cannot perform mutating actions');
    }

    return true;
  }
}
