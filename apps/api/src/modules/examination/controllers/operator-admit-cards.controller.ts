import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { issueAdmitCardsSchema, uuidSchema } from '@custom-school/validation';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { AdmitCardsService } from '../application/admit-cards.service';

@Controller('operator/admit-cards')
@UseGuards(OperatorGuard, CapabilityGuard)
export class OperatorAdmitCardsController {
  constructor(private readonly service: AdmitCardsService) {}

  @Get('preview')
  @RequiresCapability('exams.read')
  async preview(
    @CurrentSession() actor: SessionActor,
    @Query('examContextId') examContextId: string,
    @Query('studentId') studentId: string
  ) {
    return this.service.getPreview(
      actor.schoolId!,
      uuidSchema.parse(examContextId),
      uuidSchema.parse(studentId)
    );
  }

  @Post('issue')
  @UseGuards(CsrfGuard)
  @RequiresCapability('exams.write')
  async issue(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const value = issueAdmitCardsSchema.parse(body);
    return this.service.issue(actor, actor.schoolId!, value);
  }

  @Get('issues')
  @RequiresCapability('exams.read')
  async listIssues(
    @CurrentSession() actor: SessionActor,
    @Query('examContextId') examContextId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.service.listIssues(
      actor.schoolId!,
      examContextId ? uuidSchema.parse(examContextId) : undefined,
      Number(page) || 1,
      Number(pageSize) || 50
    );
  }

  @Get('issues/:id')
  @RequiresCapability('exams.read')
  async getIssue(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    return this.service.getIssue(actor.schoolId!, uuidSchema.parse(id));
  }

  @Get('issues/:id/download')
  @RequiresCapability('exams.read')
  async download(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    const signed = await this.service.download(actor.schoolId!, uuidSchema.parse(id));
    return {
      downloadUrl: signed.url,
      url: signed.url,
      directUrl: `/operator/admit-cards/issues/${id}/file`,
      expiresInSeconds: signed.expiresInSeconds,
      expiresAt: new Date(Date.now() + signed.expiresInSeconds * 1000).toISOString(),
      mime: signed.mime,
      sha256: signed.sha256,
    };
  }

  @Get('issues/:id/file')
  @RequiresCapability('exams.read')
  async streamFile(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const { buffer, mime, filename } = await this.service.getPdfBuffer(actor.schoolId!, uuidSchema.parse(id));
    res.setHeader('Content-Type', mime || 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.end(buffer);
  }

  @Post('issues/:id/retry-render')
  @UseGuards(CsrfGuard)
  @RequiresCapability('exams.write')
  async retry(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    return this.service.retry(actor, actor.schoolId!, uuidSchema.parse(id));
  }
}
