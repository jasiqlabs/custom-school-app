import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { UnauthorizedPlaneException } from '../errors';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'PLATFORM_ADMIN') {
      throw new UnauthorizedPlaneException(
        'Access denied: endpoint is restricted to PLATFORM_ADMIN role'
      );
    }
    return true;
  }
}
