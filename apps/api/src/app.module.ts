import { Module } from '@nestjs/common';
import { PlatformFoundationModule } from './modules/platform-foundation/platform-foundation.module';

@Module({
  imports: [PlatformFoundationModule],
})
export class AppModule {}
