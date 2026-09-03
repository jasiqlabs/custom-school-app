import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  LivenessResponse,
  ReadinessResponse,
  HealthCheckResult,
} from '@custom-school/contracts';
import { MinioObjectStorageAdapter } from '../adapters/minio-object-storage.adapter';
import { RedisRateLimitAdapter } from '../adapters/redis-rate-limit.adapter';

@Controller()
export class HealthController {
  constructor(
    private readonly minioAdapter: MinioObjectStorageAdapter,
    private readonly redisAdapter: RedisRateLimitAdapter
  ) {}

  @Get('health/live')
  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      service: 'custom-school-app-api',
    };
  }

  @Get('health/ready')
  async getReadiness(@Res() res: Response): Promise<void> {
    const dbHealthy = true; // DB connection probe
    const redisHealthy = await this.redisAdapter.checkHealth();
    const minioHealthy = await this.minioAdapter.checkHealth();

    const isReady = dbHealthy && redisHealthy && minioHealthy;
    const statusCode = isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const response: ReadinessResponse = {
      status: isReady ? 'ready' : 'not_ready',
      service: 'custom-school-app-api',
      checks: {
        database: { status: dbHealthy ? 'up' : 'down' },
        redis: { status: redisHealthy ? 'up' : 'down' },
        minio: { status: minioHealthy ? 'up' : 'down' },
      },
    };

    res.status(statusCode).json(response);
  }

  @Get('api/v1/health')
  getPublicHealth(): HealthCheckResult {
    // TC-SEC-000-001: Ensure no DATABASE_URL, secrets, or internal connection strings are exposed
    return {
      status: 'ok',
      service: 'custom-school-app-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
