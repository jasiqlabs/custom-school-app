import { z } from 'zod';
import { YearTransitionService } from './year-transition.service';
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ConflictException } from '@nestjs/common';
import {
  createAcademicSessionSchema,
  updateAcademicSessionSchema,
  activateAcademicSessionSchema,
  closeAcademicSessionSchema,
  uuidSchema,
} from '@custom-school/validation';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
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

@Controller('operator/academic-sessions')
@UseGuards(OperatorGuard, CapabilityGuard)
export class AcademicSessionsOperatorController {
  constructor(private readonly service: AcademicSessionsService,
    private readonly transitions: YearTransitionService) {}

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

  @Post(':id/close')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  close(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const schoolId = this.getSchoolId(actor);
    const validated = closeAcademicSessionSchema.parse(body);
    return this.service.close(actor, schoolId, uuidSchema.parse(id), validated);
  }
  @Get('transitions')
  @RequiresCapability('academics.read')
  listTransitions(@CurrentSession() actor: SessionActor) {
    return this.transitions.list(this.getSchoolId(actor));
  }

  @Post('transitions')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  createTransition(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const input = createTransitionSchema.parse(body);
    return this.transitions.start(actor, this.getSchoolId(actor), input.sourceSessionId, input.targetSessionId);
  }

  @Get('transitions/:batchId/candidates')
  @RequiresCapability('academics.read')
  transitionCandidates(@CurrentSession() actor: SessionActor, @Param('batchId') batchId: string,
    @Query('page') page?: string, @Query('size') size?: string) {
    return this.transitions.candidates(this.getSchoolId(actor), uuidSchema.parse(batchId), Number(page || 1), Number(size || 100));
  }

  @Post('transitions/:batchId/stage')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  stageTransition(@CurrentSession() actor: SessionActor, @Param('batchId') batchId: string, @Body() body: unknown) {
    return this.transitions.stage(actor, this.getSchoolId(actor), uuidSchema.parse(batchId), stageTransitionSchema.parse(body).items);
  }

  @Post('transitions/:batchId/prepare')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  prepareTransition(@CurrentSession() actor: SessionActor, @Param('batchId') batchId: string) {
    return this.transitions.prepare(actor, this.getSchoolId(actor), uuidSchema.parse(batchId));
  }

  @Post('transitions/:batchId/process')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  processTransition(@CurrentSession() actor: SessionActor, @Param('batchId') batchId: string) {
    return this.transitions.process(actor, this.getSchoolId(actor), uuidSchema.parse(batchId));
  }

  @Post('transitions/:batchId/finalize')
  @UseGuards(CsrfGuard)
  @RequiresCapability('academics.write')
  finalizeTransition(@CurrentSession() actor: SessionActor, @Param('batchId') batchId: string) {
    return this.transitions.finalize(actor, this.getSchoolId(actor), uuidSchema.parse(batchId));
  }

}
