import { Module } from '@nestjs/common';
import { PlatformModule } from '../../platform/platform.module';
import { PlatformAdminModule } from '../platform-admin/platform-admin.module';
import { OperatorAuthController } from './operator-auth.controller';
import { OperatorAuthService } from './operator-auth.service';
@Module({ imports: [PlatformModule, PlatformAdminModule], controllers: [OperatorAuthController], providers: [OperatorAuthService] })
export class OperatorAuthModule {}
