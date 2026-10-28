import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createExamContextSchema, updateExamContextSchema, uuidSchema } from '@custom-school/validation';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { ExamContextsService } from '../application/exam-contexts.service';

@Controller('operator/admit-card-contexts')
@UseGuards(OperatorGuard, CapabilityGuard)
export class OperatorExamsController {
  constructor(private readonly service: ExamContextsService) {}

  @Get()
  @RequiresCapability('exams.read')
  async list(
    @CurrentSession() actor: SessionActor,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: any
  ) {
    const items = await this.service.list(actor.schoolId!, {
      academicSessionId: academicSessionId ? uuidSchema.parse(academicSessionId) : undefined,
      classId: classId ? uuidSchema.parse(classId) : undefined,
      status: status || undefined,
    });
    return { items, total: items.length };
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequiresCapability('exams.write')
  async create(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const value = createExamContextSchema.parse(body);
    return this.service.create(actor, actor.schoolId!, value);
  }

  @Get(':id')
  @RequiresCapability('exams.read')
  async get(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    return this.service.get(actor.schoolId!, uuidSchema.parse(id));
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  @RequiresCapability('exams.write')
  async update(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const value = updateExamContextSchema.parse(body);
    return this.service.update(actor, actor.schoolId!, uuidSchema.parse(id), value);
  }

  @Get(':id/students')
  @RequiresCapability('exams.read')
  async getStudents(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string
  ) {
    return this.service.getStudentsWithClearance(actor.schoolId!, uuidSchema.parse(id));
  }
}
