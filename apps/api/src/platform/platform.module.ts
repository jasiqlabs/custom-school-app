import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from './auth/session.service';
import { AuthRateService } from './auth/auth-rate.service';
import { AuditService } from './audit/audit.service';
import { PrivateFileService } from './files/private-file.service';
import { SensitiveFieldCryptoService } from './crypto/sensitive-field-crypto.service';
import { JobService } from './jobs/job.service';
import { HealthController } from './observability/health.controller';
import { CsrfController } from '../common/security/csrf.controller';
import { CsrfGuard } from '../common/security/csrf.guard';
import { PlatformAdminGuard,OperatorGuard } from '../common/security/session.guard';
import { SessionSubjectRegistry } from './auth/session-subject.registry';
@Global()
@Module({controllers:[HealthController,CsrfController],providers:[AppConfig,PrismaService,SessionSubjectRegistry,SessionService,AuthRateService,AuditService,PrivateFileService,SensitiveFieldCryptoService,JobService,CsrfGuard,PlatformAdminGuard,OperatorGuard],exports:[AppConfig,PrismaService,SessionSubjectRegistry,SessionService,AuthRateService,AuditService,PrivateFileService,SensitiveFieldCryptoService,JobService,CsrfGuard,PlatformAdminGuard,OperatorGuard]})
export class PlatformModule{}
