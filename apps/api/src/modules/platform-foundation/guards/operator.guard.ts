import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { UnauthorizedPlaneException } from '../errors';

@Injectable()
export class OperatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // BR-AUTH-001: Platform admin session navigating to operator routes must be denied
    if (!user || user.role !== 'SCHOOL_OPERATOR') {
      throw new UnauthorizedPlaneException(
        'Access denied: endpoint is restricted to SCHOOL_OPERATOR role (BR-AUTH-001)'
      );
    }
    return true;
  }
}
