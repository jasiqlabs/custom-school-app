import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const cookieParser = require('cookie-parser');
import * as crypto from 'crypto';
import { json, urlencoded } from 'express';
import { ZodExceptionFilter } from './common/filters/zod-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Global Zod validation filter
  app.useGlobalFilters(new ZodExceptionFilter());

  // Cookie parser for session management
  app.use(cookieParser());

  // Correlation ID Middleware
  app.use((req: any, res: any, next: () => void) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Custom School App API running on port ${port}`);
}

if (require.main === module) {
  bootstrap();
}
