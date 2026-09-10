import { Body,Controller,Delete,Get,Param,Patch,Post,Query,Res,UploadedFile,UseGuards,UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { schoolCreateSchema,schoolUpdateSchema,principalSchema,uuidSchema } from '@custom-school/validation';
import { PlatformAdminGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { SchoolsService } from './schools.service';
import { ApiError } from '../../../common/http/api-error';
@Controller('platform/schools') @UseGuards(PlatformAdminGuard)
export class SchoolsController {
  constructor(private readonly schools:SchoolsService){}
  @Get() list(@Query()q:any){return this.schools.list({q:q.q,status:q.status,page:Number(q.page)||1,pageSize:Number(q.pageSize)||20});}
  @Post() @UseGuards(CsrfGuard) create(@CurrentSession()a:SessionActor,@Body()b:unknown){return this.schools.create(a,schoolCreateSchema.parse(b));}
  @Get(':schoolId') get(@Param('schoolId')id:string){return this.schools.get(uuidSchema.parse(id));}
  @Patch(':schoolId') @UseGuards(CsrfGuard) update(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@Body()b:unknown){return this.schools.update(a,uuidSchema.parse(id),schoolUpdateSchema.parse(b));}
  @Post(':schoolId/status') @UseGuards(CsrfGuard) status(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@Body()b:any){if(!['ACTIVE','INACTIVE'].includes(b?.status))throw new ApiError(422,'ERR_VALIDATION','Status must be ACTIVE or INACTIVE');return this.schools.setStatus(a,uuidSchema.parse(id),b.status);}
  @Post(':schoolId/logo') @UseGuards(CsrfGuard) @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024}})) logo(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@UploadedFile()file:any){return this.schools.uploadLogo(a,uuidSchema.parse(id),file);}
  @Get(':schoolId/logo') logoUrl(@Param('schoolId')id:string){return this.schools.logoUrl(uuidSchema.parse(id));}
  @Delete(':schoolId/logo') @UseGuards(CsrfGuard) async removeLogo(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@Res()res:Response){await this.schools.removeLogo(a,uuidSchema.parse(id));res.status(204).send();}
  @Post(':schoolId/principal') @UseGuards(CsrfGuard) principal(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@Body()b:unknown){return this.schools.upsertPrincipal(a,uuidSchema.parse(id),principalSchema.parse(b));}
  @Post(':schoolId/principal/signature') @UseGuards(CsrfGuard) @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024}})) signature(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@UploadedFile()file:any){return this.schools.uploadSignature(a,uuidSchema.parse(id),file);}
  @Get(':schoolId/principal/signature') signatureUrl(@Param('schoolId')id:string){return this.schools.signatureUrl(uuidSchema.parse(id));}
  @Delete(':schoolId/principal/signature') @UseGuards(CsrfGuard) async removeSignature(@CurrentSession()a:SessionActor,@Param('schoolId')id:string,@Res()res:Response){await this.schools.removeSignature(a,uuidSchema.parse(id));res.status(204).send();}
}
