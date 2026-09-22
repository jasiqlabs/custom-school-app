import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, EntityStatus, FeeDueStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { FeesRepository } from '../repository/fees.repository';
import { ConcessionCalculator } from '../domain/concession-calculator';
import type {
  GenerateDuesInput,
  GenerateDuesResultDto,
  SessionActor,
} from '@custom-school/contracts';

@Injectable()
export class GenerateDuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feesRepository: FeesRepository,
    private readonly audit: AuditService
  ) {}

  async generateDues(
    actor: SessionActor,
    input: GenerateDuesInput
  ): Promise<GenerateDuesResultDto> {
    if (!actor.schoolId) {
      throw new BadRequestException('School context is required');
    }
    const schoolId = actor.schoolId;
    const feeMonth = input.feeMonth;

    // 1. Fetch active enrollments with active students and their classes
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(input.classId ? { classId: input.classId } : {}),
        student: { status: EntityStatus.ACTIVE },
        class: { status: EntityStatus.ACTIVE },
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            concessionType: true,
            concessionValue: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
    });

    const totalEligibleStudents = enrollments.length;
    let createdCount = 0;
    let existingCount = 0;
    let skippedCount = 0;
    const skippedReasons: Array<{
      studentId: string;
      studentCode: string;
      studentName: string;
      reason: string;
    }> = [];

    // Cache configs for classes in this run
    const configCache = new Map<string, any>();

    for (const enrollment of enrollments) {
      const { student, class: classEntity } = enrollment;

      // Check existing due
      const existing = await this.prisma.feeDue.findUnique({
        where: {
          schoolId_studentId_feeMonth: {
            schoolId,
            studentId: student.id,
            feeMonth,
          },
        },
      });

      if (existing) {
        existingCount++;
        continue;
      }

      // Resolve effective config for this class
      if (!configCache.has(classEntity.id)) {
        const config = await this.feesRepository.findEffectiveConfig(
          schoolId,
          classEntity.id,
          feeMonth
        );
        configCache.set(classEntity.id, config);
      }

      const activeConfig = configCache.get(classEntity.id);
      if (!activeConfig) {
        skippedCount++;
        skippedReasons.push({
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          reason: `No active fee config found for class ${classEntity.name} effective for ${feeMonth}`,
        });
        continue;
      }

      const baseAmount = Number(activeConfig.amount);
      const concessionResult = ConcessionCalculator.calculate(
        baseAmount,
        student.concessionType as any,
        Number(student.concessionValue)
      );

      const netDue = concessionResult.netDue;
      const initialStatus = netDue === 0 ? FeeDueStatus.PAID : FeeDueStatus.UNPAID;

      try {
        await this.prisma.feeDue.create({
          data: {
            schoolId,
            studentId: student.id,
            classId: classEntity.id,
            feeConfigId: activeConfig.id,
            feeMonth,
            baseAmount: new Prisma.Decimal(concessionResult.baseAmount),
            concessionTypeSnapshot: concessionResult.concessionType as any,
            concessionValueSnapshot: new Prisma.Decimal(concessionResult.concessionValue),
            concessionAmount: new Prisma.Decimal(concessionResult.concessionAmount),
            netDue: new Prisma.Decimal(netDue),
            paidAmount: new Prisma.Decimal(0),
            balance: new Prisma.Decimal(netDue),
            status: initialStatus,
          },
        });
        createdCount++;
      } catch (err: any) {
        // In case of race condition on unique(school_id, student_id, fee_month)
        if (err.code === 'P2002') {
          existingCount++;
        } else {
          throw err;
        }
      }
    }

    await this.audit.append({
      requestId: actor.requestId,
      schoolId,
      actorType: actor.userType,
      actorId: actor.userId,
      eventType: 'FEE_DUES_GENERATED',
      metadata: {
        feeMonth,
        classId: input.classId ?? 'ALL',
        totalEligibleStudents,
        createdCount,
        existingCount,
        skippedCount,
      },
    });

    return {
      feeMonth,
      totalEligibleStudents,
      createdCount,
      existingCount,
      skippedCount,
      skippedReasons,
    };
  }
}
