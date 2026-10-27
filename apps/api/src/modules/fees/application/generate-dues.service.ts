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

    // Also assess all category charges for eligible students in this run
    for (const enrollment of enrollments) {
      await this.assessChargesForStudent(schoolId, enrollment.student.id, feeMonth);
    }

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
   * Assesses all applicable fee category charges for a student based on:
   * 1. Class enrollment & Academic Session
   * 2. Active Transport assignment (route-specific or default)
   * 3. Fee billing rules (with class & route precedence) & category definitions
   * 4. Student concessions
   * Idempotent per (schoolId, studentId, categoryCode, targetPeriod).
   */
  async assessChargesForStudent(
    schoolId: string,
    studentId: string,
    feeMonth?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || this.prisma;
    const targetMonth = feeMonth || getKolkataDateParts().monthString;

    // 1. Fetch student with active enrollment and active transport assignment
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        schoolId,
        status: EntityStatus.ACTIVE,
      },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { class: true, academicSession: true },
          orderBy: { startedAt: 'desc' },
        },
        transportAssignments: {
          where: { status: 'ACTIVE' },
          include: { transport: true, stoppage: true },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return [];
    }

    const enrollment = student.enrollments[0];
    const classEntity = enrollment.class;
    const sessionEntity = enrollment.academicSession;
    const activeTransport = student.transportAssignments[0];

    // 2. Query all active fee categories for school
    let activeCategories = await db.feeCategory.findMany({
      where: { schoolId, status: EntityStatus.ACTIVE },
      orderBy: { code: 'asc' },
    });

    // Ensure standard TUITION category exists for this school
    let tuitionCat: any = activeCategories.find(
      (c) => c.code.toUpperCase() === 'TUITION' || c.displayName.toLowerCase().includes('tuition')
    );
    if (!tuitionCat) {
      tuitionCat = await db.feeCategory.findFirst({
        where: { schoolId, code: 'TUITION' },
      });
      if (!tuitionCat) {
        tuitionCat = await db.feeCategory.create({
          data: {
            schoolId,
            code: 'TUITION',
            displayName: 'Monthly Tuition Fee',
            chargeKind: 'RECURRING',
            description: 'Standard monthly class tuition fee',
            status: EntityStatus.ACTIVE,
            version: 1,
          },
        });
      } else if (tuitionCat.status !== EntityStatus.ACTIVE) {
        tuitionCat = await db.feeCategory.update({
          where: { id: tuitionCat.id },
          data: { status: EntityStatus.ACTIVE },
        });
      }
      activeCategories.push(tuitionCat);
    }

    if (activeCategories.length === 0) {
      return [];
    }

    // 3. Query all active fee rules for school valid for target month
    const asOf = new Date(`${targetMonth}-01`);
    const activeRules = await db.feeRule.findMany({
      where: {
        schoolId,
        status: EntityStatus.ACTIVE,
        effectiveFrom: { lte: new Date(`${targetMonth}-28`) },
        OR: [{ validUntil: null }, { validUntil: { gte: asOf } }],
      },
      include: {
        category: true,
        class: true,
        academicSession: true,
        transport: true,
      },
    });

    const results: any[] = [];

    for (const cat of activeCategories) {
      const normCode = cat.code.toUpperCase();
      const isTransport = normCode === 'TRANSPORT' || cat.displayName.toLowerCase().includes('transport');
      const isTuition = normCode === 'TUITION' || cat.displayName.toLowerCase().includes('tuition');

      // -------------------------------------------------------------
      // Case A: TRANSPORT FEE
      // -------------------------------------------------------------
      if (isTransport) {
        if (!activeTransport) {
          // Student is NOT using transport - do not charge
          continue;
        }

        const catRules = activeRules.filter((r) => r.categoryId === cat.id);
        let bestRule: (typeof activeRules)[0] | null = null;
        let bestScore = -1;

        for (const r of catRules) {
          let score = -1;
          if (r.transportId && r.transportId === activeTransport.transportId) {
            score = 10; // Route-specific rule!
          } else if (!r.transportId && r.classId === classEntity?.id) {
            score = 3; // Class-specific transport rule
          } else if (!r.transportId && !r.classId) {
            score = 1; // Default transport rule
          }

          if (score > bestScore) {
            bestScore = score;
            bestRule = r;
          }
        }

        const amount = bestRule ? Number(bestRule.amount) : 0;
        if (amount > 0) {
          const routeName = activeTransport.transport.name;
          const sourceKey = `${schoolId}:${student.id}:${normCode}:${targetMonth}`;
          const charge = await this.upsertCharge(db, {
            schoolId,
            studentId: student.id,
            academicSessionId: sessionEntity?.id || null,
            classId: classEntity?.id || null,
            categoryId: cat.id,
            ruleId: bestRule?.id || null,
            sourceKey,
            originRef: targetMonth,
            description: `${cat.displayName} (${routeName})`,
            baseAmount: amount,
            concessionAmount: 0,
            netAmount: amount,
            status: FeeDueStatus.UNPAID,
          });
          results.push(charge);
        }
        continue;
      }

      // -------------------------------------------------------------
      // Case B: TUITION FEE
      // -------------------------------------------------------------
      if (isTuition) {
        const catRules = activeRules.filter((r) => r.categoryId === cat.id);
        let bestRule: (typeof activeRules)[0] | null = null;
        let bestScore = -1;

        for (const r of catRules) {
          let score = -1;
          const matchesClass = r.classId === classEntity?.id;
          const matchesSession = r.academicSessionId === sessionEntity?.id;

          if (r.classId && r.academicSessionId && matchesClass && matchesSession) score = 4;
          else if (r.classId && !r.academicSessionId && matchesClass) score = 3;
          else if (!r.classId && r.academicSessionId && matchesSession) score = 2;
          else if (!r.classId && !r.academicSessionId && !r.transportId) score = 1;

          if (score > bestScore) {
            bestScore = score;
            bestRule = r;
          }
        }

        let baseAmount = bestRule ? Number(bestRule.amount) : 0;
        if (baseAmount <= 0 && classEntity?.id) {
          const legacyConfig = await this.feesRepository.findEffectiveConfig(schoolId, classEntity.id, targetMonth);
          if (legacyConfig) {
            baseAmount = Number(legacyConfig.amount);
          }
        }
        if (baseAmount <= 0) {
          const existingDue = await db.feeDue.findUnique({
            where: {
              schoolId_studentId_feeMonth: {
                schoolId,
                studentId: student.id,
                feeMonth: targetMonth,
              },
            },
          });
          if (existingDue) {
            baseAmount = Number(existingDue.baseAmount);
          }
        }

        if (baseAmount > 0) {
          const concessionResult = ConcessionCalculator.calculate(
            baseAmount,
            student.concessionType as any,
            Number(student.concessionValue)
          );
          const netDue = concessionResult.netDue;
          const sourceKey = `${schoolId}:${student.id}:${normCode}:${targetMonth}`;

          const charge = await this.upsertCharge(db, {
            schoolId,
            studentId: student.id,
            academicSessionId: sessionEntity?.id || null,
            classId: classEntity?.id || null,
            categoryId: cat.id,
            ruleId: bestRule?.id || null,
            sourceKey,
            originRef: targetMonth,
            description: cat.displayName,
            baseAmount: concessionResult.baseAmount,
            concessionAmount: concessionResult.concessionAmount,
            netAmount: netDue,
            status: netDue === 0 ? FeeDueStatus.PAID : FeeDueStatus.UNPAID,
          });
          results.push(charge);

          if (classEntity?.id) {
            await this.syncLegacyDue(db, {
              schoolId,
              studentId: student.id,
              classId: classEntity.id,
              feeMonth: targetMonth,
              baseAmount: concessionResult.baseAmount,
              concessionType: concessionResult.concessionType,
              concessionValue: concessionResult.concessionValue,
              concessionAmount: concessionResult.concessionAmount,
              netDue,
            });
          }
        }
        continue;
      }

      // -------------------------------------------------------------
      // Case C: OTHER CATEGORIES (EXAM, ADMISSION, ETC.)
      // -------------------------------------------------------------
      const catRules = activeRules.filter((r) => r.categoryId === cat.id);
      let bestRule: (typeof activeRules)[0] | null = null;
      let bestScore = -1;

      for (const r of catRules) {
        let score = -1;
        const matchesClass = r.classId === classEntity?.id;
        const matchesSession = r.academicSessionId === sessionEntity?.id;

        if (r.classId && r.academicSessionId && matchesClass && matchesSession) score = 4;
        else if (r.classId && !r.academicSessionId && matchesClass) score = 3;
        else if (!r.classId && r.academicSessionId && matchesSession) score = 2;
        else if (!r.classId && !r.academicSessionId && !r.transportId) score = 1;

        if (score > bestScore) {
          bestScore = score;
          bestRule = r;
        }
      }

      // If rule requires a specific class and student's class doesn't match, bestRule will not match
      if (bestRule && Number(bestRule.amount) > 0) {
        const amount = Number(bestRule.amount);
        const isOneTime = bestRule.recurrencePolicy === 'ONE_TIME' || cat.chargeKind === 'ONE_TIME';
        const periodKey = isOneTime
          ? 'ONCE'
          : sessionEntity?.id
          ? `${sessionEntity.code || 'SESSION'}-${targetMonth}`
          : targetMonth;
        const sourceKey = `${schoolId}:${student.id}:${normCode}:${periodKey}`;

        const charge = await this.upsertCharge(db, {
          schoolId,
          studentId: student.id,
          academicSessionId: sessionEntity?.id || null,
          classId: classEntity?.id || null,
          categoryId: cat.id,
          ruleId: bestRule.id,
          sourceKey,
          originRef: targetMonth,
          description: cat.displayName,
          baseAmount: amount,
          concessionAmount: 0,
          netAmount: amount,
          status: FeeDueStatus.UNPAID,
        });
        results.push(charge);
      }
    }

    return results;
  }

  private async upsertCharge(
    db: any,
    data: {
      schoolId: string;
      studentId: string;
      academicSessionId: string | null;
      classId: string | null;
      categoryId: string;
      ruleId: string | null;
      sourceKey: string;
      originRef: string;
      description: string;
      baseAmount: number;
      concessionAmount: number;
      netAmount: number;
      status: FeeDueStatus;
    }
  ) {
    const existing = await db.feeCharge.findUnique({
      where: {
        schoolId_sourceKey: {
          schoolId: data.schoolId,
          sourceKey: data.sourceKey,
        },
      },
      include: { category: true, class: true },
    });

    if (existing) {
      if (Number(existing.paidAmount) === 0 && existing.status !== FeeDueStatus.PAID) {
        let syncPaid = 0;
        let syncBal = data.netAmount;
        let syncStatus = data.status;
        if (data.originRef) {
          const existingDue = await db.feeDue.findUnique({
            where: {
              schoolId_studentId_feeMonth: {
                schoolId: data.schoolId,
                studentId: data.studentId,
                feeMonth: data.originRef,
              },
            },
          });
          if (existingDue && Number(existingDue.paidAmount) > 0) {
            syncPaid = Number(existingDue.paidAmount);
            syncBal = Number(existingDue.balance);
            syncStatus = existingDue.status;
          }
        }

        return db.feeCharge.update({
          where: { id: existing.id },
          data: {
            baseAmount: new Prisma.Decimal(data.baseAmount),
            concessionAmount: new Prisma.Decimal(data.concessionAmount),
            netAmount: new Prisma.Decimal(data.netAmount),
            paidAmount: new Prisma.Decimal(syncPaid),
            balance: new Prisma.Decimal(syncBal),
            status: syncStatus,
            ruleId: data.ruleId,
            classId: data.classId,
            academicSessionId: data.academicSessionId,
            description: data.description,
            version: { increment: 1 },
          },
          include: { category: true, class: true },
        });
      }
      return existing;
    }

    let initialPaid = 0;
    let initialBal = data.netAmount;
    let initialStatus = data.status;
    if (data.originRef) {
      const existingDue = await db.feeDue.findUnique({
        where: {
          schoolId_studentId_feeMonth: {
            schoolId: data.schoolId,
            studentId: data.studentId,
            feeMonth: data.originRef,
          },
        },
      });
      if (existingDue) {
        initialPaid = Number(existingDue.paidAmount);
        initialBal = Number(existingDue.balance);
        initialStatus = existingDue.status;
      }
    }

    return db.feeCharge.create({
      data: {
        schoolId: data.schoolId,
        studentId: data.studentId,
        academicSessionId: data.academicSessionId,
        classId: data.classId,
        categoryId: data.categoryId,
        ruleId: data.ruleId,
        sourceKey: data.sourceKey,
        originRef: data.originRef,
        description: data.description,
        baseAmount: new Prisma.Decimal(data.baseAmount),
        concessionAmount: new Prisma.Decimal(data.concessionAmount),
        netAmount: new Prisma.Decimal(data.netAmount),
        paidAmount: new Prisma.Decimal(initialPaid),
        balance: new Prisma.Decimal(initialBal),
        status: initialStatus,
      },
      include: { category: true, class: true },
    });
  }

  private async syncLegacyDue(
    db: any,
    data: {
      schoolId: string;
      studentId: string;
      classId: string;
      feeMonth: string;
      baseAmount: number;
      concessionType: any;
      concessionValue: number;
      concessionAmount: number;
      netDue: number;
    }
  ) {
    const existing = await db.feeDue.findUnique({
      where: {
        schoolId_studentId_feeMonth: {
          schoolId: data.schoolId,
          studentId: data.studentId,
          feeMonth: data.feeMonth,
        },
      },
    });

    if (existing) {
      if (Number(existing.paidAmount) === 0 && existing.status !== FeeDueStatus.PAID) {
        await db.feeDue.update({
          where: { id: existing.id },
          data: {
            baseAmount: new Prisma.Decimal(data.baseAmount),
            concessionTypeSnapshot: data.concessionType,
            concessionValueSnapshot: new Prisma.Decimal(data.concessionValue),
            concessionAmount: new Prisma.Decimal(data.concessionAmount),
            netDue: new Prisma.Decimal(data.netDue),
            balance: new Prisma.Decimal(data.netDue),
            status: data.netDue === 0 ? FeeDueStatus.PAID : FeeDueStatus.UNPAID,
          },
        });
      }
    } else {
      try {
        await db.feeDue.create({
          data: {
            schoolId: data.schoolId,
            studentId: data.studentId,
            classId: data.classId,
            feeMonth: data.feeMonth,
            baseAmount: new Prisma.Decimal(data.baseAmount),
            concessionTypeSnapshot: data.concessionType,
            concessionValueSnapshot: new Prisma.Decimal(data.concessionValue),
            concessionAmount: new Prisma.Decimal(data.concessionAmount),
            netDue: new Prisma.Decimal(data.netDue),
            paidAmount: new Prisma.Decimal(0),
            balance: new Prisma.Decimal(data.netDue),
            status: data.netDue === 0 ? FeeDueStatus.PAID : FeeDueStatus.UNPAID,
          },
        });
      } catch {
        // Ignore race condition on unique constraint
      }
    }
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

    // Also assess all category charges for current month
    await this.assessChargesForStudent(schoolId, studentId, currentMonth, tx);

    // Also check student admission month if different
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { admissionDate: true },
    });

    if (student?.admissionDate) {
      const admissionMonth = getKolkataDateParts(new Date(student.admissionDate)).monthString;
      if (admissionMonth !== currentMonth && admissionMonth <= currentMonth) {
        await this.generateDueForStudent(schoolId, studentId, admissionMonth, tx);
        await this.assessChargesForStudent(schoolId, studentId, admissionMonth, tx);
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
