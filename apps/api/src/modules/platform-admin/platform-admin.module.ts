import { Module } from '@nestjs/common';
import { PlatformFoundationModule } from '../platform-foundation/platform-foundation.module';
import { UsersRepository } from './users.repository';
import { PlatformAuthService } from './auth/platform-auth.service';
import { PlatformAuthController } from './auth/platform-auth.controller';
import { SchoolsRepository } from './schools/schools.repository';
import { SchoolsService } from './schools/schools.service';
import { SchoolsController } from './schools/schools.controller';
import { AcademicsRepository } from './academics/academics.repository';
import { AcademicMasterService } from './academics/academic-master.service';
import { AcademicsController } from './academics/academics.controller';
import { OperatorsService } from './operators/operators.service';
import { OperatorsController } from './operators/operators.controller';
import { TransferCertificateService } from './transfer-certificate/transfer-certificate.service';
import { TransferCertificateController } from './transfer-certificate/transfer-certificate.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';

@Module({
  imports: [PlatformFoundationModule],
  controllers: [
    PlatformAuthController,
    SchoolsController,
    AcademicsController,
    OperatorsController,
    TransferCertificateController,
    DashboardController,
  ],
  providers: [
    UsersRepository,
    PlatformAuthService,
    SchoolsRepository,
    SchoolsService,
    AcademicsRepository,
    AcademicMasterService,
    OperatorsService,
    TransferCertificateService,
    DashboardService,
  ],
  exports: [
    UsersRepository,
    PlatformAuthService,
    SchoolsRepository,
    SchoolsService,
    AcademicsRepository,
    AcademicMasterService,
    OperatorsService,
    TransferCertificateService,
    DashboardService,
  ],
})
export class PlatformAdminModule {}
