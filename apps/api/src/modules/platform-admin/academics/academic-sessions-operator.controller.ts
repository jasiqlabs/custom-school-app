import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ConflictException } from '@nestjs/common';
import {
  createAcademicSessionSchema,
  updateAcademicSessionSchema,
  activateAcademicSessionSchema,
  uuidSchema,
} from '@custom-school/validation';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { AcademicSessionsService } from './academic-sessions.service';

@Controller('operator/academic-sessions')
@UseGuards(OperatorGuard, CapabilityGuard)
export class AcademicSessionsOperatorController {
  constructor(private readonly service: AcademicSessionsService) {}

  private getSchoolId(actor: SessionActor): string {
    if (!actor.schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    return actor.schoolId;
  }

  @Get()
  @RequiresCapability('academics.read')
  list(
    @CurrentSession() actor: SessionActor,
    @Query('page') page?: string,
    @Query('size') size?: string
  ) {
    const schoolId = this.getSchoolId(actor);
    const p = page ? parseInt(page, 10) : 1;
    const s = size ? parseInt(size, 10) : 20;
    return this.service.list(schoolId, p, s);
  }

  @Get('current')
  @RequiresCapability('academics.read')
  getCurrent(@CurrentSession() actor: SessionActor) {
    const schoolId = this.getSchoolId(actor);
    return this.service.getCurrent(schoolId);
  }

  @Get(':id')
  @RequiresCapability('academics.read')
  getById(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string
  ) {
    const schoolId = this.getSchoolId(actor);
    return this.service.getById(schoolId, uuidSchema.parse(id));
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  create(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const schoolId = this.getSchoolId(actor);
    const validated = createAcademicSessionSchema.parse(body);
    return this.service.create(actor, schoolId, validated);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  update(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const schoolId = this.getSchoolId(actor);
    const validated = updateAcademicSessionSchema.parse(body);
    return this.service.update(actor, schoolId, uuidSchema.parse(id), validated);
  }

  @Post(':id/activate')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  activate(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const schoolId = this.getSchoolId(actor);
    const validated = activateAcademicSessionSchema.parse(body);
    return this.service.activate(actor, schoolId, uuidSchema.parse(id), validated);
  }
}
