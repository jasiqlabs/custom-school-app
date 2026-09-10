import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const forbidden=/password|token|secret|aadhaar|pan|accountnumber|ciphertext|authorization|cookie/i;
function sanitize(value:unknown):unknown{
  if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
  if(Array.isArray(value))return value.slice(0,50).map(sanitize);
  if(typeof value==='object'){const out:Record<string,unknown>={}; for(const [k,v] of Object.entries(value as Record<string,unknown>)){if(forbidden.test(k))continue; out[k]=sanitize(v);} return out;}
  return String(value);
}
export type DbClient=Prisma.TransactionClient|PrismaClient|PrismaService;
@Injectable()
export class AuditService {
  constructor(private readonly prisma:PrismaService){}
  async latestForSchool(schoolId:string){return this.prisma.auditLog.findFirst({where:{schoolId},orderBy:{occurredAt:'desc'},select:{occurredAt:true}});}
  async append(input:{requestId:string;schoolId?:string|null;actorType:string;actorId?:string|null;eventType:string;targetType?:string;targetId?:string;metadata?:unknown;ipHash?:string|null},tx:DbClient=this.prisma){await (tx as any).auditLog.create({data:{requestId:input.requestId,schoolId:input.schoolId??null,actorType:input.actorType,actorId:input.actorId??null,eventType:input.eventType,targetType:input.targetType,targetId:input.targetId,metadata:input.metadata===undefined?undefined:sanitize(input.metadata),ipHash:input.ipHash??null}});}
}
