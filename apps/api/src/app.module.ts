import { Module } from '@nestjs/common';
import { PlatformModule } from './platform/platform.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { OperatorAuthModule } from './modules/operator-auth/operator-auth.module';
import { StudentsModule } from './modules/students/students.module';
import { FeesModule } from './modules/fees/fees.module';
import { TransportsModule } from './modules/transports/transports.module';
import { TransportCapabilityBindingModule } from './composition/transport-capability-binding.module';
import { OperatorDashboardModule } from './modules/operator-dashboard/operator-dashboard.module';

@Module({
  imports: [
    PlatformModule,
    PlatformAdminModule,
    OperatorAuthModule,
    StudentsModule,
    FeesModule,
    TransportsModule,
    TransportCapabilityBindingModule,
    OperatorDashboardModule,
  ]
})
export class AppModule {}

