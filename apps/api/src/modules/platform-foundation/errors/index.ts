import { HttpException, HttpStatus } from '@nestjs/common';

export class TenantBoundaryException extends HttpException {
  constructor(message = 'Resource not found in tenant scope') {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        errorCode: 'ERR_TENANT_CROSS_SCHOOL',
        message,
      },
      HttpStatus.NOT_FOUND
    );
  }
}

export class SessionExpiredException extends HttpException {
  constructor(message = 'Session has expired or was revoked') {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        errorCode: 'ERR_AUTH_SESSION_EXPIRED',
        message,
      },
      HttpStatus.UNAUTHORIZED
    );
  }
}

export class UnauthorizedPlaneException extends HttpException {
  constructor(message = 'Access to this plane is forbidden for current role') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        errorCode: 'ERR_AUTH_PLANE_FORBIDDEN',
        message,
      },
      HttpStatus.FORBIDDEN
    );
  }
}
