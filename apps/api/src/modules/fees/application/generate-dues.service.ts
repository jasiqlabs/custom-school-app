import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, EntityStatus, FeeDueStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { FeesRepository } from '../repository/fees.repository';
import { ConcessionCalculator, roundHalfUp } from '../domain/concession-calculator';
import { getKolkataDateParts } from '../domain/fee-date-utils';
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

  /**
   * Generates a monthly fee due for a single student if an active fee config exists
   * for their enrolled class, ensuring strict multi-tenant isolation and idempotency.
   */
  async generateDueForStudent(
    schoolId: string,
    studentId: string,
    feeMonth?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || this.prisma;
    const targetMonth = feeMonth || getKolkataDateParts().monthString;

    // 1. Check existing due first (idempotent)
    const existing = await db.feeDue.findUnique({
      where: {
        schoolId_studentId_feeMonth: {
          schoolId,
          studentId,
          feeMonth: targetMonth,
        },
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    if (existing) {
      // If due is unpaid or partially paid, verify if concession snapshot is out of sync with student's profile
      const student = db.student?.findFirst
        ? await db.student.findFirst({
            where: { id: studentId, schoolId },
            select: { concessionType: true, concessionValue: true },
          })
        : null;
      const stuConcType = student?.concessionType || 'NONE';
      const stuConcVal = Number(student?.concessionValue || 0);
      const existingConcType = existing.concessionTypeSnapshot || 'NONE';
      const existingConcVal = Number(existing.concessionValueSnapshot || 0);

      if (
        student &&
        existing.status !== FeeDueStatus.PAID &&
        Number(existing.balance) > 0 &&
        (stuConcType !== existingConcType || stuConcVal !== existingConcVal)
      ) {
        const baseAmount = Number(existing.baseAmount);
        const concessionResult = ConcessionCalculator.calculate(
          baseAmount,
          stuConcType as any,
          stuConcVal
        );
        const paidAmount = Number(existing.paidAmount);
        const newNetDue = concessionResult.netDue;
        const newBalance = Math.max(0, roundHalfUp(newNetDue - paidAmount));
        const newStatus =
          newBalance === 0
            ? FeeDueStatus.PAID
            : paidAmount > 0
            ? FeeDueStatus.PARTIAL
            : FeeDueStatus.UNPAID;

        return db.feeDue.update({
          where: { id: existing.id },
          data: {
            concessionTypeSnapshot: concessionResult.concessionType as any,
            concessionValueSnapshot: new Prisma.Decimal(concessionResult.concessionValue),
            concessionAmount: new Prisma.Decimal(concessionResult.concessionAmount),
            netDue: new Prisma.Decimal(newNetDue),
            balance: new Prisma.Decimal(newBalance),
            status: newStatus,
            version: { increment: 1 },
          },
          include: {
            class: { select: { id: true, name: true } },
          },
        });
      }
      return existing;
    }

    // 2. Fetch student and active enrollment with class
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        schoolId,
        status: EntityStatus.ACTIVE,
      },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        concessionType: true,
        concessionValue: true,
        enrollments: {
          where: { status: 'ACTIVE', class: { status: EntityStatus.ACTIVE } },
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return null;
    }

    const classEntity = student.enrollments[0].class;

    // 3. Resolve effective active fee config
    const activeConfig = await this.feesRepository.findEffectiveConfig(
      schoolId,
      classEntity.id,
      targetMonth
    );

    if (!activeConfig) {
      return null;
    }

    // 4. Calculate concession and due amounts
    const baseAmount = Number(activeConfig.amount);
    const concessionResult = ConcessionCalculator.calculate(
      baseAmount,
      student.concessionType as any,
      Number(student.concessionValue)
    );

    const netDue = concessionResult.netDue;
    const initialStatus = netDue === 0 ? FeeDueStatus.PAID : FeeDueStatus.UNPAID;

    try {
      return await db.feeDue.create({
        data: {
          schoolId,
          studentId: student.id,
          classId: classEntity.id,
          feeConfigId: activeConfig.id,
          feeMonth: targetMonth,
          baseAmount: new Prisma.Decimal(concessionResult.baseAmount),
          concessionTypeSnapshot: concessionResult.concessionType as any,
          concessionValueSnapshot: new Prisma.Decimal(concessionResult.concessionValue),
          concessionAmount: new Prisma.Decimal(concessionResult.concessionAmount),
          netDue: new Prisma.Decimal(netDue),
          paidAmount: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(netDue),
          status: initialStatus,
        },
        include: {
          class: { select: { id: true, name: true } },
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        return await db.feeDue.findUnique({
          where: {
            schoolId_studentId_feeMonth: {
              schoolId,
              studentId,
              feeMonth: targetMonth,
            },
          },
          include: {
            class: { select: { id: true, name: true } },
          },
        });
      }
      throw err;
    }
  }

  /**
   * Generates dues for all active students enrolled in a class for a target month.
   */
  async generateDuesForClass(
    schoolId: string,
    classId: string,
    feeMonth: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || this.prisma;
    const enrollments = await db.studentEnrollment.findMany({
      where: {
        schoolId,
        classId,
        status: 'ACTIVE',
        student: { status: EntityStatus.ACTIVE },
      },
      select: {
        studentId: true,
      },
    });

    const results = [];
    for (const enrollment of enrollments) {
      const due = await this.generateDueForStudent(
        schoolId,
        enrollment.studentId,
        feeMonth,
        tx
      );
      if (due) {
        results.push(due);
      }
    }
    return results;
  }

  /**
   * Ensures that dues exist for a student for the current month and admission month
   * if active fee configs are present.
   */
  async ensureDuesForApplicableMonths(
    schoolId: string,
    studentId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || this.prisma;
    const currentMonth = getKolkataDateParts().monthString;

    // Generate for current month
    await this.generateDueForStudent(schoolId, studentId, currentMonth, tx);

    // Also check student admission month if different
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { admissionDate: true },
    });

    if (student?.admissionDate) {
      const admissionMonth = getKolkataDateParts(new Date(student.admissionDate)).monthString;
      if (admissionMonth !== currentMonth && admissionMonth <= currentMonth) {
        await this.generateDueForStudent(schoolId, studentId, admissionMonth, tx);
      }
    }

    // Always synchronize concession dues to ensure all pending and future dues reflect student's current concession
    await this.syncStudentConcessionDues(schoolId, studentId, tx);
  }

  /**
   * Synchronizes fee dues when student concession is updated.
   * If current month fee is unpaid/partially paid, updates current month due.
   * If current month fee is already fully paid, applies concession to next applicable month.
   * Also updates any future unpaid dues.
   */
  async syncStudentConcessionDues(
    schoolId: string,
    studentId: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || this.prisma;
    const currentMonth = getKolkataDateParts().monthString;

    // 1. Fetch student with active enrollment (fallback to latest enrollment)
    const student = await db.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: { select: { id: true, name: true } } },
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!student) {
      return;
    }

    const enrollment =
      student.enrollments[0] ||
      (await db.studentEnrollment.findFirst({
        where: { schoolId, studentId },
        include: { class: { select: { id: true, name: true } } },
        orderBy: { startedAt: 'desc' },
      }));

    if (!enrollment?.class?.id) {
      return;
    }

    const concessionType = student.concessionType;
    const concessionValue = Number(student.concessionValue || 0);
    const updatedDueIds = new Set<string>();

    // 2. Check current month due
    const currentDue = await db.feeDue.findUnique({
      where: {
        schoolId_studentId_feeMonth: {
          schoolId,
          studentId,
          feeMonth: currentMonth,
        },
      },
    });

    let applyNextMonth = false;

    if (currentDue) {
      const paidAmount = Number(currentDue.paidAmount);
      const balance = Number(currentDue.balance);

      if (currentDue.status === FeeDueStatus.PAID || (paidAmount > 0 && balance === 0)) {
        // Current month fee has already been fully paid. Apply to next applicable month.
        applyNextMonth = true;
      } else {
        // Pending/unpaid dues for current month: recalculate with updated concession.
        let baseAmount = Number(currentDue.baseAmount);
        let activeConfigId = currentDue.feeConfigId;
        if ((!baseAmount || baseAmount === 0) && enrollment.class?.id) {
          const activeConfig = await this.feesRepository.findEffectiveConfig(
            schoolId,
            enrollment.class.id,
            currentMonth
          );
          if (activeConfig) {
            baseAmount = Number(activeConfig.amount);
            activeConfigId = activeConfigId || activeConfig.id;
          }
        }

        const concessionResult = ConcessionCalculator.calculate(
          baseAmount,
          concessionType as any,
          concessionValue
        );
        const newNetDue = concessionResult.netDue;
        const newBalance = Math.max(0, roundHalfUp(newNetDue - paidAmount));
        const newStatus =
          newBalance === 0
            ? FeeDueStatus.PAID
            : paidAmount > 0
            ? FeeDueStatus.PARTIAL
            : FeeDueStatus.UNPAID;

        await db.feeDue.update({
          where: { id: currentDue.id },
          data: {
            baseAmount: new Prisma.Decimal(baseAmount),
            concessionTypeSnapshot: concessionResult.concessionType as any,
            concessionValueSnapshot: new Prisma.Decimal(concessionResult.concessionValue),
            concessionAmount: new Prisma.Decimal(concessionResult.concessionAmount),
            netDue: new Prisma.Decimal(newNetDue),
            balance: new Prisma.Decimal(newBalance),
            status: newStatus,
            ...(activeConfigId ? { feeConfigId: activeConfigId } : {}),
            version: { increment: 1 },
          },
        });
        updatedDueIds.add(currentDue.id);
      }
    } else {
      // If current month due does not exist yet, generate it now with updated concession
      const createdCurrent = await this.generateDueForStudent(schoolId, studentId, currentMonth, tx);
      if (createdCurrent) {
        updatedDueIds.add(createdCurrent.id);
      }
    }

    // 3. If current month was fully paid, apply to next applicable month
    if (applyNextMonth) {
      let curY = parseInt(currentMonth.split('-')[0], 10);
      let curM = parseInt(currentMonth.split('-')[1], 10);
      let applied = false;
      let iterations = 0;

      while (!applied && iterations < 24) {
        iterations++;
        const nextDate = new Date(Date.UTC(curY, curM, 1));
        const nextMonth = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`;
        curY = nextDate.getUTCFullYear();
        curM = nextDate.getUTCMonth() + 1;

        const nextDue = await db.feeDue.findUnique({
          where: {
            schoolId_studentId_feeMonth: {
              schoolId,
              studentId,
              feeMonth: nextMonth,
            },
          },
        });

        if (nextDue) {
          const paidAmount = Number(nextDue.paidAmount);
          const balance = Number(nextDue.balance);
          if (nextDue.status === FeeDueStatus.PAID || (paidAmount > 0 && balance === 0)) {
            continue;
          }
          let baseAmount = Number(nextDue.baseAmount);
          let activeConfigId = nextDue.feeConfigId;
          if ((!baseAmount || baseAmount === 0) && enrollment.class?.id) {
            const activeConfig = await this.feesRepository.findEffectiveConfig(
              schoolId,
              enrollment.class.id,
              nextMonth
            );
            if (activeConfig) {
              baseAmount = Number(activeConfig.amount);
              activeConfigId = activeConfigId || activeConfig.id;
            }
          }
          const concessionResult = ConcessionCalculator.calculate(
            baseAmount,
            concessionType as any,
            concessionValue
          );
          const newNetDue = concessionResult.netDue;
          const newBalance = Math.max(0, roundHalfUp(newNetDue - paidAmount));
          const newStatus =
            newBalance === 0
              ? FeeDueStatus.PAID
              : paidAmount > 0
              ? FeeDueStatus.PARTIAL
              : FeeDueStatus.UNPAID;

          await db.feeDue.update({
            where: { id: nextDue.id },
            data: {
              baseAmount: new Prisma.Decimal(baseAmount),
              concessionTypeSnapshot: concessionResult.concessionType as any,
              concessionValueSnapshot: new Prisma.Decimal(concessionResult.concessionValue),
              concessionAmount: new Prisma.Decimal(concessionResult.concessionAmount),
              netDue: new Prisma.Decimal(newNetDue),
              balance: new Prisma.Decimal(newBalance),
              status: newStatus,
              ...(activeConfigId ? { feeConfigId: activeConfigId } : {}),
              version: { increment: 1 },
            },
          });
          updatedDueIds.add(nextDue.id);
          applied = true;
        } else {
          const gen = await this.generateDueForStudent(schoolId, studentId, nextMonth, tx);
          if (gen) {
            updatedDueIds.add(gen.id);
            applied = true;
          }
        }
      }
    }

    // 4. Update any other future unpaid dues (feeMonth > currentMonth)
    const futureDues = await db.feeDue.findMany({
      where: {
        schoolId,
        studentId,
        feeMonth: { gt: currentMonth },
        status: { in: [FeeDueStatus.UNPAID, FeeDueStatus.PARTIAL] },
      },
    });

    for (const fDue of futureDues) {
      if (updatedDueIds.has(fDue.id)) continue;

      let baseAmount = Number(fDue.baseAmount);
      let activeConfigId = fDue.feeConfigId;
      if ((!baseAmount || baseAmount === 0) && enrollment.class?.id) {
        const activeConfig = await this.feesRepository.findEffectiveConfig(
          schoolId,
          enrollment.class.id,
          fDue.feeMonth
        );
        if (activeConfig) {
          baseAmount = Number(activeConfig.amount);
          activeConfigId = activeConfigId || activeConfig.id;
        }
      }
      const concessionResult = ConcessionCalculator.calculate(
        baseAmount,
        concessionType as any,
        concessionValue
      );
      const paidAmount = Number(fDue.paidAmount);
      const newNetDue = concessionResult.netDue;
      const newBalance = Math.max(0, roundHalfUp(newNetDue - paidAmount));
      const newStatus =
        newBalance === 0
          ? FeeDueStatus.PAID
          : paidAmount > 0
          ? FeeDueStatus.PARTIAL
          : FeeDueStatus.UNPAID;

      await db.feeDue.update({
        where: { id: fDue.id },
        data: {
          baseAmount: new Prisma.Decimal(baseAmount),
          concessionTypeSnapshot: concessionResult.concessionType as any,
          concessionValueSnapshot: new Prisma.Decimal(concessionResult.concessionValue),
          concessionAmount: new Prisma.Decimal(concessionResult.concessionAmount),
          netDue: new Prisma.Decimal(newNetDue),
          balance: new Prisma.Decimal(newBalance),
          status: newStatus,
          ...(activeConfigId ? { feeConfigId: activeConfigId } : {}),
          version: { increment: 1 },
        },
      });
      updatedDueIds.add(fDue.id);
    }
  }
}
