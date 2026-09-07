import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  Query,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TransferCertificateService } from './transfer-certificate.service';
import { SessionGuard } from '../../platform-foundation/guards/session.guard';
import { PlatformAdminGuard } from '../../platform-foundation/guards/platform-admin.guard';
import { generateTcSchema } from '@custom-school/validation';

@Controller('api/v1/platform/schools/:schoolId/transfer-certificate')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class TransferCertificateController {
  constructor(private readonly tcService: TransferCertificateService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async generateTransferCertificate(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = generateTcSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.tcService.generateTransferCertificate(schoolId, validated, actorId, requestId);
  }

  @Get('jobs')
  async listJobs(@Param('schoolId') schoolId: string) {
    return this.tcService.listJobs(schoolId);
  }

  @Get('jobs/:jobId')
  async getJob(
    @Param('schoolId') schoolId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.tcService.getJob(schoolId, jobId);
  }

  @Get('jobs/:jobId/download')
  async downloadJobPdf(
    @Param('schoolId') schoolId: string,
    @Param('jobId') jobId: string,
    @Query('disposition') disposition: string,
    @Res() res: Response,
  ) {
    const disp = disposition === 'inline' ? 'inline' : 'attachment';
    const file = await this.tcService.getJobPdfBuffer(schoolId, jobId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disp}; filename="${file.fileName}"`);
    return res.end(file.buffer);
  }
}
