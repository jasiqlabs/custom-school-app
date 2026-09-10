import { Injectable } from '@nestjs/common';
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}
function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return value;
}

@Injectable()
export class AppConfig {
  readonly nodeEnv = process.env.NODE_ENV || 'development';
  readonly port = int('PORT', 4000);
  readonly webOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
  readonly redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  readonly cookieSecure = (process.env.COOKIE_SECURE ?? (this.nodeEnv === 'production' ? 'true' : 'false')) === 'true';
  readonly sessionHmacSecret = required('SESSION_HMAC_SECRET');
  readonly duplicateConfirmationSecret = required('DUPLICATE_CONFIRMATION_SECRET');
  readonly loginMaxFailures = int('LOGIN_MAX_FAILURES', 5);
  readonly loginLockMinutes = int('LOGIN_LOCK_MINUTES', 15);
  readonly loginWindowMinutes = int('LOGIN_WINDOW_MINUTES', 15);
  readonly minio = {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: int('MINIO_PORT', 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: required('MINIO_ACCESS_KEY'),
    secretKey: required('MINIO_SECRET_KEY'),
    bucket: process.env.MINIO_BUCKET || 'gdys-private',
  };
  readonly encryptionActiveVersion = required('DATA_ENCRYPTION_ACTIVE_VERSION');
  readonly encryptionKeysJson = required('DATA_ENCRYPTION_KEYS_JSON');

  validateProduction(): void {
    for (const [name, value] of [['SESSION_HMAC_SECRET', this.sessionHmacSecret], ['DUPLICATE_CONFIRMATION_SECRET', this.duplicateConfirmationSecret]] as const) {
      if (Buffer.byteLength(value, 'utf8') < 32) throw new Error(`${name} must be at least 32 bytes`);
    }
    if (this.nodeEnv === 'production' && !this.cookieSecure) throw new Error('COOKIE_SECURE must be true in production');
  }
}
