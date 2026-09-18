import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import { uuidSchema } from '@custom-school/validation';
import type { SessionActor } from '@custom-school/contracts';
import { StudentImportService } from '../application/student-import.service';

@Controller('operator/students-import')
@UseGuards(OperatorGuard)
export class StudentImportController {
  constructor(private readonly importService: StudentImportService) {}

  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = this.importService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student-import-template.xlsx"');
    res.send(buffer);
  }

  @Post('upload')
  @UseGuards(CsrfGuard)
  async uploadFile(
    @CurrentSession() actor: SessionActor,
    @Body() body: { fileBase64?: string; fileName?: string },
    @Req() req: Request
  ) {
    let fileBuffer: Buffer;

    if (body.fileBase64) {
      fileBuffer = Buffer.from(body.fileBase64, 'base64');
    } else {
      fileBuffer = req.body;
    }

    return this.importService.uploadAndStage(actor, fileBuffer, body.fileName || 'import.xlsx');
  }

  @Get('jobs/:jobId')
  async getJob(@CurrentSession() actor: SessionActor, @Param('jobId') jobId: string) {
    const validId = uuidSchema.parse(jobId);
    return this.importService.getJob(actor, validId);
  }

  @Get('jobs/:jobId/rows')
  async getJobRows(@CurrentSession() actor: SessionActor, @Param('jobId') jobId: string) {
    const validId = uuidSchema.parse(jobId);
    return this.importService.getJobRows(actor, validId);
  }

  @Post('jobs/:jobId/confirm')
  @UseGuards(CsrfGuard)
  async confirmImport(@CurrentSession() actor: SessionActor, @Param('jobId') jobId: string) {
    const validId = uuidSchema.parse(jobId);
    return this.importService.confirmImport(actor, validId);
  }

  @Get('jobs/:jobId/errors')
  async downloadErrors(
    @CurrentSession() actor: SessionActor,
    @Param('jobId') jobId: string,
    @Res() res: Response
  ) {
    const validId = uuidSchema.parse(jobId);
    const buffer = await this.importService.getErrorWorkbook(actor, validId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="import-errors-${validId.slice(0, 8)}.xlsx"`);
    res.send(buffer);
  }
}
