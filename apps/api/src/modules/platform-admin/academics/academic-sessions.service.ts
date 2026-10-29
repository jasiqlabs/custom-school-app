import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import type {
  SessionActor,
  AcademicSessionDto,
  CreateAcademicSessionInput,
  UpdateAcademicSessionInput,
  ActivateAcademicSessionInput,
  CloseAcademicSessionInput,
} from '@custom-school/contracts';

@Injectable()
export class AcademicSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(session: any): AcademicSessionDto {
    const formatDate = (d: Date | string) => {
      if (typeof d === 'string') return d.split('T')[0];
      return d.toISOString().split('T')[0];
    };

    return {
      id: session.id,
      schoolId: session.schoolId,
      code: session.code,
      label: session.label,
      startDate: formatDate(session.startDate),
      endDate: formatDate(session.endDate),
      status: session.status,
      version: session.version,
      activatedAt: session.activatedAt ? session.activatedAt.toISOString() : null,
      closedAt: session.closedAt ? session.closedAt.toISOString() : null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  async list(schoolId: string, page = 1, size = 20): Promise<{ items: AcademicSessionDto[]; total: number; page: number; size: number }> {
    const skip = Math.max(0, (page - 1) * size);
    const take = Math.min(100, Math.max(1, size));

    const [items, total] = await Promise.all([
      this.prisma.academicSession.findMany({
        where: { schoolId },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.academicSession.count({ where: { schoolId } }),
    ]);

    return {
      items: items.map((i) => this.toDto(i)),
      total,
      page,
      size: take,
    };
  }

  async getById(schoolId: string, id: string): Promise<AcademicSessionDto> {
    const session = await this.prisma.academicSession.findFirst({
      where: { id, schoolId },
    });
    if (!session) {
      throw new NotFoundException('Academic session not found in this school');
    }
    return this.toDto(session);
  }

  async getCurrent(schoolId: string): Promise<AcademicSessionDto | null> {
    const session = await this.prisma.academicSession.findFirst({
      where: { schoolId, status: 'ACTIVE' },
    });
    return session ? this.toDto(session) : null;
  }

  async create(actor: SessionActor, schoolId: string, input: CreateAcademicSessionInput): Promise<AcademicSessionDto> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, status: true },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    if (actor.userType === 'OPERATOR' && school.status !== 'ACTIVE') {
      throw new ConflictException('Operator cannot create academic sessions for a non-active school');
    }

    if (input.endDate < input.startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    const existingCode = await this.prisma.academicSession.findUnique({
      where: { schoolId_code: { schoolId, code: input.code.trim() } },
    });
    if (existingCode) {
      throw new ConflictException(`Academic session code '${input.code}' already exists in this school`);
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.academicSession.create({
        data: {
          schoolId,
          code: input.code.trim(),
          label: input.label.trim(),
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: new Date(`${input.endDate}T00:00:00.000Z`),
          status: 'DRAFT',
          version: 1,
          createdBy: actor.userId,
        },
      });

      // Automatically reuse the school's existing applicable fee categories, amounts, and billing rules
      await this.reuseFeeConfigurationForNewSession(tx, actor, schoolId, created);

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'ACADEMIC_SESSION_CREATED',
          targetType: 'ACADEMIC_SESSION',
          targetId: created.id,
          metadata: {
            code: created.code,
            label: created.label,
            startDate: input.startDate,
            endDate: input.endDate,
          },
        },
        tx
      );

      return this.toDto(created);
    });
  }

  async update(actor: SessionActor, schoolId: string, id: string, input: UpdateAcademicSessionInput): Promise<AcademicSessionDto> {
    return this.prisma.$transaction(async (tx) => {
      // Lock row
      await tx.$queryRaw`SELECT id FROM academic_sessions WHERE school_id = ${schoolId} AND id = ${id}::uuid FOR UPDATE`;

      const existing = await tx.academicSession.findFirst({
        where: { id, schoolId },
      });
      if (!existing) {
        throw new NotFoundException('Academic session not found in this school');
      }

      if (existing.version !== input.version) {
        throw new ConflictException('Academic session version conflict. Please refresh and retry.');
      }

      if (existing.status === 'CLOSED') {
        throw new ConflictException('Cannot modify a closed academic session');
      }

      const newStart = input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : existing.startDate;
      const newEnd = input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : existing.endDate;

      if (newEnd < newStart) {
        throw new BadRequestException('endDate must be greater than or equal to startDate');
      }

      const updated = await tx.academicSession.update({
        where: { id },
        data: {
          label: input.label !== undefined ? input.label.trim() : existing.label,
          startDate: newStart,
          endDate: newEnd,
          version: { increment: 1 },
        },
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'ACADEMIC_SESSION_UPDATED',
          targetType: 'ACADEMIC_SESSION',
          targetId: id,
          metadata: {
            previousVersion: existing.version,
            newVersion: updated.version,
          },
        },
        tx
      );

      return this.toDto(updated);
    });
  }

  async activate(actor: SessionActor, schoolId: string, id: string, input: ActivateAcademicSessionInput): Promise<AcademicSessionDto> {
    return this.prisma.$transaction(async (tx) => {
      // Lock school row to prevent simultaneous activations across the school
      await tx.$queryRaw`SELECT id, status FROM schools WHERE id = ${schoolId} FOR UPDATE`;

      const school = await tx.school.findUnique({
        where: { id: schoolId },
        select: { id: true, status: true },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      if (actor.userType === 'OPERATOR' && school.status !== 'ACTIVE') {
        throw new ConflictException('Operator cannot activate academic session for a non-active school');
      }

      const session = await tx.academicSession.findFirst({
        where: { id, schoolId },
      });
      if (!session) {
        throw new NotFoundException('Academic session not found in this school');
      }

      if (session.version !== input.version) {
        throw new ConflictException('Academic session version conflict. Please refresh and retry.');
      }

      if (session.status === 'ACTIVE') {
        return this.toDto(session);
      }

      if (session.status !== 'DRAFT') {
        throw new ConflictException(`Cannot activate session from ${session.status} state`);
      }

      // Check if there is already an ACTIVE or CLOSING session
      const currentActive = await tx.academicSession.findFirst({
        where: {
          schoolId,
          status: { in: ['ACTIVE', 'CLOSING'] },
        },
      });

      if (currentActive) {
        throw new ConflictException(
          `Another academic session '${currentActive.label}' (${currentActive.code}) is currently ${currentActive.status}. Close the active session before activating a new one.`
        );
      }

      const activated = await tx.academicSession.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'ACADEMIC_SESSION_ACTIVATED',
          targetType: 'ACADEMIC_SESSION',
          targetId: id,
          metadata: {
            code: activated.code,
            label: activated.label,
            previousVersion: session.version,
            newVersion: activated.version,
          },
        },
        tx
      );

      return this.toDto(activated);
    });
  }

  async getActiveSession(schoolId: string): Promise<AcademicSessionDto | null> {
    const session = await this.prisma.academicSession.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
      },
    });
    return session ? this.toDto(session) : null;
  }

  async close(actor: SessionActor, schoolId: string, id: string, input: CloseAcademicSessionInput): Promise<AcademicSessionDto> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM academic_sessions WHERE school_id = ${schoolId} AND id = ${id}::uuid FOR UPDATE`;

      const existing = await tx.academicSession.findFirst({
        where: { id, schoolId },
      });
      if (!existing) {
        throw new NotFoundException('Academic session not found in this school');
      }

      if (existing.version !== input.version) {
        throw new ConflictException('Academic session version conflict. Please refresh and retry.');
      }

      if (existing.status === 'CLOSED') {
        return this.toDto(existing);
      }

      const closed = await tx.academicSession.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'ACADEMIC_SESSION_CLOSED',
          targetType: 'ACADEMIC_SESSION',
          targetId: id,
          metadata: {
            code: closed.code,
            label: closed.label,
            previousVersion: existing.version,
            newVersion: closed.version,
          },
        },
        tx
      );

      return this.toDto(closed);
    });
  }

  private async reuseFeeConfigurationForNewSession(
    tx: any,
    actor: SessionActor,
    schoolId: string,
    newSession: any
  ) {
    if (!tx.feeRule?.findMany) return;

    // 1. Identify prior academic session to reuse configuration from
    const priorSession = await tx.academicSession.findFirst({
      where: {
        schoolId,
        id: { not: newSession.id },
        status: { in: ['ACTIVE', 'CLOSING', 'CLOSED'] },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    // 2. Fetch all active fee rules for school (prior session and global)
    const allActiveRules = await tx.feeRule.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        OR: [
          ...(priorSession ? [{ academicSessionId: priorSession.id }] : []),
          { academicSessionId: null },
        ],
      },
    });

    // Deduplicate by scope: (categoryId, classId || '', transportId || '')
    // Prior session rule takes precedence over global default
    const ruleMap = new Map<string, any>();
    for (const r of allActiveRules) {
      const key = `${r.categoryId}:${r.classId || ''}:${r.transportId || ''}`;
      const existing = ruleMap.get(key);
      if (!existing || (r.academicSessionId && !existing.academicSessionId)) {
        ruleMap.set(key, r);
      }
    }

    // Replicate rules for new academic session
    for (const rule of ruleMap.values()) {
      await tx.feeRule.create({
        data: {
          schoolId,
          categoryId: rule.categoryId,
          academicSessionId: newSession.id,
          classId: rule.classId, // Preserves specific class or all-classes (null)
          transportId: rule.transportId, // Preserves transport-route or general (null)
          amount: rule.amount,
          effectiveFrom: newSession.startDate,
          validUntil: newSession.endDate,
          recurrencePolicy: rule.recurrencePolicy,
          paymentDueOffset: rule.paymentDueOffset,
          status: 'ACTIVE',
          version: 1,
          createdBy: actor.userId,
        },
      });
    }

    // 3. Replicate ClassFeeConfig for the new session start month
    if (tx.classFeeConfig?.findMany && tx.class?.findMany) {
      const startMonth = newSession.startDate.toISOString().slice(0, 7);
      const classes = await tx.class.findMany({
        where: { schoolId, status: 'ACTIVE' },
      });

      for (const cls of classes) {
        const latestConfig = await tx.classFeeConfig.findFirst({
          where: { schoolId, classId: cls.id, status: 'ACTIVE' },
          orderBy: { effectiveMonth: 'desc' },
        });

        if (latestConfig) {
          const alreadyExists = await tx.classFeeConfig.findUnique({
            where: {
              schoolId_classId_effectiveMonth: {
                schoolId,
                classId: cls.id,
                effectiveMonth: startMonth,
              },
            },
          });

          if (!alreadyExists) {
            await tx.classFeeConfig.create({
              data: {
                schoolId,
                classId: cls.id,
                effectiveMonth: startMonth,
                amount: latestConfig.amount,
                status: 'ACTIVE',
                version: 1,
                createdBy: actor.userId,
              },
            });
          }
        }
      }

      if (ruleMap.size > 0 || classes.length > 0) {
        await this.audit.append(
          {
            requestId: actor.requestId,
            schoolId,
            actorType: actor.userType,
            actorId: actor.userId,
            eventType: 'ACADEMIC_SESSION_FEE_CONFIG_REUSED',
            targetType: 'ACADEMIC_SESSION',
            targetId: newSession.id,
            metadata: {
              reusedRulesCount: ruleMap.size,
              effectiveStartMonth: startMonth,
            },
          },
          tx
        );
      }
    }
  }
}
