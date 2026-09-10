import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req:any,res:any,next:()=>void){ const incoming=String(req.headers['x-request-id']||''); req.requestId=/^[A-Za-z0-9._-]{8,64}$/.test(incoming)?incoming:randomUUID(); res.setHeader('X-Request-Id',req.requestId); next(); }
}
