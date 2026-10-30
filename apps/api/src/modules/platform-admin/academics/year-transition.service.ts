import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { lockStudentForFees } from '../../fees/domain/fee-student-lock';
import type { SessionActor } from '@custom-school/contracts';

type Decision = 'PROMOTE' | 'REPEAT' | 'PASS_OUT' | 'LEAVE';
type StageItem = {
  studentId: string;
  sourceEnrollmentId: string;
  sourceVersion: number;
  decision: Decision;
  targetClassId?: string | null;
  targetSectionId?: string | null;
};

@Injectable()
export class YearTransitionService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  private async scoped(schoolId: string, id: string) {
    const batch = await this.db.yearTransition.findFirst({ where: { id, schoolId } });
    if (!batch) throw new NotFoundException('Year transition not found for this school');
    return batch;
  }

  async list(schoolId: string) {
    return this.db.yearTransition.findMany({
      where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 20,
      include: { _count: { select: { items: true } } },
    });
  }

  async start(actor: SessionActor, schoolId: string, sourceSessionId: string, targetSessionId: string) {
    if (sourceSessionId === targetSessionId) throw new BadRequestException('Source and target years must be different');
    const sessions = await this.db.academicSession.findMany({
      where: { schoolId, id: { in: [sourceSessionId, targetSessionId] } },
    });
    const source = sessions.find(s => s.id === sourceSessionId);
    const target = sessions.find(s => s.id === targetSessionId);
    if (!source || source.status !== 'ACTIVE' || !target || target.status !== 'DRAFT')
      throw new ConflictException('Select one ACTIVE source and one DRAFT target year');
    return this.db.yearTransition.upsert({
      where: { schoolId_sourceSessionId_targetSessionId: { schoolId, sourceSessionId, targetSessionId } },
      update: {},
      create: { schoolId, sourceSessionId, targetSessionId, createdBy: actor.userId },
    });
  }

  async candidates(schoolId: string, batchId: string, page = 1, size = 100) {
    const batch = await this.scoped(schoolId, batchId);
    const take = Math.min(100, Math.max(1, size));
    const skip = (Math.max(1, page) - 1) * take;
    const [items, total, staged] = await Promise.all([
      this.db.studentEnrollment.findMany({
        where: { schoolId, academicSessionId: batch.sourceSessionId, status: 'ACTIVE' },
        select: {
          id: true, enrollmentVersion: true, studentId: true,
          classId: true, sectionId: true,
          student: { select: { studentCode: true, fullName: true } },
        },
        orderBy: { student: { studentCode: 'asc' } }, take, skip,
      }),
      this.db.studentEnrollment.count({
        where: { schoolId, academicSessionId: batch.sourceSessionId, status: 'ACTIVE' },
      }),
      this.db.yearTransitionItem.findMany({
        where: { transitionId: batchId },
        select: { studentId: true, decision: true, targetClassId: true, targetSectionId: true, status: true },
        take: 10000,
      }),
    ]);
    const selected = new Map(staged.map(x => [x.studentId, x]));
    return { batch, page: Math.max(1, page), size: take, total,
      stagedCount: staged.length, items: items.map(x => ({ ...x, staged: selected.get(x.studentId) || null })) };
  }

  async stage(actor: SessionActor, schoolId: string, batchId: string, items: StageItem[]) {
    if (!items.length || items.length > 100) throw new BadRequestException('Choose 1 to 100 students per batch');
    if (new Set(items.map(i => i.studentId)).size !== items.length)
      throw new BadRequestException('Duplicate student decisions');
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM year_transitions WHERE id = ${batchId}::uuid FOR UPDATE`;
      const batch = await tx.yearTransition.findFirst({ where: { id: batchId, schoolId } });
      if (!batch) throw new NotFoundException('Year transition not found');
      if (batch.status !== 'DRAFT') throw new ConflictException('Only a DRAFT year transition can be edited');
      for (const item of items) {
        const current = await tx.studentEnrollment.findFirst({
          where: { id: item.sourceEnrollmentId, studentId: item.studentId, schoolId,
            academicSessionId: batch.sourceSessionId, status: 'ACTIVE' },
        });
        if (!current || current.enrollmentVersion !== item.sourceVersion)
          throw new ConflictException('Enrollment changed. Refresh before staging');
        if (item.decision === 'PROMOTE' || item.decision === 'REPEAT') {
          if (!item.targetClassId || !item.targetSectionId)
            throw new BadRequestException('Target class and section are required');
          const section = await tx.section.findFirst({
            where: { id: item.targetSectionId, schoolId, classId: item.targetClassId,
              status: 'ACTIVE', class: { status: 'ACTIVE' } },
          });
          if (!section) throw new NotFoundException('Target class/section unavailable');
        } else if (!['PASS_OUT', 'LEAVE'].includes(item.decision)) {
          throw new BadRequestException('Invalid promotion decision');
        }
        await tx.yearTransitionItem.upsert({
          where: { transitionId_studentId: { transitionId: batchId, studentId: item.studentId } },
          create: {
            transitionId: batchId, studentId: item.studentId, sourceEnrollmentId: current.id,
            sourceVersion: current.enrollmentVersion, decision: item.decision,
            targetClassId: item.decision === 'PROMOTE' || item.decision === 'REPEAT' ? item.targetClassId : null,
            targetSectionId: item.decision === 'PROMOTE' || item.decision === 'REPEAT' ? item.targetSectionId : null,
          },
          update: {
            sourceEnrollmentId: current.id, sourceVersion: current.enrollmentVersion,
            decision: item.decision,
            targetClassId: item.decision === 'PROMOTE' || item.decision === 'REPEAT' ? item.targetClassId : null,
            targetSectionId: item.decision === 'PROMOTE' || item.decision === 'REPEAT' ? item.targetSectionId : null,
          },
        });
      }
      return { saved: items.length, batchId };
    }, { maxWait: 10000, timeout: 30000 });
  }

  async prepare(actor: SessionActor, schoolId: string, batchId: string) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM schools WHERE id=${schoolId}::uuid FOR UPDATE`;
      const batch = await tx.yearTransition.findFirst({ where: { id: batchId, schoolId } });
      if (!batch) throw new NotFoundException('Transition not found');
      if (batch.status !== 'DRAFT') throw new ConflictException('Transition has already been prepared');
      const [active, decisions, source, target] = await Promise.all([
        tx.studentEnrollment.count({ where: { schoolId, academicSessionId: batch.sourceSessionId, status: 'ACTIVE' } }),
        tx.yearTransitionItem.findMany({ where: { transitionId: batchId },
          select: { sourceEnrollmentId: true, sourceVersion: true } }),
        tx.academicSession.findFirst({ where: { schoolId, id: batch.sourceSessionId } }),
        tx.academicSession.findFirst({ where: { schoolId, id: batch.targetSessionId } }),
      ]);
      if (source?.status !== 'ACTIVE' || target?.status !== 'DRAFT')
        throw new ConflictException('Academic year states have changed');
      if (decisions.length !== active) throw new ConflictException(`Review all students: ${active - decisions.length} decisions missing`);
      const original = await tx.studentEnrollment.findMany({
        where: { schoolId, academicSessionId: batch.sourceSessionId, status: 'ACTIVE' },
        select: { id: true, enrollmentVersion: true },
      });
      const known = new Map(original.map(r => [r.id, r.enrollmentVersion]));
      if (decisions.some(d => known.get(d.sourceEnrollmentId) !== d.sourceVersion))
        throw new ConflictException('Some enrollments changed; refresh the plan');
      const updated = await tx.yearTransition.update({
        where: { id: batchId }, data: { status: 'PREPARED', version: { increment: 1 } },
      });
      await this.audit.append({ requestId: actor.requestId, schoolId, actorType: actor.userType,
        actorId: actor.userId, eventType: 'YEAR_TRANSITION_PREPARED',
        targetType: 'YEAR_TRANSITION', targetId: batchId, metadata: { studentCount: active } }, tx);
      return { batch: updated, readyCount: decisions.length };
    }, { maxWait: 10000, timeout: 30000 });
  }

  async process(actor: SessionActor, schoolId: string, batchId: string) {
    // Bounded batches; resume after a client disconnect or process restart using the saved journal.
    const batch = await this.scoped(schoolId, batchId);
    if (!['PREPARED','CLOSING'].includes(batch.status))
      throw new ConflictException('Prepare the transition before processing');
    if (batch.status === 'PREPARED') {
      await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM schools WHERE id=${schoolId}::uuid FOR UPDATE`;
        const live = await tx.yearTransition.findFirst({ where: { id: batchId, schoolId } });
        if (!live) throw new NotFoundException('Transition not found');
        if (live.status !== 'PREPARED') return;
        const source = await tx.academicSession.findFirst({ where: { id: live.sourceSessionId, schoolId } });
        if (source?.status !== 'ACTIVE') throw new ConflictException('Source year changed');
        await tx.academicSession.update({ where: { id: live.sourceSessionId },
          data: { status: 'CLOSING', version: { increment: 1 } } });
        await tx.yearTransition.update({ where: { id: batchId },
          data: { status: 'CLOSING', version: { increment: 1 } } });
      });
    }
    const items = await this.db.yearTransitionItem.findMany({
      where: { transitionId: batchId, status: 'PREPARED' },
      orderBy: { id: 'asc' }, take: 50,
    });
    for (const item of items) {
      await this.db.$transaction(async tx => {
        await lockStudentForFees(tx, schoolId, item.studentId);
        const row = await tx.yearTransitionItem.findUnique({ where: { id: item.id } });
        if (!row || row.status !== 'PREPARED') return;
        const source = await tx.studentEnrollment.findFirst({
          where: { id: row.sourceEnrollmentId, studentId: row.studentId,
            schoolId, academicSessionId: batch.sourceSessionId, status: 'ACTIVE' },
        });
        if (!source || source.enrollmentVersion !== row.sourceVersion)
          throw new ConflictException('Student changed after preparation; no year switch occurred');
        let stagedEnrollmentId: string | null = null;
        if (row.decision === 'PROMOTE' || row.decision === 'REPEAT') {
          const [cls, section, target] = await Promise.all([
            tx.class.findFirst({ where: { schoolId, id: row.targetClassId!, status: 'ACTIVE' } }),
            tx.section.findFirst({ where: { schoolId, id: row.targetSectionId!,
              classId: row.targetClassId!, status: 'ACTIVE' } }),
            tx.academicSession.findFirst({ where: { id: batch.targetSessionId, schoolId, status: 'DRAFT' } }),
          ]);
          if (!cls || !section || !target) throw new ConflictException('Target class/year is no longer valid');
          const created = await tx.studentEnrollment.create({
            data: {
              schoolId, studentId: row.studentId, academicSessionId: batch.targetSessionId,
              classId: cls.id, sectionId: section.id, classNameSnapshot: cls.name,
              sectionNameSnapshot: section.name, status: 'STAGED',
              validFrom: target.startDate, enrollmentVersion: source.enrollmentVersion + 1,
            },
          });
          stagedEnrollmentId = created.id;
        }
        await tx.yearTransitionItem.update({ where: { id: row.id },
          data: { status: 'STAGED', stagedEnrollmentId } });
      }, { maxWait: 10000, timeout: 30000 });
    }
    const [total, remaining] = await Promise.all([
      this.db.yearTransitionItem.count({ where: { transitionId: batchId } }),
      this.db.yearTransitionItem.count({ where: { transitionId: batchId, status: 'PREPARED' } }),
    ]);
    return { batchId, total, processed: total - remaining, remaining, readyToFinalize: remaining === 0 };
  }

  async finalize(actor: SessionActor, schoolId: string, batchId: string) {
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM schools WHERE id=${schoolId}::uuid FOR UPDATE`;
      const batch = await tx.yearTransition.findFirst({ where: { id: batchId, schoolId } });
      if (!batch) throw new NotFoundException('Transition not found');
      if (batch.status === 'COMPLETED') return { completed: true, alreadyCompleted: true };
      if (batch.status !== 'CLOSING') throw new ConflictException('Transition is not ready');
      const items = await tx.yearTransitionItem.findMany({ where: { transitionId: batchId } });
      if (!items.length || items.some(i => i.status !== 'STAGED'))
        throw new ConflictException('Some students remain unprocessed');
      const source = await tx.academicSession.findFirst({ where: { schoolId, id: batch.sourceSessionId } });
      const target = await tx.academicSession.findFirst({ where: { schoolId, id: batch.targetSessionId } });
      if (source?.status !== 'CLOSING' || target?.status !== 'DRAFT')
        throw new ConflictException('Year state changed during promotion');
      const oldIds = items.map(i => i.sourceEnrollmentId);
      const sourceCount = await tx.studentEnrollment.count({
        where: { schoolId, id: { in: oldIds }, academicSessionId: source.id, status: 'ACTIVE' },
      });
      if (sourceCount !== items.length) throw new ConflictException('Source enrollment modified during close');
      const passOutIds = items.filter(i => i.decision === 'PASS_OUT' || i.decision === 'LEAVE').map(i => i.studentId);
      const stagedIds = items.map(i => i.stagedEnrollmentId).filter((v): v is string => Boolean(v));
      if (stagedIds.length !== items.length - passOutIds.length) throw new ConflictException('Missing staged enrollment');

      // Single atomic visibility switch: regular queries see either old ACTIVE or new ACTIVE.
      const dayBefore = new Date(target.startDate.getTime() - 86400000);
      await tx.studentEnrollment.updateMany({
        where: { schoolId, id: { in: oldIds }, status: 'ACTIVE' },
        data: { status: 'ENDED', endedAt: new Date(), validUntil: dayBefore, endedReason: 'YEAR_TRANSITION' },
      });
      if (stagedIds.length) await tx.studentEnrollment.updateMany({
        where: { schoolId, id: { in: stagedIds }, status: 'STAGED' }, data: { status: 'ACTIVE' },
      });
      if (passOutIds.length) {
        await tx.student.updateMany({ where: { schoolId, id: { in: passOutIds } },
          data: { status: 'INACTIVE', transportRequired: false, transportSetupState: 'NOT_REQUIRED' } });
        await tx.transportAssignment.updateMany({
          where: { schoolId, studentId: { in: passOutIds }, status: 'ACTIVE' },
          data: { status: 'ENDED', endedAt: new Date(), serviceEndDate: dayBefore, endedReason: 'YEAR_TRANSITION' },
        });
      }
      await tx.academicSession.update({ where: { id: source.id },
        data: { status: 'CLOSED', closedAt: new Date(), version: { increment: 1 } } });
      await tx.academicSession.update({ where: { id: target.id },
        data: { status: 'ACTIVE', activatedAt: new Date(), version: { increment: 1 } } });
      await tx.yearTransition.update({ where: { id: batchId },
        data: { status: 'COMPLETED', completedAt: new Date(), version: { increment: 1 } } });
      await this.audit.append({ requestId: actor.requestId, schoolId, actorType: actor.userType,
        actorId: actor.userId, eventType: 'YEAR_TRANSITION_COMPLETED', targetType: 'YEAR_TRANSITION',
        targetId: batchId, metadata: { studentCount: items.length, passOutCount: passOutIds.length } }, tx);
      return { completed: true, alreadyCompleted: false, promoted: stagedIds.length, left: passOutIds.length };
    }, { maxWait: 15000, timeout: 60000 });
  }
}
