import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SchoolsService } from './schools.service';
import { SessionGuard } from '../../platform-foundation/guards/session.guard';
import { PlatformAdminGuard } from '../../platform-foundation/guards/platform-admin.guard';
import {
  createSchoolSchema,
  updateSchoolProfileSchema,
  updatePrincipalSchema,
  changeSchoolStatusSchema,
} from '@custom-school/validation';

@Controller('api/v1/platform/schools')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  async listSchools(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;

    return this.schoolsService.listSchools({
      page: pageNum,
      limit: limitNum,
      search,
      status,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSchool(
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = createSchoolSchema.parse(body);
    const actorId = (req as any).user?.userId;

    return this.schoolsService.createSchool(validated, actorId, requestId);
  }

  @Get(':schoolId')
  async getSchool(@Param('schoolId') schoolId: string) {
    return this.schoolsService.getSchoolById(schoolId);
  }

  @Patch(':schoolId')
  async updateProfile(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = updateSchoolProfileSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.schoolsService.updateProfile(schoolId, validated, actorId, requestId);
  }

  @Put(':schoolId/principal')
  async updatePrincipal(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = updatePrincipalSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.schoolsService.updatePrincipal(schoolId, validated, actorId, requestId);
  }

  @Patch(':schoolId/status')
  async changeStatus(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = changeSchoolStatusSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.schoolsService.changeStatus(schoolId, validated, actorId, requestId);
  }

  @Post(':schoolId/logo')
  async uploadLogo(
    @Param('schoolId') schoolId: string,
    @Body() body: { fileName: string; mimeType: string; dataUrlOrBase64: string },
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const actorId = (req as any).user?.userId;
    return this.schoolsService.uploadLogo(schoolId, body, actorId, requestId);
  }

  @Post(':schoolId/principal/signature')
  async uploadPrincipalSignature(
    @Param('schoolId') schoolId: string,
    @Body() body: { fileName: string; mimeType: string; dataUrlOrBase64: string },
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const actorId = (req as any).user?.userId;
    return this.schoolsService.uploadPrincipalSignature(schoolId, body, actorId, requestId);
  }

  @Get(':schoolId/files/:fileId/download')
  async downloadFile(
    @Param('schoolId') schoolId: string,
    @Param('fileId') fileId: string,
    @Query('disposition') disposition: string,
    @Res() res: Response,
  ) {
    const file = await this.schoolsService.getFileBuffer(schoolId, fileId);
    const disp = disposition === 'inline' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disp}; filename="${file.fileName}"`);
    return res.end(file.buffer);
  }
}
