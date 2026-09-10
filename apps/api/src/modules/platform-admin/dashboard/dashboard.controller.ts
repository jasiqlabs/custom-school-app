import { Controller, Get, Query, UseGuards } from '@nestjs/common';import { PlatformAdminGuard } from '../../../common/security/session.guard';import { DashboardService } from './dashboard.service';
@Controller('platform/dashboard') @UseGuards(PlatformAdminGuard)
export class DashboardController { constructor(private readonly service:DashboardService){} @Get('metrics') metrics(){return this.service.metrics();} @Get('schools') schools(@Query()q:any){return this.service.schools(Number(q.page)||1,Number(q.pageSize)||20);} }
