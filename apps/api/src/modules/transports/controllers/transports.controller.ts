import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import {
  createTransportSchema,
  updateTransportSchema,
  updateTransportStatusSchema,
  createTransportStoppageSchema,
  updateTransportStoppageSchema,
  updateStoppageStatusSchema,
  reorderStoppagesSchema,
  assignStudentTransportSchema,
  reassignStudentTransportSchema,
  endStudentTransportSchema,
  transportAssignmentDirectoryQuerySchema,
  uuidSchema,
} from '@custom-school/validation';

import { ManageTransportsService } from '../application/manage-transports.service';
import { ManageStoppagesService } from '../application/manage-stoppages.service';
import { AssignTransportService } from '../application/assign-transport.service';
import { ReassignTransportService } from '../application/reassign-transport.service';
import { EndTransportService } from '../application/end-transport.service';
import { QueryAssignmentsService } from '../application/query-assignments.service';
import { QueryUtilizationService } from '../application/query-utilization.service';
import { TransportsPublicFacadeImpl } from '../facade/transports-public.facade';

@Controller('operator/transports')
@UseGuards(OperatorGuard)
export class TransportsController {
  constructor(
    private readonly manageTransportsService: ManageTransportsService,
    private readonly manageStoppagesService: ManageStoppagesService,
    private readonly assignTransportService: AssignTransportService,
    private readonly reassignTransportService: ReassignTransportService,
    private readonly endTransportService: EndTransportService,
    private readonly queryAssignmentsService: QueryAssignmentsService,
    private readonly queryUtilizationService: QueryUtilizationService,
    private readonly facade: TransportsPublicFacadeImpl
  ) {}

  // 1. Active choices for dropdowns (MUST precede :id route)
  @Get('active-choices')
  async getActiveChoices(@CurrentSession() actor: SessionActor) {
    return this.facade.getActiveChoices(actor.schoolId!);
  }

  // 2. Assignment endpoints (MUST precede :id route)
  @Get('assignments')
  async listAssignments(
    @CurrentSession() actor: SessionActor,
    @Query() query: unknown
  ) {
    const parsed = transportAssignmentDirectoryQuerySchema.parse(query);
    return this.queryAssignmentsService.listAssignments(actor.schoolId!, parsed);
  }

  @Post('assignments')
  @UseGuards(OperatorGuard, CsrfGuard)
  async assignStudent(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = assignStudentTransportSchema.parse(body);
    return this.assignTransportService.assignStudent(actor, parsed);
  }

  @Post('assignments/:id/reassign')
  @UseGuards(OperatorGuard, CsrfGuard)
  async reassignStudent(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(id);
    const parsed = reassignStudentTransportSchema.parse(body);
    return this.reassignTransportService.reassignStudent(actor, validId, parsed);
  }

  @Post('assignments/:id/end')
  @UseGuards(OperatorGuard, CsrfGuard)
  async endAssignment(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(id);
    const parsed = endStudentTransportSchema.parse(body);
    return this.endTransportService.endAssignment(actor, validId, parsed);
  }

  // 3. Utilization & Counts (MUST precede :id route)
  @Get('counts')
  async getCounts(
    @CurrentSession() actor: SessionActor,
    @Query('date') date?: string
  ) {
    return this.queryUtilizationService.getEffectiveCounts(actor.schoolId!, date);
  }

  // 4. Transport CRUD & Status
  @Get()
  async listTransports(@CurrentSession() actor: SessionActor) {
    return this.manageTransportsService.listTransports(actor.schoolId!);
  }

  @Post()
  @UseGuards(OperatorGuard, CsrfGuard)
  async createTransport(
    @CurrentSession() actor: SessionActor,
    @Body() body: unknown
  ) {
    const parsed = createTransportSchema.parse(body);
    return this.manageTransportsService.createTransport(actor, parsed);
  }

  @Get(':id')
  async getTransport(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string
  ) {
    const validId = uuidSchema.parse(id);
    return this.manageTransportsService.getTransport(actor.schoolId!, validId);
  }

  @Put(':id')
  @UseGuards(OperatorGuard, CsrfGuard)
  async updateTransport(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(id);
    const parsed = updateTransportSchema.parse(body);
    return this.manageTransportsService.updateTransport(actor, validId, parsed);
  }

  @Patch(':id/status')
  @UseGuards(OperatorGuard, CsrfGuard)
  async updateTransportStatus(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(id);
    const parsed = updateTransportStatusSchema.parse(body);
    return this.manageTransportsService.updateTransportStatus(actor, validId, parsed.status);
  }

  // 5. Stoppage routes nested under transport
  @Get(':transportId/stoppages')
  async listStoppages(
    @CurrentSession() actor: SessionActor,
    @Param('transportId') transportId: string
  ) {
    const validTransportId = uuidSchema.parse(transportId);
    return this.manageStoppagesService.listStoppages(actor.schoolId!, validTransportId);
  }

  @Post(':transportId/stoppages')
  @UseGuards(OperatorGuard, CsrfGuard)
  async createStoppage(
    @CurrentSession() actor: SessionActor,
    @Param('transportId') transportId: string,
    @Body() body: unknown
  ) {
    const validTransportId = uuidSchema.parse(transportId);
    const parsed = createTransportStoppageSchema.parse(body);
    return this.manageStoppagesService.createStoppage(actor, validTransportId, parsed);
  }

  @Put(':transportId/stoppages/reorder')
  @UseGuards(OperatorGuard, CsrfGuard)
  async reorderStoppages(
    @CurrentSession() actor: SessionActor,
    @Param('transportId') transportId: string,
    @Body() body: unknown
  ) {
    const validTransportId = uuidSchema.parse(transportId);
    const parsed = reorderStoppagesSchema.parse(body);
    return this.manageStoppagesService.reorderStoppages(actor, validTransportId, parsed);
  }

  @Put(':transportId/stoppages/:id')
  @UseGuards(OperatorGuard, CsrfGuard)
  async updateStoppage(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(id);
    const parsed = updateTransportStoppageSchema.parse(body);
    return this.manageStoppagesService.updateStoppage(actor, validId, parsed);
  }

  @Patch(':transportId/stoppages/:id/status')
  @UseGuards(OperatorGuard, CsrfGuard)
  async updateStoppageStatus(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    const validId = uuidSchema.parse(id);
    const parsed = updateStoppageStatusSchema.parse(body);
    return this.manageStoppagesService.updateStoppageStatus(actor, validId, parsed.status);
  }
}
