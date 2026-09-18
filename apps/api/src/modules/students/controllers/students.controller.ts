import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OperatorGuard } from '../../../common/security/session.guard';
import { CsrfGuard } from '../../../common/security/csrf.guard';
import { CurrentSession } from '../../../common/security/current-session.decorator';
import type { SessionActor } from '@custom-school/contracts';
import {
  studentAdmissionSchema,
  updateStudentProfileSchema,
  changeStudentIdentifierSchema,
  changeStudentStatusSchema,
  studentSearchSchema,
  studentDirectoryQuerySchema,
  uuidSchema
} from '@custom-school/validation';

import { AdmitStudentService } from '../application/admit-student.service';
import { UpdateStudentProfileService } from '../application/update-student-profile.service';
import { ChangeStudentIdentifierService } from '../application/change-student-identifier.service';
import { ChangeStudentStatusService } from '../application/change-student-status.service';
import { SearchStudentsService } from '../application/search-students.service';
import { StudentIdentifierAllocator } from '../domain/student-identifier-allocator';
import { StudentsRepository } from '../repository/students.repository';
import { FEES_PUBLIC_FACADE, FeesPublicFacade } from '../ports/fees.port';
import { TRANSPORT_PUBLIC_FACADE, TransportPublicFacade } from '../ports/transport.port';

import { PrismaService } from '../../../database/prisma.service';

@Controller('operator/students')
@UseGuards(OperatorGuard)
export class StudentsController {
  constructor(
    private readonly admitService: AdmitStudentService,
    private readonly updateService: UpdateStudentProfileService,
    private readonly identifierService: ChangeStudentIdentifierService,
    private readonly statusService: ChangeStudentStatusService,
    private readonly searchService: SearchStudentsService,
    private readonly allocator: StudentIdentifierAllocator,
    private readonly repo: StudentsRepository,
    private readonly prisma: PrismaService,
    @Inject(FEES_PUBLIC_FACADE) private readonly feesFacade: FeesPublicFacade,
    @Inject(TRANSPORT_PUBLIC_FACADE) private readonly transportFacade: TransportPublicFacade
  ) {}

  @Get('classes')
  async getSchoolClasses(@CurrentSession() actor: SessionActor) {
    return this.prisma.class.findMany({
      where: { schoolId: actor.schoolId!, status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
      include: {
        sections: {
          where: { status: 'ACTIVE' },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  }

  @Get('id-suggestion')
  async getIdSuggestion(@CurrentSession() actor: SessionActor) {
    const suggestedCode = await this.allocator.suggestNextCode(actor.schoolId!);
    return { suggestedCode, mode: 'AUTO' };
  }

  @Post()
  @UseGuards(CsrfGuard)
  async admitStudent(@CurrentSession() actor: SessionActor, @Body() body: unknown) {
    const parsed = studentAdmissionSchema.parse(body);
    return this.admitService.admit(actor, parsed as any);
  }

  @Get()
  async getDirectory(@CurrentSession() actor: SessionActor, @Query() query: unknown) {
    const parsed = studentDirectoryQuerySchema.parse(query);
    return this.searchService.getDirectory(actor, parsed as any);
  }

  @Get('search')
  async searchStudents(@CurrentSession() actor: SessionActor, @Query() query: unknown) {
    const parsed = studentSearchSchema.parse(query);
    return this.searchService.search(actor, parsed.q, parsed.limit);
  }

  @Get(':id')
  async getProfile(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    const validId = uuidSchema.parse(id);
    return this.searchService.getProfile(actor, validId);
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async updateProfile(@CurrentSession() actor: SessionActor, @Param('id') id: string, @Body() body: unknown) {
    const validId = uuidSchema.parse(id);
    const parsed = updateStudentProfileSchema.parse(body);
    return this.updateService.update(actor, validId, parsed as any);
  }

  @Patch(':id/identifier')
  @UseGuards(CsrfGuard)
  async changeIdentifier(@CurrentSession() actor: SessionActor, @Param('id') id: string, @Body() body: unknown) {
    const validId = uuidSchema.parse(id);
    const parsed = changeStudentIdentifierSchema.parse(body);
    return this.identifierService.changeIdentifier(actor, validId, parsed);
  }

  @Patch(':id/status')
  @UseGuards(CsrfGuard)
  async changeStatus(@CurrentSession() actor: SessionActor, @Param('id') id: string, @Body() body: unknown) {
    const validId = uuidSchema.parse(id);
    const parsed = changeStudentStatusSchema.parse(body);
    return this.statusService.changeStatus(actor, validId, parsed);
  }

  @Get(':id/identifier-history')
  async getIdentifierHistory(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    const validId = uuidSchema.parse(id);
    return this.repo.getIdentifierHistory(actor.schoolId!, validId);
  }

  @Get(':id/admission-form')
  async getAdmissionFormPrint(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    const validId = uuidSchema.parse(id);
    return this.searchService.getAdmissionFormPrint(actor, validId);
  }

  @Get(':id/fees')
  async getFeeSummary(
    @CurrentSession() actor: SessionActor,
    @Param('id') id: string,
    @Query('month') month?: string
  ) {
    const validId = uuidSchema.parse(id);
    return this.feesFacade.getStudentFeeSummary({
      schoolId: actor.schoolId!,
      studentId: validId,
      month
    });
  }

  @Get(':id/transport')
  async getTransportSummary(@CurrentSession() actor: SessionActor, @Param('id') id: string) {
    const validId = uuidSchema.parse(id);
    return this.transportFacade.getStudentTransportSummary({
      schoolId: actor.schoolId!,
      studentId: validId
    });
  }
}
