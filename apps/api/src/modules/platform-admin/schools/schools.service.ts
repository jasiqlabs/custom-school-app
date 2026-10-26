import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AppConfig } from '../../../config/app-config';
import { AuditService } from '../../../platform/audit/audit.service';
import { PrivateFileService } from '../../../platform/files/private-file.service';
import { ApiError } from '../../../common/http/api-error';
import { SessionService } from '../../../platform/auth/session.service';
import { normalizeHumanName,normalizeKey } from '@custom-school/validation';
import type { SessionActor, SchoolReadinessDto, ReadinessCheckItem, SchoolActivateInput, SchoolStatus } from '@custom-school/contracts';

export function generateSchoolUuid(): string {
  return randomUUID();
}

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma:PrismaService,private readonly config:AppConfig,private readonly audit:AuditService,private readonly files:PrivateFileService,private readonly sessions:SessionService){}
  private signDuplicate(payload:object){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');const sig=createHmac('sha256',this.config.duplicateConfirmationSecret).update(body).digest('base64url');return `${body}.${sig}`;}
  private verifyDuplicate(token:string,expected:{name:string;adminId:string}){const [body,sig]=token.split('.');if(!body||!sig)throw new ApiError(409,'ERR_SCHOOL_DUPLICATE_CONFIRMATION_INVALID','Duplicate confirmation is invalid');const actual=createHmac('sha256',this.config.duplicateConfirmationSecret).update(body).digest('base64url');if(actual.length!==sig.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(sig)))throw new ApiError(409,'ERR_SCHOOL_DUPLICATE_CONFIRMATION_INVALID','Duplicate confirmation is invalid');let data:any;try{data=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));}catch{throw new ApiError(409,'ERR_SCHOOL_DUPLICATE_CONFIRMATION_INVALID','Duplicate confirmation is invalid');}if(data.name!==expected.name||data.adminId!==expected.adminId||Number(data.exp)<Date.now())throw new ApiError(409,'ERR_SCHOOL_DUPLICATE_CONFIRMATION_INVALID','Duplicate confirmation is invalid');return data;}
  async create(actor:SessionActor,input:any){const normalizedName=normalizeKey(input.name);const candidates=await this.prisma.school.findMany({where:{normalizedName},select:{id:true,name:true,status:true},take:10});if(candidates.length){if(!input.duplicateConfirmationToken){const token=this.signDuplicate({name:normalizedName,adminId:actor.userId,candidates:candidates.map(c=>c.id).sort(),exp:Date.now()+10*60_000});throw new ApiError(409,'ERR_SCHOOL_DUPLICATE_CONFIRMATION_REQUIRED','A school with a similar name already exists',{candidates,duplicateConfirmationToken:token});}const signed=this.verifyDuplicate(input.duplicateConfirmationToken,{name:normalizedName,adminId:actor.userId});const current=candidates.map(c=>c.id).sort();if(JSON.stringify(current)!==JSON.stringify(signed.candidates))throw new ApiError(409,'ERR_SCHOOL_DUPLICATE_CONFIRMATION_INVALID','Duplicate candidates changed; confirm again');}
    return (this.prisma.$transaction(async (tx: any)=>{let id=generateSchoolUuid();while(await tx.school.findUnique({where:{id}})){id=generateSchoolUuid();}const school=await tx.school.create({data:{id,name:normalizeHumanName(input.name),normalizedName,address:input.address||null,phone:input.phone||null,email:input.email||null,udiseNumber:input.udiseNumber||null,schoolCode:input.schoolCode||null,affiliationNumber:input.affiliationNumber||null,status:'DRAFT'}});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:school.id,eventType:'SCHOOL_CREATED',targetType:'SCHOOL',targetId:school.id,metadata:{name:school.name,status:school.status}},tx as any);return school;})) as Promise<any>;}
  async list(query:{q?:string;status?:string;page?:number;pageSize?:number}){const page=Math.max(1,query.page||1);const pageSize=Math.min(100,Math.max(1,query.pageSize||20));const q=(query.q||'').trim();const where:any={};if(query.status&&['DRAFT','ACTIVE','INACTIVE'].includes(query.status))where.status=query.status;if(q){where.OR=[{name:{contains:q,mode:'insensitive'}},{id:{contains:q,mode:'insensitive'}}];}const [total,items]=await this.prisma.$transaction([this.prisma.school.count({where}),this.prisma.school.findMany({where,orderBy:{createdAt:'desc'},skip:(page-1)*pageSize,take:pageSize,include:{_count:{select:{operators:true}}}})]);return{items,total,page,pageSize,pages:Math.ceil(total/pageSize)};}
  async get(id:string){const school=await this.prisma.school.findUnique({where:{id},include:{principal:true,_count:{select:{operators:true,classes:true,sections:true}}}});if(!school)throw new ApiError(404,'ERR_SCHOOL_NOT_FOUND','School not found');return school;}
  async update(actor:SessionActor,id:string,input:any){return this.prisma.$transaction(async (tx: any)=>{const current=await tx.school.findUnique({where:{id}});if(!current)throw new ApiError(404,'ERR_SCHOOL_NOT_FOUND','School not found');if(current.version!==input.version)throw new ApiError(409,'ERR_VERSION_CONFLICT','School was changed by another user');const data:any={version:{increment:1}};for(const k of ['address','phone','email','udiseNumber','schoolCode','affiliationNumber'] as const)if(k in input)data[k]=input[k]||null;if(input.name!==undefined){data.name=normalizeHumanName(input.name);data.normalizedName=normalizeKey(input.name);}const school=await tx.school.update({where:{id},data});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:'SCHOOL_PROFILE_UPDATED',targetType:'SCHOOL',targetId:id,metadata:{fields:Object.keys(input).filter(k=>k!=='version')}},tx as any);return school;});}
  async setStatus(actor:SessionActor,id:string,status:'ACTIVE'|'INACTIVE'){return this.prisma.$transaction(async (tx: any)=>{await (tx as any).$queryRaw`SELECT id FROM schools WHERE id=${id} FOR UPDATE`;const school=await tx.school.findUnique({where:{id}});if(!school)throw new ApiError(404,'ERR_SCHOOL_NOT_FOUND','School not found');if(school.status===status)return school;if(status==='ACTIVE'&&school.status!=='DRAFT'&&school.status!=='INACTIVE')throw new ApiError(409,'ERR_SCHOOL_STATE','Invalid school lifecycle transition');const updated=await tx.school.update({where:{id},data:{status,accessVersion:{increment:1},version:{increment:1}}});if(status==='INACTIVE')await this.sessions.revokeSchool(id,'SCHOOL_DEACTIVATED',tx);await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:`SCHOOL_${status}`,targetType:'SCHOOL',targetId:id},tx as any);return updated;});}
  async getReadiness(id: string): Promise<SchoolReadinessDto> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        principal: true,
        operators: { select: { id: true, status: true } },
        classes: {
          where: { status: 'ACTIVE' },
          include: { sections: { where: { status: 'ACTIVE' } } },
        },
      },
    });
    if (!school) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');

    const academicSessions = await this.prisma.academicSession.findMany({
      where: { schoolId: id },
      select: { id: true, code: true, label: true, status: true },
    });

    const activeSessions = academicSessions.filter((s: any) => s.status === 'ACTIVE');
    const totalClasses = school.classes.length;
    const totalSections = school.classes.reduce((sum: number, c: any) => sum + c.sections.length, 0);
    const activeOperators = school.operators.filter((o: any) => o.status === 'ACTIVE');
    const isLegacyActive = school.status === 'ACTIVE';

    const checks: ReadinessCheckItem[] = [
      {
        code: 'ACADEMIC_SESSION',
        label: 'Academic Session Configured',
        severity: isLegacyActive ? 'WARNING' : 'BLOCKER',
        satisfied: academicSessions.length > 0,
        details: academicSessions.length > 0
          ? `${academicSessions.length} session(s) (${activeSessions.length} active: ${activeSessions.map((s: any) => s.code).join(', ') || 'None active'})`
          : 'No academic session exists. An academic session must be created before activation.',
        actionUrl: `/admin/schools/${id}/academics`,
      },
      {
        code: 'CLASSES',
        label: 'Active Classes Configured',
        severity: isLegacyActive ? 'WARNING' : 'BLOCKER',
        satisfied: totalClasses > 0,
        details: totalClasses > 0
          ? `${totalClasses} active class(es) defined`
          : 'At least one class is required before student enrollment.',
        actionUrl: `/admin/schools/${id}/academics`,
      },
      {
        code: 'SECTIONS',
        label: 'Active Sections Configured',
        severity: isLegacyActive ? 'WARNING' : 'BLOCKER',
        satisfied: totalSections > 0,
        details: totalSections > 0
          ? `${totalSections} active section(s) defined`
          : 'At least one class section is required.',
        actionUrl: `/admin/schools/${id}/academics`,
      },
      {
        code: 'OPERATOR',
        label: 'School Operator Provisioned',
        severity: 'WARNING',
        satisfied: activeOperators.length > 0,
        details: activeOperators.length > 0
          ? `${activeOperators.length} active operator(s) provisioned`
          : 'No operator provisioned. School operator can be created after activation.',
        actionUrl: `/admin/schools/${id}/operators`,
      },
      {
        code: 'SCHOOL_PROFILE',
        label: 'School Contact & Identity Details',
        severity: 'WARNING',
        satisfied: Boolean(school.address && school.phone && school.email),
        details: (school.address && school.phone && school.email)
          ? 'Address, contact phone, and official email provided'
          : 'School profile is missing one or more contact details (address, phone, or email).',
      },
      {
        code: 'PRINCIPAL',
        label: 'School Principal Profile',
        severity: 'WARNING',
        satisfied: Boolean(school.principal?.name),
        details: school.principal?.name
          ? `Principal: ${school.principal.name}`
          : 'Principal details have not been recorded.',
      },
    ];

    const hasBlockers = checks.some(c => !c.satisfied && c.severity === 'BLOCKER');
    const hasWarnings = checks.some(c => !c.satisfied && c.severity === 'WARNING');
    const ready = !hasBlockers;

    return {
      schoolId: id,
      status: school.status as SchoolStatus,
      version: school.version,
      ready,
      hasBlockers,
      hasWarnings,
      checks,
    };
  }

  async activate(actor: SessionActor, id: string, input: SchoolActivateInput) {
    return this.prisma.$transaction(async (tx: any) => {
      await (tx as any).$queryRaw`SELECT id FROM schools WHERE id=${id} FOR UPDATE`;
      const current = await tx.school.findUnique({ where: { id } });
      if (!current) throw new ApiError(404, 'ERR_SCHOOL_NOT_FOUND', 'School not found');
      if (current.version !== input.expectedVersion) {
        throw new ApiError(409, 'ERR_VERSION_CONFLICT', 'School was updated by another administrator. Please refresh readiness and review.');
      }
      if (current.status === 'ACTIVE') return current;

      const readiness = await this.getReadiness(id);
      if (readiness.hasBlockers) {
        const failing = readiness.checks.filter(c => !c.satisfied && c.severity === 'BLOCKER');
        throw new ApiError(422, 'ERR_READINESS_BLOCKERS', 'Cannot activate school: mandatory go-live criteria are not satisfied.', { blockers: failing });
      }

      if (readiness.hasWarnings && !input.confirmWarnings) {
        const warnings = readiness.checks.filter(c => !c.satisfied && c.severity === 'WARNING');
        throw new ApiError(409, 'ERR_WARNINGS_UNCONFIRMED', 'School has unconfirmed readiness warnings. Please confirm to proceed with activation.', { warnings });
      }

      const updated = await tx.school.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          accessVersion: { increment: 1 },
          version: { increment: 1 },
        },
      });

      await this.audit.append({
        requestId: actor.requestId,
        actorType: 'PLATFORM_ADMIN',
        actorId: actor.userId,
        schoolId: id,
        eventType: 'SCHOOL_ACTIVATED',
        targetType: 'SCHOOL',
        targetId: id,
        metadata: {
          readinessVersion: current.version,
          warningsConfirmed: Boolean(input.confirmWarnings),
          satisfiedChecks: readiness.checks.filter(c => c.satisfied).map(c => c.code),
        },
      }, tx as any);

      return updated;
    });
  }
  async uploadLogo(actor:SessionActor,id:string,file:any){await this.get(id);if(!file?.buffer)throw new ApiError(422,'ERR_FILE_REQUIRED','Logo file is required');const stored=await this.files.storeImage({schoolId:id,fileType:'LOGO',buffer:file.buffer,mime:file.mimetype,createdBy:actor.userId});await this.prisma.$transaction(async (tx: any)=>{await tx.school.update({where:{id},data:{logoFileId:stored.id,version:{increment:1}}});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:'SCHOOL_LOGO_UPDATED',targetType:'SCHOOL',targetId:id,metadata:{fileId:stored.id,sha256:stored.sha256}},tx as any);});return{fileId:stored.id};}
  async logoUrl(id:string){const school=await this.get(id);if(!school.logoFileId)throw new ApiError(404,'ERR_LOGO_NOT_FOUND','Logo not found');return this.files.signedUrl(school.logoFileId,id);}
  async removeLogo(actor:SessionActor,id:string){return this.prisma.$transaction(async (tx: any)=>{const school=await tx.school.findUnique({where:{id}});if(!school)throw new ApiError(404,'ERR_SCHOOL_NOT_FOUND','School not found');await tx.school.update({where:{id},data:{logoFileId:null,version:{increment:1}}});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:'SCHOOL_LOGO_REMOVED',targetType:'SCHOOL',targetId:id},tx as any);});}
  async upsertPrincipal(actor:SessionActor,id:string,input:any){await this.get(id);return this.prisma.$transaction(async (tx: any)=>{const principal=await tx.schoolPrincipal.upsert({where:{schoolId:id},create:{schoolId:id,name:normalizeHumanName(input.name),phone:input.phone||null,email:input.email||null},update:{name:normalizeHumanName(input.name),phone:input.phone||null,email:input.email||null}});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:'PRINCIPAL_UPDATED',targetType:'SCHOOL_PRINCIPAL',targetId:principal.id},tx as any);return principal;});}
  async uploadSignature(actor:SessionActor,id:string,file:any){const school=await this.get(id);if(!school.principal)throw new ApiError(409,'ERR_PRINCIPAL_REQUIRED','Save principal details first');if(!file?.buffer)throw new ApiError(422,'ERR_FILE_REQUIRED','Signature file is required');const stored=await this.files.storeImage({schoolId:id,fileType:'SIGNATURE',buffer:file.buffer,mime:file.mimetype,createdBy:actor.userId});await this.prisma.$transaction(async (tx: any)=>{await tx.schoolPrincipal.update({where:{schoolId:id},data:{signatureFileId:stored.id}});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:'PRINCIPAL_SIGNATURE_UPDATED',targetType:'SCHOOL_PRINCIPAL',targetId:school.principal!.id,metadata:{fileId:stored.id,sha256:stored.sha256}},tx as any);});return{fileId:stored.id};}
  async signatureUrl(id:string){const school=await this.get(id);if(!school.principal?.signatureFileId)throw new ApiError(404,'ERR_SIGNATURE_NOT_FOUND','Signature not found');return this.files.signedUrl(school.principal.signatureFileId,id);}
  async logoBuffer(id:string){const school=await this.get(id);if(!school.logoFileId)throw new ApiError(404,'ERR_LOGO_NOT_FOUND','Logo not found');return this.files.readInternal(school.logoFileId,id);}
  async signatureBuffer(id:string){const school=await this.get(id);if(!school.principal?.signatureFileId)throw new ApiError(404,'ERR_SIGNATURE_NOT_FOUND','Signature not found');return this.files.readInternal(school.principal.signatureFileId,id);}
  async removeSignature(actor:SessionActor,id:string){return this.prisma.$transaction(async (tx: any)=>{const p=await tx.schoolPrincipal.findUnique({where:{schoolId:id}});if(!p)throw new ApiError(404,'ERR_PRINCIPAL_NOT_FOUND','Principal not found');await tx.schoolPrincipal.update({where:{schoolId:id},data:{signatureFileId:null}});await this.audit.append({requestId:actor.requestId,actorType:'PLATFORM_ADMIN',actorId:actor.userId,schoolId:id,eventType:'PRINCIPAL_SIGNATURE_REMOVED',targetType:'SCHOOL_PRINCIPAL',targetId:p.id},tx as any);});}
}
