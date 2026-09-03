import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { TenantContextService } from '../services/tenant-context.service';
import { TenantBoundaryException } from '../errors';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.schoolId) {
      throw new TenantBoundaryException(
        'Operator route requires an authenticated user with an associated schoolId'
      );
    }

    // Set the AsyncLocalStorage tenant context for downstream repository calls
    this.tenantContextService.runWithContext(
      {
        schoolId: user.schoolId,
        role: user.role,
        userId: user.userId,
        sessionId: request.session?.id || 'unknown-session',
      },
      () => true
    );

    return true;
  }
}
