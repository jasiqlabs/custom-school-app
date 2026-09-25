import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { FeesRepository } from '../repository/fees.repository';
import { GenerateDuesService } from './generate-dues.service';
import { getKolkataDateParts } from '../domain/fee-date-utils';
import type {
  ClassFeeConfigDto,
  UpsertClassFeeConfigInput,
  SessionActor,
} from '@custom-school/contracts';

@Injectable()
export class ConfigureFeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesRepository: FeesRepository,
    private readonly audit: AuditService,
    private readonly generateDuesService?: GenerateDuesService
  ) {}

  async listConfigs(schoolId: string, classId?: string): Promise<ClassFeeConfigDto[]> {
    const configs = await this.feesRepository.listConfigs(schoolId, classId);
    return configs.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      classId: c.classId,
      className: c.class?.name,
      effectiveMonth: c.effectiveMonth,
      amount: Number(c.amount),
      status: c.status as any,
      version: c.version,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async upsertConfig(
    actor: SessionActor,
    input: UpsertClassFeeConfigInput
  ): Promise<ClassFeeConfigDto> {
    if (!actor.schoolId) {
      throw new BadRequestException('School context is required');
    }
    const schoolId = actor.schoolId;

    // Verify class exists and belongs to school
    const classEntity = await this.prisma.class.findFirst({
      where: { id: input.classId, schoolId },
    });
    if (!classEntity) {
      throw new NotFoundException('Class not found for this school');
    }

    if (input.amount <= 0) {
      throw new BadRequestException('Fee amount must be greater than zero');
    }

    const config = await this.feesRepository.upsertConfig(
      schoolId,
      actor.userId,
      input
    );

    await this.audit.append({
      requestId: actor.requestId,
      schoolId,
      actorType: actor.userType,
      actorId: actor.userId,
      eventType: 'FEE_CONFIG_UPSERT',
      targetType: 'ClassFeeConfig',
      targetId: config.id,
      metadata: {
        classId: config.classId,
        effectiveMonth: config.effectiveMonth,
        amount: Number(config.amount),
        status: config.status,
      },
    });

    // Auto-generate dues for all enrolled students in this class if config is ACTIVE
    if (config.status === 'ACTIVE' && this.generateDuesService) {
      await this.generateDuesService.generateDuesForClass(
        schoolId,
        config.classId,
        config.effectiveMonth
      );
      const currentMonth = getKolkataDateParts().monthString;
      if (config.effectiveMonth !== currentMonth && config.effectiveMonth <= currentMonth) {
        await this.generateDuesService.generateDuesForClass(
          schoolId,
          config.classId,
          currentMonth
        );
      }
    }

    return {
      id: config.id,
      schoolId: config.schoolId,
      classId: config.classId,
      className: config.class?.name || classEntity.name,
      effectiveMonth: config.effectiveMonth,
      amount: Number(config.amount),
      status: config.status as any,
      version: config.version,
      createdBy: config.createdBy,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }
}
