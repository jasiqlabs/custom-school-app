import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import type {
  FeeCategoryDto,
  CreateFeeCategoryInput,
  UpdateFeeCategoryInput,
  FeeRuleDto,
  CreateFeeRuleInput,
  UpdateFeeRuleInput,
  ResolveRulesQuery,
  SessionActor,
} from '@custom-school/contracts';

@Injectable()
export class FeeCategoriesRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  async listCategories(schoolId: string): Promise<FeeCategoryDto[]> {
    const list = await this.prisma.feeCategory.findMany({
      where: { schoolId },
      orderBy: { code: 'asc' },
    });

    return list.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      code: c.code,
      displayName: c.displayName,
      chargeKind: c.chargeKind as any,
      description: c.description,
      status: c.status as any,
      version: c.version,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async createCategory(
    schoolId: string,
    input: CreateFeeCategoryInput,
    actor?: SessionActor,
  ): Promise<FeeCategoryDto> {
    const normalizedCode = input.code.trim().toUpperCase();

    const existing = await this.prisma.feeCategory.findFirst({
      where: { schoolId, code: normalizedCode },
    });

    if (existing) {
      throw new ConflictException(
        `Fee category with code '${normalizedCode}' already exists for this school.`,
      );
    }

    const created = await this.prisma.feeCategory.create({
      data: {
        schoolId,
        code: normalizedCode,
        displayName: input.displayName.trim(),
        chargeKind: (input.chargeKind as any) || 'RECURRING',
        description: input.description?.trim() || null,
        status: 'ACTIVE',
        version: 1,
      },
    });

    if (actor) {
      await this.audit.append({
        requestId: actor.requestId,
        schoolId,
        actorType: actor.userType,
        actorId: actor.userId,
        eventType: 'FEE_CATEGORY_CREATE',
        targetType: 'FeeCategory',
        targetId: created.id,
        metadata: {
          code: created.code,
          displayName: created.displayName,
          chargeKind: created.chargeKind,
        },
      });
    }

    return {
      id: created.id,
      schoolId: created.schoolId,
      code: created.code,
      displayName: created.displayName,
      chargeKind: created.chargeKind as any,
      description: created.description,
      status: created.status as any,
      version: created.version,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateCategory(
    schoolId: string,
    categoryId: string,
    input: UpdateFeeCategoryInput,
    actor?: SessionActor,
  ): Promise<FeeCategoryDto> {
    const existing = await this.prisma.feeCategory.findFirst({
      where: { id: categoryId, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Fee category not found for this school.');
    }

    if (existing.version !== input.version) {
      throw new ConflictException(
        'Fee category was modified by another user. Please refresh and try again.',
      );
    }

    const updated = await this.prisma.feeCategory.update({
      where: { id: categoryId },
      data: {
        ...(input.displayName !== undefined && { displayName: input.displayName.trim() }),
        ...(input.chargeKind !== undefined && { chargeKind: input.chargeKind as any }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.status !== undefined && { status: input.status as any }),
        version: { increment: 1 },
      },
    });

    if (actor) {
      await this.audit.append({
        requestId: actor.requestId,
        schoolId,
        actorType: actor.userType,
        actorId: actor.userId,
        eventType: 'FEE_CATEGORY_UPDATE',
        targetType: 'FeeCategory',
        targetId: updated.id,
        metadata: {
          code: updated.code,
          displayName: updated.displayName,
          status: updated.status,
        },
      });
    }

    return {
      id: updated.id,
      schoolId: updated.schoolId,
      code: updated.code,
      displayName: updated.displayName,
      chargeKind: updated.chargeKind as any,
      description: updated.description,
      status: updated.status as any,
      version: updated.version,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // =========================================================================
  // RULES
  // =========================================================================

  async listRules(
    schoolId: string,
    filter?: {
      categoryId?: string;
      classId?: string;
      academicSessionId?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ): Promise<FeeRuleDto[]> {
    const list = await this.prisma.feeRule.findMany({
      where: {
        schoolId,
        ...(filter?.categoryId && { categoryId: filter.categoryId }),
        ...(filter?.classId && { classId: filter.classId }),
        ...(filter?.academicSessionId && { academicSessionId: filter.academicSessionId }),
        ...(filter?.status && { status: filter.status as any }),
      },
      include: {
        category: true,
        class: true,
        academicSession: true,
      },
      orderBy: [
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return list.map((r) => this.mapRuleToDto(r));
  }

  async createRule(
    schoolId: string,
    input: CreateFeeRuleInput,
    actor?: SessionActor,
  ): Promise<FeeRuleDto> {
    // 1. Verify Category exists and belongs to school
    const category = await this.prisma.feeCategory.findFirst({
      where: { id: input.categoryId, schoolId },
    });
    if (!category) {
      throw new NotFoundException('Fee category not found for this school.');
    }

    // 2. Verify Class if provided
    let className: string | undefined;
    if (input.classId) {
      const cls = await this.prisma.class.findFirst({
        where: { id: input.classId, schoolId },
      });
      if (!cls) {
        throw new NotFoundException('Target class not found for this school.');
      }
      className = cls.name;
    }

    // 3. Verify Academic Session if provided
    let sessionCode: string | undefined;
    let sessionLabel: string | undefined;
    if (input.academicSessionId) {
      const session = await this.prisma.academicSession.findFirst({
        where: { id: input.academicSessionId, schoolId },
      });
      if (!session) {
        throw new NotFoundException('Target academic session not found for this school.');
      }
      sessionCode = session.code;
      sessionLabel = session.label;
    }

    // 4. Validate dates
    const effectiveFromDate = new Date(input.effectiveFrom);
    const validUntilDate = input.validUntil ? new Date(input.validUntil) : null;
    if (validUntilDate && validUntilDate < effectiveFromDate) {
      throw new BadRequestException('validUntil must be on or after effectiveFrom.');
    }

    // 5. Overlap check for same scope (category + class + session)
    await this.assertNoOverlappingRule({
      schoolId,
      categoryId: input.categoryId,
      classId: input.classId || null,
      academicSessionId: input.academicSessionId || null,
      effectiveFrom: effectiveFromDate,
      validUntil: validUntilDate,
    });

    // 6. Create Rule
    const created = await this.prisma.feeRule.create({
      data: {
        schoolId,
        categoryId: input.categoryId,
        classId: input.classId || null,
        academicSessionId: input.academicSessionId || null,
        amount: input.amount,
        effectiveFrom: effectiveFromDate,
        validUntil: validUntilDate,
        recurrencePolicy: (input.recurrencePolicy as any) || 'MONTHLY',
        paymentDueOffset: input.paymentDueOffset ?? null,
        status: 'ACTIVE',
        version: 1,
        createdBy: actor?.userId || null,
      },
      include: {
        category: true,
        class: true,
        academicSession: true,
      },
    });

    if (actor) {
      await this.audit.append({
        requestId: actor.requestId,
        schoolId,
        actorType: actor.userType,
        actorId: actor.userId,
        eventType: 'FEE_RULE_CREATE',
        targetType: 'FeeRule',
        targetId: created.id,
        metadata: {
          categoryCode: category.code,
          classId: created.classId,
          academicSessionId: created.academicSessionId,
          amount: Number(created.amount),
          effectiveFrom: input.effectiveFrom,
          validUntil: input.validUntil,
        },
      });
    }

    return this.mapRuleToDto(created);
  }

  async updateRule(
    schoolId: string,
    ruleId: string,
    input: UpdateFeeRuleInput,
    actor?: SessionActor,
  ): Promise<FeeRuleDto> {
    const existing = await this.prisma.feeRule.findFirst({
      where: { id: ruleId, schoolId },
      include: { category: true },
    });

    if (!existing) {
      throw new NotFoundException('Fee rule not found for this school.');
    }

    if (existing.version !== input.version) {
      throw new ConflictException(
        'Fee rule was modified by another transaction. Please refresh and try again.',
      );
    }

    const effectiveFromDate = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : existing.effectiveFrom;
    const validUntilDate =
      input.validUntil !== undefined
        ? input.validUntil
          ? new Date(input.validUntil)
          : null
        : existing.validUntil;

    if (validUntilDate && validUntilDate < effectiveFromDate) {
      throw new BadRequestException('validUntil must be on or after effectiveFrom.');
    }

    const nextStatus = input.status || existing.status;

    // Overlap check if active
    if (nextStatus === 'ACTIVE') {
      await this.assertNoOverlappingRule({
        schoolId,
        categoryId: existing.categoryId,
        classId: existing.classId,
        academicSessionId: existing.academicSessionId,
        effectiveFrom: effectiveFromDate,
        validUntil: validUntilDate,
        excludeRuleId: existing.id,
      });
    }

    const updated = await this.prisma.feeRule.update({
      where: { id: ruleId },
      data: {
        ...(input.amount !== undefined && { amount: input.amount }),
        ...(input.effectiveFrom !== undefined && { effectiveFrom: effectiveFromDate }),
        ...(input.validUntil !== undefined && { validUntil: validUntilDate }),
        ...(input.recurrencePolicy !== undefined && { recurrencePolicy: input.recurrencePolicy as any }),
        ...(input.paymentDueOffset !== undefined && { paymentDueOffset: input.paymentDueOffset }),
        ...(input.status !== undefined && { status: input.status as any }),
        version: { increment: 1 },
      },
      include: {
        category: true,
        class: true,
        academicSession: true,
      },
    });

    if (actor) {
      await this.audit.append({
        requestId: actor.requestId,
        schoolId,
        actorType: actor.userType,
        actorId: actor.userId,
        eventType: 'FEE_RULE_UPDATE',
        targetType: 'FeeRule',
        targetId: updated.id,
        metadata: {
          categoryCode: existing.category.code,
          amount: Number(updated.amount),
          status: updated.status,
        },
      });
    }

    return this.mapRuleToDto(updated);
  }

  // =========================================================================
  // RULE RESOLUTION ENGINE (Section 4)
  // Precedence:
  // 1. Class + Academic Session (most specific)
  // 2. Class only
  // 3. Academic Session only
  // 4. School-wide (both null)
  // =========================================================================

  async resolveApplicableRules(
    schoolId: string,
    query: ResolveRulesQuery,
  ): Promise<FeeRuleDto[]> {
    const asOf = query.asOfDate ? new Date(query.asOfDate) : new Date();

    // 1. Get all active fee categories for school
    const activeCategories = await this.prisma.feeCategory.findMany({
      where: { schoolId, status: 'ACTIVE' },
    });

    if (activeCategories.length === 0) {
      return [];
    }

    const categoryIds = activeCategories.map((c) => c.id);

    // 2. Find all active rules for these categories valid as of date
    const candidateRules = await this.prisma.feeRule.findMany({
      where: {
        schoolId,
        categoryId: { in: categoryIds },
        status: 'ACTIVE',
        effectiveFrom: { lte: asOf },
        OR: [
          { validUntil: null },
          { validUntil: { gte: asOf } },
        ],
      },
      include: {
        category: true,
        class: true,
        academicSession: true,
      },
    });

    // 3. For each category, resolve the single highest precedence rule
    const resolved: FeeRuleDto[] = [];

    for (const cat of activeCategories) {
      const catRules = candidateRules.filter((r) => r.categoryId === cat.id);
      if (catRules.length === 0) continue;

      let bestRule: (typeof candidateRules)[0] | null = null;
      let bestScore = -1;

      for (const r of catRules) {
        let score = -1;
        const matchesClass = r.classId === query.classId;
        const matchesSession = r.academicSessionId === query.academicSessionId;

        if (query.classId && query.academicSessionId && r.classId && r.academicSessionId) {
          if (matchesClass && matchesSession) score = 4; // Level 1
        } else if (query.classId && r.classId && !r.academicSessionId) {
          if (matchesClass) score = 3; // Level 2
        } else if (query.academicSessionId && !r.classId && r.academicSessionId) {
          if (matchesSession) score = 2; // Level 3
        } else if (!r.classId && !r.academicSessionId) {
          score = 1; // Level 4: School-wide default
        }

        if (score > bestScore) {
          bestScore = score;
          bestRule = r;
        }
      }

      if (bestRule) {
        resolved.push(this.mapRuleToDto(bestRule));
      }
    }

    return resolved;
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private async assertNoOverlappingRule(params: {
    schoolId: string;
    categoryId: string;
    classId: string | null;
    academicSessionId: string | null;
    effectiveFrom: Date;
    validUntil: Date | null;
    excludeRuleId?: string;
  }): Promise<void> {
    const existingRules = await this.prisma.feeRule.findMany({
      where: {
        schoolId: params.schoolId,
        categoryId: params.categoryId,
        classId: params.classId,
        academicSessionId: params.academicSessionId,
        status: 'ACTIVE',
        ...(params.excludeRuleId && { id: { not: params.excludeRuleId } }),
      },
    });

    const newStart = params.effectiveFrom.getTime();
    const newEnd = params.validUntil ? params.validUntil.getTime() : Infinity;

    for (const rule of existingRules) {
      const existStart = rule.effectiveFrom.getTime();
      const existEnd = rule.validUntil ? rule.validUntil.getTime() : Infinity;

      // Two ranges [A, B] and [C, D] overlap if A <= D and C <= B
      if (newStart <= existEnd && existStart <= newEnd) {
        throw new ConflictException(
          'An active fee rule already exists for this category/scope with an overlapping date window.',
        );
      }
    }
  }

  private mapRuleToDto(r: any): FeeRuleDto {
    return {
      id: r.id,
      schoolId: r.schoolId,
      categoryId: r.categoryId,
      categoryCode: r.category?.code,
      categoryName: r.category?.displayName,
      chargeKind: r.category?.chargeKind,
      academicSessionId: r.academicSessionId,
      sessionCode: r.academicSession?.code,
      sessionLabel: r.academicSession?.label,
      classId: r.classId,
      className: r.class?.name,
      amount: Number(r.amount),
      effectiveFrom: r.effectiveFrom.toISOString().slice(0, 10),
      validUntil: r.validUntil ? r.validUntil.toISOString().slice(0, 10) : null,
      recurrencePolicy: r.recurrencePolicy,
      paymentDueOffset: r.paymentDueOffset,
      status: r.status,
      version: r.version,
      createdBy: r.createdBy,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
  }
}
