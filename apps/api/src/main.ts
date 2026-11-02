import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { randomUUID } from 'crypto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const config = app.get(AppConfig); config.validateProduction();
  const express = app.getHttpAdapter().getInstance(); express.set('trust proxy', 1);
  app.use(cookieParser());
  app.enableCors({ origin: config.webOrigin, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'] });
  app.use((req: any, res: any, next: any) => {
    const started = process.hrtime.bigint();
    // Always generate the correlation ID at our trust boundary. A public caller
    // must not inject names, phone numbers or other sensitive text into log fields.
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'private, no-store');
    res.on('finish', () => {
      const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
      const statusCode = res.statusCode;
      const method = req.method || 'UNKNOWN';
      const path = String(req.route?.path || '/unmatched')
        .split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id')
        .replace(/\/\d+(?=\/|$)/g, '/:id').slice(0, 160);
      // Status, latency, request ID and coarse route only: no query, body, PII, SQL or cookies.
      console.log(JSON.stringify({
        level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
        event: 'http.response', requestId: req.requestId, method, route: path,
        statusCode, durationMs, ...(req.errorCode ? { code: req.errorCode } : {}),
      }));
    });
    next();
  });
  app.setGlobalPrefix('api/v1'); app.useGlobalFilters(new ApiExceptionFilter()); await app.listen(config.port, '0.0.0.0');
}
void bootstrap();
