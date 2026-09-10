import { Body,Controller,Delete,Get,Param,Patch,Post,Res,UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { academicCreateSchema,academicUpdateSchema,uuidSchema } from '@custom-school/validation';
import { PlatformAdminGuard } from '../../../common/security/session.guard';import { CsrfGuard } from '../../../common/security/csrf.guard';import { CurrentSession } from '../../../common/security/current-session.decorator';import type { SessionActor } from '@custom-school/contracts';import { AcademicsService } from './academics.service';
@Controller('platform/schools/:schoolId/classes') @UseGuards(PlatformAdminGuard)
export class AcademicsController{
 constructor(private readonly service:AcademicsService){}
 @Get() list(@Param('schoolId')s:string){return this.service.listClasses(uuidSchema.parse(s));}
 @Post() @UseGuards(CsrfGuard) create(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Body()b:unknown){return this.service.createClass(a,uuidSchema.parse(s),academicCreateSchema.parse(b));}
 @Patch(':classId') @UseGuards(CsrfGuard) update(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('classId')c:string,@Body()b:unknown){return this.service.updateClass(a,uuidSchema.parse(s),uuidSchema.parse(c),academicUpdateSchema.parse(b));}
 @Delete(':classId') @UseGuards(CsrfGuard) async del(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('classId')c:string,@Res()res:Response){await this.service.deleteClass(a,uuidSchema.parse(s),uuidSchema.parse(c));res.status(204).send();}
 @Post(':classId/sections') @UseGuards(CsrfGuard) createSection(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('classId')c:string,@Body()b:unknown){return this.service.createSection(a,uuidSchema.parse(s),uuidSchema.parse(c),academicCreateSchema.parse(b));}
 @Patch(':classId/sections/:sectionId') @UseGuards(CsrfGuard) updateSection(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('classId')c:string,@Param('sectionId')x:string,@Body()b:unknown){return this.service.updateSection(a,uuidSchema.parse(s),uuidSchema.parse(c),uuidSchema.parse(x),academicUpdateSchema.parse(b));}
 @Delete(':classId/sections/:sectionId') @UseGuards(CsrfGuard) async deleteSection(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('classId')c:string,@Param('sectionId')x:string,@Res()res:Response){await this.service.deleteSection(a,uuidSchema.parse(s),uuidSchema.parse(c),uuidSchema.parse(x));res.status(204).send();}
}
