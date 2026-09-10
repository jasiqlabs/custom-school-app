import { Module } from '@nestjs/common';
import { PlatformModule } from '../../platform/platform.module';
import { PlatformAuthController } from './auth/platform-auth.controller';import { PlatformAuthService } from './auth/platform-auth.service';
import { SchoolsController } from './schools/schools.controller';import { SchoolsService } from './schools/schools.service';
import { AcademicsController } from './academics/academics.controller';import { AcademicsService } from './academics/academics.service';
import { OperatorsController } from './operators/operators.controller';import { OperatorsService } from './operators/operators.service';
import { TcController } from './tc/tc.controller';import { TcService } from './tc/tc.service';
import { DashboardController } from './dashboard/dashboard.controller';import { DashboardService } from './dashboard/dashboard.service';
import { StudentCapabilityBindingModule } from '../../composition/student-capability-binding.module';
import { PlatformAdminPublicFacade } from './public-facade/platform-admin.facade';
@Module({imports:[PlatformModule,StudentCapabilityBindingModule],controllers:[PlatformAuthController,SchoolsController,AcademicsController,OperatorsController,TcController,DashboardController],providers:[PlatformAuthService,SchoolsService,AcademicsService,OperatorsService,TcService,DashboardService,PlatformAdminPublicFacade],exports:[PlatformAdminPublicFacade]})
export class PlatformAdminModule{}
