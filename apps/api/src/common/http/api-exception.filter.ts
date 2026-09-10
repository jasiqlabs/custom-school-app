import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<any>();
    const request = host.switchToHttp().getRequest<any>();
    const requestId = request.requestId || randomUUID();
    const status = exception instanceof ZodError ? 422 : exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof ZodError ? {code:'ERR_VALIDATION',message:'Request validation failed',details:exception.issues.map(i=>({path:i.path.join('.'),message:i.message}))} : exception instanceof HttpException ? exception.getResponse() : null;
    if (status >= 500) console.error(JSON.stringify({ level:'error', requestId, path:request.url, code:'UNHANDLED', name:(exception as any)?.name }));
    if (typeof body === 'object' && body) response.status(status).json({ ...(body as object), requestId });
    else response.status(status).json({ code: status === 500 ? 'ERR_INTERNAL' : 'ERR_HTTP', message: status === 500 ? 'Unexpected server error' : String(body), requestId });
  }
}
