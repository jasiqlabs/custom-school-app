import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SessionService } from '../../platform/auth/session.service';
import { SESSION_COOKIE } from './cookie.util';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly sessions:SessionService){}
  async canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest<any>(); req.auth=await this.sessions.resolve(req.cookies?.[SESSION_COOKIE],'PLATFORM_ADMIN',req.requestId); return true;}
}
@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(private readonly sessions:SessionService){}
  async canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest<any>(); req.auth=await this.sessions.resolve(req.cookies?.[SESSION_COOKIE],'OPERATOR',req.requestId); return true;}
}
