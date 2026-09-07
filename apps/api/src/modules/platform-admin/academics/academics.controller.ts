import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AcademicMasterService } from './academic-master.service';
import { SessionGuard } from '../../platform-foundation/guards/session.guard';
import { PlatformAdminGuard } from '../../platform-foundation/guards/platform-admin.guard';
import {
  createClassSchema,
  updateClassSchema,
  createSectionSchema,
  updateSectionSchema,
} from '@custom-school/validation';

@Controller('api/v1/platform/schools/:schoolId')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class AcademicsController {
  constructor(private readonly academicMasterService: AcademicMasterService) {}

  @Get('classes')
  async listClasses(@Param('schoolId') schoolId: string) {
    return this.academicMasterService.listClasses(schoolId);
  }

  @Post('classes')
  @HttpCode(HttpStatus.CREATED)
  async createClass(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = createClassSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.academicMasterService.createClass(schoolId, validated, actorId, requestId);
  }

  @Patch('classes/:classId')
  async updateClass(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = updateClassSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.academicMasterService.updateClass(schoolId, classId, validated, actorId, requestId);
  }

  @Delete('classes/:classId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClass(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const actorId = (req as any).user?.userId;
    await this.academicMasterService.deleteClass(schoolId, classId, actorId, requestId);
  }

  @Post('classes/:classId/sections')
  @HttpCode(HttpStatus.CREATED)
  async createSection(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = createSectionSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.academicMasterService.createSection(schoolId, classId, validated, actorId, requestId);
  }

  @Patch('classes/:classId/sections/:sectionId')
  async updateSection(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = updateSectionSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.academicMasterService.updateSection(
      schoolId,
      classId,
      sectionId,
      validated,
      actorId,
      requestId,
    );
  }

  @Delete('classes/:classId/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSection(
    @Param('schoolId') schoolId: string,
    @Param('classId') classId: string,
    @Param('sectionId') sectionId: string,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const actorId = (req as any).user?.userId;
    await this.academicMasterService.deleteSection(schoolId, classId, sectionId, actorId, requestId);
  }
}
