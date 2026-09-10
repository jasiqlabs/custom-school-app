import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { tcIssueSchema, uuidSchema } from '@custom-school/validation';
import { PlatformAdminGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { TcService } from './tc.service';

@Controller('platform/schools/:schoolId')
@UseGuards(PlatformAdminGuard)
export class TcController {
  constructor(private readonly service: TcService) {}
  @Get('students/search') search(@Param('schoolId') schoolId: string, @Query('q') q = '') { return this.service.searchStudents(uuidSchema.parse(schoolId), q); }
  @Post('transfer-certificates') @UseGuards(CsrfGuard) issue(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Body() body: unknown) { const value = tcIssueSchema.parse(body); return this.service.issue(actor, uuidSchema.parse(schoolId), value.studentId, value.templateVersion); }
  @Get('transfer-certificates') list(@Param('schoolId') schoolId: string, @Query() query: any) { return this.service.list(uuidSchema.parse(schoolId), Number(query.page) || 1, Number(query.pageSize) || 20); }
  @Get('transfer-certificates/:tcId') get(@Param('schoolId') schoolId: string, @Param('tcId') tcId: string) { return this.service.get(uuidSchema.parse(schoolId), uuidSchema.parse(tcId)); }
  @Post('transfer-certificates/:tcId/retry-render') @UseGuards(CsrfGuard) retry(@CurrentSession() actor: SessionActor, @Param('schoolId') schoolId: string, @Param('tcId') tcId: string) { return this.service.retry(actor, uuidSchema.parse(schoolId), uuidSchema.parse(tcId)); }
  @Get('transfer-certificates/:tcId/download') download(@Param('schoolId') schoolId: string, @Param('tcId') tcId: string) { return this.service.download(uuidSchema.parse(schoolId), uuidSchema.parse(tcId)); }
}
