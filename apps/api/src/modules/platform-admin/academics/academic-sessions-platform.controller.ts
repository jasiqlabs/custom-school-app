import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createAcademicSessionSchema,
  updateAcademicSessionSchema,
  activateAcademicSessionSchema,
  uuidSchema,
} from '@custom-school/validation';
import { PlatformAdminGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { AcademicSessionsService } from './academic-sessions.service';

@Controller('platform/schools/:schoolId/academic-sessions')
@UseGuards(PlatformAdminGuard)
export class AcademicSessionsPlatformController {
  constructor(private readonly service: AcademicSessionsService) {}

  @Get()
  list(
    @Param('schoolId') schoolId: string,
    @Query('page') page?: string,
    @Query('size') size?: string
  ) {
    const sId = uuidSchema.parse(schoolId);
    const p = page ? parseInt(page, 10) : 1;
    const s = size ? parseInt(size, 10) : 20;
    return this.service.list(sId, p, s);
  }

  @Get(':id')
  getById(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string
  ) {
    return this.service.getById(uuidSchema.parse(schoolId), uuidSchema.parse(id));
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(
    @CurrentSession() actor: SessionActor,
    @Param('schoolId') schoolId: string,
    @Body() body: unknown
  ) {
    const validated = createAcademicSessionSchema.parse(body);
    return this.service.create(actor, uuidSchema.parse(schoolId), validated);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  update(
    @CurrentSession() actor: SessionActor,
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validated = updateAcademicSessionSchema.parse(body);
    return this.service.update(actor, uuidSchema.parse(schoolId), uuidSchema.parse(id), validated);
  }

  @Post(':id/activate')
  @UseGuards(CsrfGuard)
  activate(
    @CurrentSession() actor: SessionActor,
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validated = activateAcademicSessionSchema.parse(body);
    return this.service.activate(actor, uuidSchema.parse(schoolId), uuidSchema.parse(id), validated);
  }
}
