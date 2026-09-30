import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import { DashboardService } from '../application/dashboard.service';
import {
  feeCollectionQuerySchema,
  feeDuesQuerySchema,
  feeChartQuerySchema,
  transportDashboardQuerySchema,
} from '@custom-school/validation';

@Controller('operator/dashboard')
@UseGuards(OperatorGuard)
export class OperatorDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private setNoStore(res: Response) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  @Get('students')
  async getStudentSummary(
    @CurrentSession() actor: SessionActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    return this.dashboardService.getStudentSummary(actor.schoolId!);
  }

  @Get('gender')
  async getGenderSummary(
    @CurrentSession() actor: SessionActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    return this.dashboardService.getGenderSummary(actor.schoolId!);
  }

  @Get('fees/collection')
  async getFeeCollection(
    @CurrentSession() actor: SessionActor,
    @Query() rawQuery: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    const query = feeCollectionQuerySchema.parse(rawQuery);
    return this.dashboardService.getFeeCollection(
      actor.schoolId!,
      query.from,
      query.to,
    );
  }

  @Get('fees/dues')
  async getFeeDues(
    @CurrentSession() actor: SessionActor,
    @Query() rawQuery: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    const query = feeDuesQuerySchema.parse(rawQuery);
    return this.dashboardService.getFeeDues(
      actor.schoolId!,
      query.feeMonth,
    );
  }

  @Get('fees/day')
  async getFeeDayBuckets(
    @CurrentSession() actor: SessionActor,
    @Query() rawQuery: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    const query = feeChartQuerySchema.parse(rawQuery);
    return this.dashboardService.getFeeChart(
      actor.schoolId!,
      'day',
      query.from,
      query.to,
    );
  }

  @Get('fees/week')
  async getFeeWeekBuckets(
    @CurrentSession() actor: SessionActor,
    @Query() rawQuery: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    const query = feeChartQuerySchema.parse(rawQuery);
    return this.dashboardService.getFeeChart(
      actor.schoolId!,
      'week',
      query.from,
      query.to,
    );
  }

  @Get('fees/month')
  async getFeeMonthBuckets(
    @CurrentSession() actor: SessionActor,
    @Query() rawQuery: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    const query = feeChartQuerySchema.parse(rawQuery);
    return this.dashboardService.getFeeChart(
      actor.schoolId!,
      'month',
      query.from,
      query.to,
    );
  }

  @Get('transport')
  async getTransportSummary(
    @CurrentSession() actor: SessionActor,
    @Query() rawQuery: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoStore(res);
    const query = transportDashboardQuerySchema.parse(rawQuery);
    return this.dashboardService.getTransportSummary(
      actor.schoolId!,
      query.businessDate,
    );
  }
}
