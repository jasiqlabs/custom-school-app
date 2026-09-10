import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { ApiError } from '../http/api-error';
import { CSRF_COOKIE } from './cookie.util';
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest<any>(); const cookie=String(req.cookies?.[CSRF_COOKIE]||''); const header=String(req.headers['x-csrf-token']||''); if(!cookie||!header||cookie.length!==header.length||!timingSafeEqual(Buffer.from(cookie),Buffer.from(header))) throw new ApiError(403,'ERR_CSRF','CSRF validation failed'); return true;}
}
