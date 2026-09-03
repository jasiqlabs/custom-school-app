import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { SessionExpiredException } from '../errors';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new SessionExpiredException('Missing session credentials');
    }

    const result = await this.sessionService.validateSession(token);
    if (result.status !== 'VALID' || !result.session) {
      throw new SessionExpiredException(
        result.status === 'EXPIRED'
          ? 'Session has expired'
          : 'Session is invalid or was revoked'
      );
    }

    // Attach authenticated identity to request
    request.user = {
      userId: result.userId,
      role: result.role,
      schoolId: result.schoolId,
    };
    request.session = result.session;

    return true;
  }

  private extractToken(request: any): string | null {
    if (request.cookies && request.cookies.cs_sess) {
      return request.cookies.cs_sess;
    }
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
