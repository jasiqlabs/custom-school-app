import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SessionGuard } from '../../platform-foundation/guards/session.guard';
import { PlatformAdminGuard } from '../../platform-foundation/guards/platform-admin.guard';

@Controller('api/v1/platform/dashboard')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }

  @Get('school-summary')
  async getSchoolSummary(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;

    return this.dashboardService.getSchoolSummary({
      page: pageNum,
      limit: limitNum,
      status,
    });
  }
}
