import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { randomUUID } from 'crypto';

async function bootstrap(){
  const app=await NestFactory.create(AppModule,{bodyParser:true});
  const config=app.get(AppConfig);config.validateProduction();
  const express=app.getHttpAdapter().getInstance();express.set('trust proxy',1);
  app.use(cookieParser());
  app.enableCors({origin:config.webOrigin,credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','X-CSRF-Token','X-Request-Id']});
  app.use((req:any,res:any,next:any)=>{req.requestId=/^[A-Za-z0-9._-]{8,64}$/.test(String(req.headers['x-request-id']||''))?String(req.headers['x-request-id']):randomUUID();res.setHeader('X-Request-Id',req.requestId);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");res.setHeader('Cache-Control','private, no-store');next();});
  app.setGlobalPrefix('api/v1');app.useGlobalFilters(new ApiExceptionFilter());await app.listen(config.port,'0.0.0.0');
}
void bootstrap();
