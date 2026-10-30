import {
  Controller,
  Get,
  Post,
  Patch,
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
  createFeeCategorySchema,
  updateFeeCategorySchema,
  createFeeRuleSchema,
  updateFeeRuleSchema,
  resolveRulesQuerySchema,
} from '@custom-school/validation';

import { ConfigureFeeService } from '../application/configure-fee.service';
import { FeeCategoriesRulesService } from '../application/fee-categories-rules.service';
import { GenerateDuesService } from '../application/generate-dues.service';
import { CollectPaymentService } from '../application/collect-payment.service';
import { QueryPaymentsService } from '../application/query-payments.service';
import { VoidPaymentService } from '../application/void-payment.service';
import { QueryPendingFeesService } from '../application/query-pending-fees.service';
import { FeeExportsService } from '../application/fee-exports.service';

import { CapabilityGuard, RequiresCapability } from '../../../common/security/capability.guard';

@Controller('operator/fees')
@UseGuards(OperatorGuard, CapabilityGuard)
export class FeesController {
  constructor(
    private readonly configureFeeService: ConfigureFeeService,
    private readonly feeCategoriesRulesService: FeeCategoriesRulesService,
    private readonly generateDuesService: GenerateDuesService,
    private readonly collectPaymentService: CollectPaymentService,
    private readonly queryPaymentsService: QueryPaymentsService,
    private readonly voidPaymentService: VoidPaymentService,
    private readonly queryPendingFeesService: QueryPendingFeesService,
    private readonly feeExportsService: FeeExportsService
  ) {}

  // 1. Fee Configs
  @Get('configs')
  @RequiresCapability('fees.read')
  async listConfigs(
    @CurrentSession() actor: SessionActor,
    @Query('classId') classId?: string
  ) {
    const validClassId = classId ? uuidSchema.parse(classId) : undefined;
    return this.configureFeeService.listConfigs(actor.schoolId!, validClassId);
  }

  @Post('configs')
  @UseGuards(OperatorGuard, CsrfGuard)
  @RequiresCapability('fees.write')
  async upsertConfig(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = upsertClassFeeConfigSchema.parse(body);
    return this.configureFeeService.upsertConfig(actor, parsed);
  }

  // 1b. Fee Categories (TASK-012)
  @Get('categories')
  @RequiresCapability('fees.read')
  async listCategories(@CurrentSession() actor: SessionActor) {
    return this.feeCategoriesRulesService.listCategories(actor.schoolId!);
  }

  @Post('categories')
  @UseGuards(OperatorGuard, CsrfGuard)
  @RequiresCapability('fees.write')
  async createCategory(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = createFeeCategorySchema.parse(body);
    return this.feeCategoriesRulesService.createCategory(actor.schoolId!, parsed as any, actor);
  }

  @Patch('categories/:id')
  @UseGuards(OperatorGuard, CsrfGuard)
  @RequiresCapability('fees.write')
  async updateCategory(
    @CurrentSession() actor: SessionActor,
    @Param('id') categoryId: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(categoryId);
    const parsed = updateFeeCategorySchema.parse(body);
    return this.feeCategoriesRulesService.updateCategory(actor.schoolId!, validId, parsed as any, actor);
  }

  // 1c. Fee Rules (TASK-012)
  @Get('rules')
  @RequiresCapability('fees.read')
  async listRules(
    @CurrentSession() actor: SessionActor,
    @Query('categoryId') categoryId?: string,
    @Query('classId') classId?: string,
    @Query('academicSessionId') academicSessionId?: string,
    @Query('transportId') transportId?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE'
  ) {
    return this.feeCategoriesRulesService.listRules(actor.schoolId!, {
      categoryId: categoryId ? uuidSchema.parse(categoryId) : undefined,
      classId: classId ? uuidSchema.parse(classId) : undefined,
      academicSessionId: academicSessionId ? uuidSchema.parse(academicSessionId) : undefined,
      transportId: transportId ? uuidSchema.parse(transportId) : undefined,
      status,
    });
  }

  @Post('rules')
  @UseGuards(OperatorGuard, CsrfGuard)
  @RequiresCapability('fees.write')
  async createRule(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = createFeeRuleSchema.parse(body);
    return this.feeCategoriesRulesService.createRule(actor.schoolId!, parsed as any, actor);
  }

  @Patch('rules/:id')
  @UseGuards(OperatorGuard, CsrfGuard)
  @RequiresCapability('fees.write')
  async updateRule(
    @CurrentSession() actor: SessionActor,
    @Param('id') ruleId: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(ruleId);
    const parsed = updateFeeRuleSchema.parse(body);
    return this.feeCategoriesRulesService.updateRule(actor.schoolId!, validId, parsed, actor);
  }

  @Get('rules/resolve')
  @RequiresCapability('fees.read')
  async resolveRules(
    @CurrentSession() actor: SessionActor,
    @Query() query: unknown
  ) {
    const parsed = resolveRulesQuerySchema.parse(query);
    return this.feeCategoriesRulesService.resolveApplicableRules(actor.schoolId!, parsed);
  }

  // 2. Due Generation
  @Post('dues/generate')
  @UseGuards(OperatorGuard, CsrfGuard)
  @RequiresCapability('fees.write')
  async generateDues(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = generateDuesSchema.parse(body);
    return this.generateDuesService.generateDues(actor, parsed);
  }

  // 3. Student Dues Query (for fee collection screen)
  @Get('dues/student/:studentId')
  @RequiresCapability('fees.read')
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
  @RequiresCapability('fees.write')
  async collectPayment(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = collectPaymentSchema.parse(body);
    return this.collectPaymentService.collectPayment(actor, parsed);
  }

  // 5. Payment History
  @Get('payments')
  @RequiresCapability('fees.read')
  async listPayments(
    @CurrentSession() actor: SessionActor,
    @Query() query: unknown
  ) {
    const parsed = feePaymentFilterSchema.parse(query);
    return this.queryPaymentsService.listPayments(actor.schoolId!, parsed);
  }

  // 6. View Receipt
  @Get('payments/:id/receipt')
  @RequiresCapability('fees.read')
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
  @RequiresCapability('fees.write')
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
  @RequiresCapability('reports.read')
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
  @RequiresCapability('fees.export', 'reports.download')
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
