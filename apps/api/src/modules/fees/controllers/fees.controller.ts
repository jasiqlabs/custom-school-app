import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import {
  upsertClassFeeConfigSchema,
  generateDuesSchema,
  collectPaymentSchema,
  voidPaymentSchema,
  feePaymentFilterSchema,
  pendingFeeFilterSchema,
  createPendingFeeExportSchema,
  uuidSchema,
} from '@custom-school/validation';

import { ConfigureFeeService } from '../application/configure-fee.service';
import { GenerateDuesService } from '../application/generate-dues.service';
import { CollectPaymentService } from '../application/collect-payment.service';
import { QueryPaymentsService } from '../application/query-payments.service';
import { VoidPaymentService } from '../application/void-payment.service';
import { QueryPendingFeesService } from '../application/query-pending-fees.service';
import { FeeExportsService } from '../application/fee-exports.service';

@Controller('operator/fees')
@UseGuards(OperatorGuard)
export class FeesController {
  constructor(
    private readonly configureFeeService: ConfigureFeeService,
    private readonly generateDuesService: GenerateDuesService,
    private readonly collectPaymentService: CollectPaymentService,
    private readonly queryPaymentsService: QueryPaymentsService,
    private readonly voidPaymentService: VoidPaymentService,
    private readonly queryPendingFeesService: QueryPendingFeesService,
    private readonly feeExportsService: FeeExportsService
  ) {}

  // 1. Fee Configs
  @Get('configs')
  async listConfigs(
    @CurrentSession() actor: SessionActor,
    @Query('classId') classId?: string
  ) {
    const validClassId = classId ? uuidSchema.parse(classId) : undefined;
    return this.configureFeeService.listConfigs(actor.schoolId!, validClassId);
  }

  @Post('configs')
  @UseGuards(OperatorGuard, CsrfGuard)
  async upsertConfig(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = upsertClassFeeConfigSchema.parse(body);
    return this.configureFeeService.upsertConfig(actor, parsed);
  }

  // 2. Due Generation
  @Post('dues/generate')
  @UseGuards(OperatorGuard, CsrfGuard)
  async generateDues(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = generateDuesSchema.parse(body);
    return this.generateDuesService.generateDues(actor, parsed);
  }

  // 3. Student Dues Query (for fee collection screen)
  @Get('dues/student/:studentId')
  async getStudentDues(
    @CurrentSession() actor: SessionActor,
    @Param('studentId') studentId: string
  ) {
    const validStudentId = uuidSchema.parse(studentId);
    return this.collectPaymentService.getStudentDues(actor.schoolId!, validStudentId);
  }

  // 4. Record Payment
  @Post('payments')
  @UseGuards(OperatorGuard, CsrfGuard)
  async collectPayment(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = collectPaymentSchema.parse(body);
    return this.collectPaymentService.collectPayment(actor, parsed);
  }

  // 5. Payment History
  @Get('payments')
  async listPayments(
    @CurrentSession() actor: SessionActor,
    @Query() query: unknown
  ) {
    const parsed = feePaymentFilterSchema.parse(query);
    return this.queryPaymentsService.listPayments(actor.schoolId!, parsed);
  }

  // 6. View Receipt
  @Get('payments/:id/receipt')
  async getReceipt(
    @CurrentSession() actor: SessionActor,
    @Param('id') paymentId: string
  ) {
    const validId = uuidSchema.parse(paymentId);
    return this.collectPaymentService.getReceipt(actor.schoolId!, validId);
  }

  // 7. Void Payment
  @Post('payments/:id/void')
  @UseGuards(OperatorGuard, CsrfGuard)
  async voidPayment(
    @CurrentSession() actor: SessionActor,
    @Param('id') paymentId: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(paymentId);
    const parsed = voidPaymentSchema.parse(body);
    return this.voidPaymentService.voidPayment(actor, validId, parsed);
  }

  // 8. Pending Fees Report
  @Get('pending')
  async getPendingReport(
    @CurrentSession() actor: SessionActor,
    @Query() query: unknown
  ) {
    const parsed = pendingFeeFilterSchema.parse(query);
    return this.queryPendingFeesService.getPendingReport(actor.schoolId!, parsed);
  }

  // 9. Export Pending Fees to XLSX
  @Post('exports/pending')
  @UseGuards(OperatorGuard, CsrfGuard)
  async exportPendingFees(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown,
    @Res() res: Response
  ) {
    const parsed = createPendingFeeExportSchema.parse(body);
    const result = await this.feeExportsService.generatePendingFeesXlsx(actor, parsed);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(result.buffer);
  }
}
