import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@custom-school/validation';
import type { SessionActor } from '@custom-school/contracts';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';
import { OpeningBalanceImportService } from '../application/opening-balance-import.service';

const previewSchema = z.object({
  fileBase64: z.string().min(1).max(14 * 1024 * 1024),
  fileName: z.string().min(1).max(255),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

@Controller('operator/fees/opening-balances')
@UseGuards(OperatorGuard, CapabilityGuard)
@RequiresCapability('fees.write')
export class OpeningBalancesController {
  constructor(private readonly imports: OpeningBalanceImportService) {}

  @Get('template')
  template(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="opening-balances-template.xlsx"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(this.imports.template());
  }

  @Post('preview')
  @UseGuards(CsrfGuard)
  preview(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const p = previewSchema.parse(body);
    return this.imports.preview(actor, p.fileBase64, p.fileName, p.asOfDate);
  }

  @Get(':id')
  status(@CurrentSession() actor: SessionActor, @Param('id') id: string, @Query('page') page?: string) {
    return this.imports.status(actor, uuidSchema.parse(id), Math.max(1, Number(page || 1)));
  }

  @Post(':id/process')
  @UseGuards(CsrfGuard)
  process(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    return this.imports.process(actor, uuidSchema.parse(id));
  }
}
