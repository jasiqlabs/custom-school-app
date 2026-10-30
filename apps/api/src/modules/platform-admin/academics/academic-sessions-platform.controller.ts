import { z } from 'zod';
import { YearTransitionService } from './year-transition.service';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createAcademicSessionSchema,
  updateAcademicSessionSchema,
  activateAcademicSessionSchema,
  closeAcademicSessionSchema,
  uuidSchema,
} from '@custom-school/validation';
import { PlatformAdminGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { AcademicSessionsService } from './academic-sessions.service';

const createTransitionSchema = z.object({ sourceSessionId: z.string().uuid(), targetSessionId: z.string().uuid() });
const stageTransitionSchema = z.object({ items: z.array(z.object({
  studentId: z.string().uuid(), sourceEnrollmentId: z.string().uuid(),
  sourceVersion: z.number().int().positive(),
  decision: z.enum(['PROMOTE','REPEAT','PASS_OUT','LEAVE']),
  targetClassId: z.string().uuid().nullish(),
  targetSectionId: z.string().uuid().nullish(),
})).min(1).max(100) });

@Controller('platform/schools/:schoolId/academic-sessions')
@UseGuards(PlatformAdminGuard)
export class AcademicSessionsPlatformController {
  constructor(private readonly service: AcademicSessionsService,
    private readonly transitions: YearTransitionService) {}

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

  @Post(':id/close')
  @UseGuards(CsrfGuard)
  close(
    @CurrentSession() actor: SessionActor,
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validated = closeAcademicSessionSchema.parse(body);
    return this.service.close(actor, uuidSchema.parse(schoolId), uuidSchema.parse(id), validated);
  }
  @Post('transitions')
  @UseGuards(CsrfGuard)
  
  createTransition(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Body() body: unknown) {
    const input = createTransitionSchema.parse(body);
    return this.transitions.start(actor, uuidSchema.parse(schoolId), input.sourceSessionId, input.targetSessionId);
  }

  @Get('transitions/:batchId/candidates')
  
  transitionCandidates(@Param('schoolId') schoolId: string, @Param('batchId') batchId: string,
    @Query('page') page?: string, @Query('size') size?: string) {
    return this.transitions.candidates(uuidSchema.parse(schoolId), uuidSchema.parse(batchId), Number(page || 1), Number(size || 100));
  }

  @Post('transitions/:batchId/stage')
  @UseGuards(CsrfGuard)
  
  stageTransition(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Param('batchId') batchId: string, @Body() body: unknown) {
    return this.transitions.stage(actor, uuidSchema.parse(schoolId), uuidSchema.parse(batchId), stageTransitionSchema.parse(body).items);
  }

  @Post('transitions/:batchId/prepare')
  @UseGuards(CsrfGuard)
  
  prepareTransition(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Param('batchId') batchId: string) {
    return this.transitions.prepare(actor, uuidSchema.parse(schoolId), uuidSchema.parse(batchId));
  }

  @Post('transitions/:batchId/process')
  @UseGuards(CsrfGuard)
  
  processTransition(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Param('batchId') batchId: string) {
    return this.transitions.process(actor, uuidSchema.parse(schoolId), uuidSchema.parse(batchId));
  }

  @Post('transitions/:batchId/finalize')
  @UseGuards(CsrfGuard)
  
  finalizeTransition(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Param('batchId') batchId: string) {
    return this.transitions.finalize(actor, uuidSchema.parse(schoolId), uuidSchema.parse(batchId));
  }

}
