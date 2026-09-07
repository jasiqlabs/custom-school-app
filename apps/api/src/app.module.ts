import { Module } from '@nestjs/common';
import { PlatformFoundationModule } from './modules/platform-foundation/platform-foundation.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';

@Module({
  imports: [
    PlatformFoundationModule,
    PlatformAdminModule,
  ],
})
export class AppModule {}
