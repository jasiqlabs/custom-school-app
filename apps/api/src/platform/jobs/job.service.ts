import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';

@Injectable()
export class JobService implements OnModuleInit,OnModuleDestroy {
  private readonly connection:Redis; private readonly queue:Queue; private timer?:NodeJS.Timeout; private draining=false;
  constructor(private readonly prisma:PrismaService,config:AppConfig){this.connection=new Redis(config.redisUrl,{maxRetriesPerRequest:null});this.queue=new Queue('gdys-jobs',{connection:this.connection as any});}
  onModuleInit(){this.timer=setInterval(()=>void this.drainOutbox(),5000);void this.drainOutbox();}
  async onModuleDestroy(){if(this.timer)clearInterval(this.timer);await this.queue.close();this.connection.disconnect();}
  async drainOutbox(){if(this.draining)return;this.draining=true;try{const rows=await this.prisma.jobOutbox.findMany({where:{deliveredAt:null},orderBy:{createdAt:'asc'},take:50});for(const row of rows){try{const existing=await this.queue.getJob(row.jobId);if(existing){const state=await existing.getState();if(state==='failed'||state==='completed')await existing.remove();else{await this.prisma.jobOutbox.update({where:{id:row.id},data:{deliveredAt:new Date(),attemptCount:{increment:1},lastErrorCode:null}});continue;}}await this.queue.add('job',{jobId:row.jobId},{jobId:row.jobId,attempts:5,backoff:{type:'exponential',delay:1000},removeOnComplete:500,removeOnFail:1000});await this.prisma.jobOutbox.update({where:{id:row.id},data:{deliveredAt:new Date(),attemptCount:{increment:1},lastErrorCode:null}});}catch{await this.prisma.jobOutbox.update({where:{id:row.id},data:{attemptCount:{increment:1},lastErrorCode:'QUEUE_DISPATCH_FAILED'}}).catch(()=>undefined);}}}finally{this.draining=false;}}


  async resetForRetryInTransaction(tx:any,jobId:string){await tx.job.update({where:{id:jobId},data:{status:'QUEUED',errorCode:null,leaseUntil:null}});await tx.jobOutbox.upsert({where:{jobId},create:{jobId,queueName:'gdys-jobs'},update:{deliveredAt:null,lastErrorCode:null}});}
  async createInTransaction(tx:any,input:{id:string;schoolId:string|null;actorType:string;actorId:string;jobType:'TC_PDF'|'REPORT_XLSX'|'STUDENT_IMPORT_VALIDATE'|'STUDENT_IMPORT_ERROR_EXPORT';inputSnapshot?:unknown;inputEncrypted?:string;keyVersion?:string}){await tx.job.create({data:{id:input.id,schoolId:input.schoolId,actorType:input.actorType,actorId:input.actorId,jobType:input.jobType,status:'QUEUED',inputSnapshot:input.inputSnapshot as any,inputEncrypted:input.inputEncrypted,keyVersion:input.keyVersion}});await tx.jobOutbox.create({data:{jobId:input.id,queueName:'gdys-jobs'}});}
  async requeue(jobId:string){await this.prisma.jobOutbox.upsert({where:{jobId},create:{jobId,queueName:'gdys-jobs'},update:{deliveredAt:null,lastErrorCode:null}});void this.drainOutbox();}
}
