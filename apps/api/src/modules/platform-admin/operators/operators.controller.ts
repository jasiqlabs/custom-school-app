import { Body,Controller,Get,Param,Patch,Post,UseGuards } from '@nestjs/common';
import { operatorCreateSchema,operatorUpdateSchema,resetPasswordSchema,uuidSchema } from '@custom-school/validation';
import { PlatformAdminGuard } from '../../../common/security/session.guard';import { CsrfGuard } from '../../../common/security/csrf.guard';import { CurrentSession } from '../../../common/security/current-session.decorator';import type { SessionActor } from '@custom-school/contracts';import { OperatorsService } from './operators.service';import { ApiError } from '../../../common/http/api-error';
@Controller('platform/schools/:schoolId/operators') @UseGuards(PlatformAdminGuard)
export class OperatorsController{
 constructor(private readonly service:OperatorsService){}
 @Get() list(@Param('schoolId')s:string){return this.service.list(uuidSchema.parse(s));}
 @Post() @UseGuards(CsrfGuard) create(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Body()b:unknown){return this.service.create(a,uuidSchema.parse(s),operatorCreateSchema.parse(b));}
 @Patch(':operatorId') @UseGuards(CsrfGuard) update(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('operatorId')o:string,@Body()b:unknown){return this.service.update(a,uuidSchema.parse(s),uuidSchema.parse(o),operatorUpdateSchema.parse(b));}
 @Post(':operatorId/status') @UseGuards(CsrfGuard) status(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('operatorId')o:string,@Body()b:any){if(!['ACTIVE','INACTIVE'].includes(b?.status))throw new ApiError(422,'ERR_VALIDATION','Status must be ACTIVE or INACTIVE');return this.service.setStatus(a,uuidSchema.parse(s),uuidSchema.parse(o),b.status);}
 @Post(':operatorId/reset-password') @UseGuards(CsrfGuard) reset(@CurrentSession()a:SessionActor,@Param('schoolId')s:string,@Param('operatorId')o:string,@Body()b:unknown){return this.service.resetPassword(a,uuidSchema.parse(s),uuidSchema.parse(o),resetPasswordSchema.parse(b));}
}
