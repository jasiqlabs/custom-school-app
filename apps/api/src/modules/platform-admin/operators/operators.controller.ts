import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { OperatorsService } from './operators.service';
import { SessionGuard } from '../../platform-foundation/guards/session.guard';
import { PlatformAdminGuard } from '../../platform-foundation/guards/platform-admin.guard';
import {
  provisionOperatorSchema,
  updateOperatorStatusSchema,
} from '@custom-school/validation';

@Controller('api/v1/platform/schools/:schoolId/operators')
@UseGuards(SessionGuard, PlatformAdminGuard)
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Get()
  async listOperators(@Param('schoolId') schoolId: string) {
    return this.operatorsService.listOperators(schoolId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async provisionOperator(
    @Param('schoolId') schoolId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = provisionOperatorSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.operatorsService.provisionOperator(schoolId, validated, actorId, requestId);
  }

  @Patch(':operatorId/status')
  async updateStatus(
    @Param('schoolId') schoolId: string,
    @Param('operatorId') operatorId: string,
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-request-id') requestId?: string,
  ) {
    const validated = updateOperatorStatusSchema.parse(body);
    const actorId = (req as any).user?.userId;
    return this.operatorsService.updateOperatorStatus(
      schoolId,
      operatorId,
      validated.status,
      actorId,
      requestId,
    );
  }
}
