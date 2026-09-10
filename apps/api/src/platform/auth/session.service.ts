import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppConfig } from '../../config/app-config';
import { ApiError } from '../../common/http/api-error';
import { SessionSubjectRegistry } from './session-subject.registry';
import type { SessionActor, SessionUserType } from '@custom-school/contracts';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService, private readonly config: AppConfig, private readonly subjects: SessionSubjectRegistry) {}

  hashToken(token:string){return createHmac('sha256',this.config.sessionHmacSecret).update(token).digest('hex');}
  hashTelemetry(value:string){return createHmac('sha256',this.config.sessionHmacSecret).update(`telemetry:${value}`).digest('hex');}

  async create(input:{userType:SessionUserType;userId:string;schoolId:string|null;accountVersion:number;schoolAccessVersion?:number|null}, tx:any=this.prisma){
    const token=randomBytes(32).toString('base64url');
    const hours=input.userType==='PLATFORM_ADMIN'?4:8;
    const expiresAt=new Date(Date.now()+hours*3600_000);
    const row=await tx.userSession.create({data:{userType:input.userType,userId:input.userId,schoolId:input.schoolId,tokenHash:this.hashToken(token),expiresAt,accountVersion:input.accountVersion,schoolAccessVersion:input.schoolAccessVersion??null}});
    return {token,sessionId:row.id,expiresAt};
  }

  async resolve(token:string|undefined, expected:SessionUserType, requestId:string):Promise<SessionActor>{
    if(!token) throw new ApiError(401,'ERR_AUTH_REQUIRED','Authentication required');
    const session=await this.prisma.userSession.findUnique({where:{tokenHash:this.hashToken(token)}});
    if(!session||session.userType!==expected||session.revokedAt||session.expiresAt.getTime()<=Date.now()) throw new ApiError(401,'ERR_SESSION_INVALID','Session expired or invalid');
    const subjectValid=await this.subjects.validate({userType:expected,userId:session.userId,schoolId:session.schoolId,accountVersion:session.accountVersion,schoolAccessVersion:session.schoolAccessVersion});
    if(!subjectValid){await this.revokeById(session.id,'ACCOUNT_OR_SCHOOL_STATE_CHANGED');throw new ApiError(401,'ERR_SESSION_INVALID','Session expired or invalid');}
    const hours=expected==='PLATFORM_ADMIN'?4:8;
    if(Date.now()-session.lastSeenAt.getTime()>5*60_000){await this.prisma.userSession.update({where:{id:session.id},data:{lastSeenAt:new Date(),expiresAt:new Date(Date.now()+hours*3600_000)}});}
    return {userType:expected,userId:session.userId,schoolId:session.schoolId,sessionId:session.id,requestId};
  }

  async revokeById(id:string, reason:string, tx:any=this.prisma){await tx.userSession.updateMany({where:{id,revokedAt:null},data:{revokedAt:new Date(),revocationReason:reason}});}
  async revokeCurrent(id:string, reason='LOGOUT', tx:any=this.prisma){await this.revokeById(id,reason,tx);}
  async revokeUser(userType:SessionUserType,userId:string,reason:string,tx:any=this.prisma){await tx.userSession.updateMany({where:{userType,userId,revokedAt:null},data:{revokedAt:new Date(),revocationReason:reason}});}
  async revokeSchool(schoolId:string,reason:string,tx:any=this.prisma){await tx.userSession.updateMany({where:{userType:'OPERATOR',schoolId,revokedAt:null},data:{revokedAt:new Date(),revocationReason:reason}});}
}
