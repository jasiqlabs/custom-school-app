import { HttpException } from '@nestjs/common';
export class ApiError extends HttpException {
  constructor(status: number, public readonly code: string, message: string, public readonly details?: unknown) {
    super({ code, message, ...(details === undefined ? {} : { details }) }, status);
  }
}
