import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<any>();
    const request = host.switchToHttp().getRequest<any>();
    const requestId = request.requestId || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: any = null;

    if (exception instanceof ZodError) {
      status = 422;
      body = {
        code: 'ERR_VALIDATION',
        message: 'Request validation failed',
        details: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      body = exception.getResponse();
    } else if (typeof exception === 'object' && exception && (exception as any).name === 'PrismaClientKnownRequestError') {
      const pCode = (exception as any).code;
      if (pCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        const targets = (exception as any).meta?.target;
        const targetStr = Array.isArray(targets) ? targets.join(', ') : targets || 'unique constraint';
        body = {
          code: 'ERR_DUPLICATE',
          message: `A record with this ${targetStr} already exists.`,
        };
      } else if (pCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        body = {
          code: 'ERR_NOT_FOUND',
          message: 'The requested record was not found.',
        };
      } else if (pCode === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        body = {
          code: 'ERR_FOREIGN_KEY',
          message: 'Operation could not be completed because a related record was not found or is currently in use.',
        };
      }
    }

    if (status >= 500) {
      console.error('API 500 ERROR:', exception);
      console.error(
        JSON.stringify({
          level: 'error',
          requestId,
          path: request.url,
          code: 'UNHANDLED',
          name: (exception as any)?.name,
          message: (exception as any)?.message,
        })
      );
    }

    if (typeof body === 'object' && body) {
      response.status(status).json({ ...(body as object), requestId });
    } else {
      const msg = status === 500 ? ((exception as any)?.message || 'Unexpected server error') : String(body);
      response.status(status).json({
        code: status === 500 ? 'ERR_INTERNAL' : 'ERR_HTTP',
        message: msg,
        requestId,
      });
    }
  }
}
