import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { SessionService } from './session.service';
import { ApiError } from '../../common/http/api-error';
import type { SessionUserType } from '@custom-school/contracts';

@Injectable()
export class AuthRateService implements OnModuleDestroy {
  private readonly redis:Redis;
  constructor(private readonly prisma:PrismaService,private readonly config:AppConfig,private readonly sessions:SessionService){this.redis=new Redis(config.redisUrl,{lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false});}
  async onModuleDestroy(){this.redis.disconnect();}
  private hashes(email:string,ip:string){return {identifierHash:this.sessions.hashTelemetry(email.trim().toLowerCase()),ipHash:this.sessions.hashTelemetry(ip||'unknown')};}
  async assertLoginAllowed(userType:SessionUserType,email:string,ip:string){const {identifierHash,ipHash}=this.hashes(email,ip); const key=`gdys:login:${userType}:${identifierHash}:${ipHash}`; try{if(this.redis.status==='wait')await this.redis.connect(); const count=await this.redis.get(key); if(Number(count||0)>=this.config.loginMaxFailures*2) throw new ApiError(429,'ERR_RATE_LIMIT','Too many login attempts'); return;}catch(error){if(error instanceof ApiError)throw error;}
    const since=new Date(Date.now()-this.config.loginWindowMinutes*60_000); const count=await this.prisma.loginAttempt.count({where:{userType,attemptedAt:{gte:since},success:false,OR:[{identifierHash},{ipHash}]}}); if(count>=this.config.loginMaxFailures*2)throw new ApiError(429,'ERR_RATE_LIMIT','Too many login attempts');
  }
  async record(userType:SessionUserType,email:string,ip:string,success:boolean,reason?:string){const {identifierHash,ipHash}=this.hashes(email,ip); await this.prisma.loginAttempt.create({data:{userType,identifierHash,ipHash,success,reason}}); const key=`gdys:login:${userType}:${identifierHash}:${ipHash}`; try{if(this.redis.status==='wait')await this.redis.connect(); if(success){await this.redis.del(key);}else{const multi=this.redis.multi().incr(key).expire(key,this.config.loginWindowMinutes*60);await multi.exec();}}catch{/* DB telemetry remains authoritative fallback */}}

  async assertResetAllowed(email:string,ip:string){const {identifierHash,ipHash}=this.hashes(email,ip);const key=`gdys:reset:${identifierHash}:${ipHash}`;try{if(this.redis.status==='wait')await this.redis.connect();const count=await this.redis.get(key);if(Number(count||0)>=3)throw new ApiError(429,'ERR_RATE_LIMIT','Too many reset requests');return;}catch(error){if(error instanceof ApiError)throw error;}const since=new Date(Date.now()-3600_000);const count=await this.prisma.loginAttempt.count({where:{userType:'OPERATOR',identifierHash,attemptedAt:{gte:since},reason:'RESET_REQUEST'}});if(count>=3)throw new ApiError(429,'ERR_RATE_LIMIT','Too many reset requests');}
  async recordReset(email:string,ip:string){const {identifierHash,ipHash}=this.hashes(email,ip);await this.prisma.loginAttempt.create({data:{userType:'OPERATOR',identifierHash,ipHash,success:true,reason:'RESET_REQUEST'}});const key=`gdys:reset:${identifierHash}:${ipHash}`;try{if(this.redis.status==='wait')await this.redis.connect();const multi=this.redis.multi().incr(key).expire(key,3600);await multi.exec();}catch{}}
  ipHash(ip:string){return this.sessions.hashTelemetry(ip||'unknown');}
}
