import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { tcIssueSchema, uuidSchema } from '@custom-school/validation';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { TcService } from './tc.service';

/** Operator routes delegate to the SAME TC service and signed private-file checks as Platform Admin. */
@Controller('operator/transfer-certificates')
@UseGuards(OperatorGuard, CapabilityGuard)
export class OperatorTcController {
  constructor(private readonly tc: TcService) {}

  @Get('students/search')
  @RequiresCapability('tc.read')
  search(@CurrentSession() actor: SessionActor, @Query('q') q = '') {
    return this.tc.searchStudents(actor.schoolId!, q);
  }

  @Get()
  @RequiresCapability('tc.read')
  list(@CurrentSession() actor: SessionActor, @Query() query: any) {
    return this.tc.list(actor.schoolId!, Number(query.page) || 1, Number(query.pageSize) || 20);
  }

  @Get(':tcId')
  @RequiresCapability('tc.read')
  get(@CurrentSession() actor: SessionActor, @Param('tcId') id: string) {
    return this.tc.get(actor.schoolId!, uuidSchema.parse(id));
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequiresCapability('tc.write')
  issue(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const value = typeof body === 'object' && body ? body as Record<string,unknown> : {};
    const request = tcIssueSchema.parse({ ...value, templateVersion: value.templateVersion || 'standard-v2' });
    return this.tc.issue(actor, actor.schoolId!, request.studentId, request.templateVersion || 'standard-v2');
  }

  @Post(':tcId/retry-render')
  @UseGuards(CsrfGuard)
  @RequiresCapability('tc.write')
  retry(@CurrentSession() actor: SessionActor, @Param('tcId') id: string) {
    return this.tc.retry(actor, actor.schoolId!, uuidSchema.parse(id));
  }

  @Get(':tcId/download')
  @RequiresCapability('tc.read')
  download(@CurrentSession() actor: SessionActor, @Param('tcId') id: string) {
    return this.tc.download(actor.schoolId!, uuidSchema.parse(id));
  }
}
