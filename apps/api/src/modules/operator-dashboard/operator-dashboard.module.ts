import { Module } from '@nestjs/common';
import { PlatformModule } from '../../platform/platform.module';
import { StudentsModule } from '../students/students.module';
import { FeesModule } from '../fees/fees.module';
import { TransportsModule } from '../transports/transports.module';
import { OperatorDashboardController } from './controllers/operator-dashboard.controller';
import { DashboardService } from './application/dashboard.service';
import { DashboardCacheService } from './infrastructure/dashboard-cache.service';
import {
  DASHBOARD_STUDENTS_FACADE,
  DASHBOARD_FEES_FACADE,
  DASHBOARD_TRANSPORT_FACADE,
} from './ports/dashboard-facades.port';
import { StudentsPublicFacadeImpl } from '../students/facade/students-public.facade';
import { FeesPublicFacadeImpl } from '../fees/facade/fees-public.facade';
import { TransportsPublicFacadeImpl } from '../transports/facade/transports-public.facade';

@Module({
  imports: [
    PlatformModule,
    StudentsModule,
    FeesModule,
    TransportsModule,
  ],
  controllers: [OperatorDashboardController],
  providers: [
    DashboardCacheService,
    DashboardService,
    {
      provide: DASHBOARD_STUDENTS_FACADE,
      useExisting: StudentsPublicFacadeImpl,
    },
    {
      provide: DASHBOARD_FEES_FACADE,
      useExisting: FeesPublicFacadeImpl,
    },
    {
      provide: DASHBOARD_TRANSPORT_FACADE,
      useExisting: TransportsPublicFacadeImpl,
    },
  ],
  exports: [DashboardService],
})
export class OperatorDashboardModule {}
