import { Module } from '@nestjs/common';
import { TransportsController } from './controllers/transports.controller';
import { TransportsRepository } from './repository/transports.repository';
import { ManageTransportsService } from './application/manage-transports.service';
import { ManageStoppagesService } from './application/manage-stoppages.service';
import { AssignTransportService } from './application/assign-transport.service';
import { ReassignTransportService } from './application/reassign-transport.service';
import { EndTransportService } from './application/end-transport.service';
import { QueryAssignmentsService } from './application/query-assignments.service';
import { QueryUtilizationService } from './application/query-utilization.service';
import { TransportsPublicFacadeImpl } from './facade/transports-public.facade';
import { PlatformModule } from '../../platform/platform.module';

@Module({
  imports: [PlatformModule],
  controllers: [TransportsController],
  providers: [
    TransportsRepository,
    ManageTransportsService,
    ManageStoppagesService,
    AssignTransportService,
    ReassignTransportService,
    EndTransportService,
    QueryAssignmentsService,
    QueryUtilizationService,
    TransportsPublicFacadeImpl,
  ],
  exports: [
    TransportsRepository,
    ManageTransportsService,
    ManageStoppagesService,
    AssignTransportService,
    ReassignTransportService,
    EndTransportService,
    QueryAssignmentsService,
    QueryUtilizationService,
    TransportsPublicFacadeImpl,
  ],
})
export class TransportsModule {}
