import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter — sanitized internal errors', () => {
  it('does not expose database SQL or Prisma internals to the browser', () => {
    const status = jest.fn();
    const json = jest.fn();
    status.mockReturnValue({ json });
    const host: any = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ requestId: 'request-123', url: '/api/v1/fees/payments' }),
      }),
    };
    const logger = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      new ApiExceptionFilter().catch(
        new Error('Invalid prisma.$queryRaw invocation: ERROR: operator does not exist: uuid = text'),
        host,
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        code: 'ERR_INTERNAL',
        message: 'Unexpected server error. Please retry or contact support with the request ID.',
        requestId: 'request-123',
      });
    } finally {
      logger.mockRestore();
    }
  });
});
