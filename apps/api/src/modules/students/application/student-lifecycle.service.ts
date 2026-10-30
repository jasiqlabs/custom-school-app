import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { lockStudentForFees } from '../../fees/domain/fee-student-lock';
import type { SessionActor } from '@custom-school/contracts';

type ExitInput = { effectiveDate: string; reason: string };
type ReadmitInput = { academicSessionId: string; classId: string; sectionId: string; effectiveDate: string };

function utcBusinessDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Use YYYY-MM-DD date');
  const day = new Date(value + 'T00:00:00.000Z');
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Invalid effective date');
  }
  // A future effective date needs a scheduler; never mutate today's enrollment in advance.
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = (name: string) => parts.find(p => p.type === name)?.value || '';
  const localToday = `${part('year')}-${part('month')}-${part('day')}`;
  if (value > localToday) throw new BadRequestException('Future-dated changes need a scheduled workflow');
  return day;
}

/** Explicit exit/re-admission; old PATCH student status retains its legacy semantics. */
@Injectable()
export class StudentLifecycleService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async exit(actor: SessionActor, studentId: string, input: ExitInput) {
    const schoolId = actor.schoolId;
    if (!schoolId) throw new ConflictException('School context required');
    const date = utcBusinessDate(input.effectiveDate);
    if (input.reason.trim().length < 3) throw new BadRequestException('Exit reason is required');

    return this.prisma.$transaction(async tx => {
      await lockStudentForFees(tx, schoolId, studentId);
      const student = await tx.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) throw new NotFoundException('Student not found');
      const active = await tx.studentEnrollment.findFirst({
        where: { schoolId, studentId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      });
      if (!active) {
        if (student.status === 'INACTIVE') return { studentId, status: 'INACTIVE', alreadyExited: true };
        throw new ConflictException('Student has no active enrollment to exit');
      }
      const since = active.validFrom || active.startedAt;
      if (date < new Date(since.toISOString().slice(0, 10))) {
        throw new ConflictException('Exit cannot predate current enrollment');
      }
      await tx.studentEnrollment.update({
        where: { id: active.id }, data: {
          status: 'ENDED', endedAt: new Date(), validUntil: date,
          endedReason: input.reason.trim(),
        },
      });
      // Same Postgres transaction: no partially-ended student/transport records.
      // Historical transport rows are retained; finance balances are never deleted.
      await tx.transportAssignment.updateMany({
        where: { schoolId, studentId, status: 'ACTIVE' },
        data: { status: 'ENDED', serviceEndDate: date, endedAt: new Date(), endedReason: 'STUDENT_EXIT' },
      });
      await tx.student.update({
        where: { id: studentId },
        data: { status: 'INACTIVE', deactivationReason: input.reason.trim(),
          transportRequired: false, transportSetupState: 'NOT_REQUIRED',
          version: { increment: 1 } },
      });
      await this.audit.append({
        requestId: actor.requestId, schoolId, actorType: actor.userType, actorId: actor.userId,
        eventType: 'STUDENT_EXIT', targetType: 'STUDENT', targetId: studentId,
        metadata: { effectiveDate: input.effectiveDate, enrollmentId: active.id, reason: input.reason.trim() },
      }, tx);
      return { studentId, status: 'INACTIVE', effectiveDate: input.effectiveDate, alreadyExited: false };
    });
  }

  async readmit(actor: SessionActor, studentId: string, input: ReadmitInput) {
    const schoolId = actor.schoolId;
    if (!schoolId) throw new ConflictException('School context required');
    const date = utcBusinessDate(input.effectiveDate);
    return this.prisma.$transaction(async tx => {
      await lockStudentForFees(tx, schoolId, studentId);
      const student = await tx.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) throw new NotFoundException('Student not found');
      const active = await tx.studentEnrollment.findFirst({ where: { schoolId, studentId, status: 'ACTIVE' } });
      if (active && student.status === 'INACTIVE') {
        // Repair a legacy status-only deactivation: it left a stale ACTIVE segment.
        // Preserve the old dated segment; do not duplicate the person's identity.
        const previousStart = active.validFrom || active.startedAt;
        if (date <= previousStart) throw new ConflictException('Re-admission must follow the previous enrollment start');
        await tx.studentEnrollment.update({ where: { id: active.id },
          data: { status: 'ENDED', validUntil: new Date(date.getTime()-86400000),
            endedAt: new Date(), endedReason: 'READMISSION_AFTER_LEGACY_INACTIVE' },
        });
      } else if (active || student.status === 'ACTIVE') {
        if (active && active.academicSessionId === input.academicSessionId &&
          active.classId === input.classId && active.sectionId === input.sectionId &&
          active.validFrom?.toISOString().slice(0, 10) === input.effectiveDate) {
          return { studentId, enrollmentId: active.id, status: 'ACTIVE', alreadyReadmitted: true };
        }
        throw new ConflictException('Student is already active; use Change Class/Section instead');
      }
      const [session, clazz, section] = await Promise.all([
        tx.academicSession.findFirst({ where: { schoolId, id: input.academicSessionId, status: 'ACTIVE' } }),
        tx.class.findFirst({ where: { schoolId, id: input.classId, status: 'ACTIVE' } }),
        tx.section.findFirst({ where: { schoolId, id: input.sectionId, classId: input.classId, status: 'ACTIVE' } }),
      ]);
      if (!session || !clazz || !section) throw new NotFoundException('Active academic session/class/section not found');
      if (date < session.startDate || date > session.endDate) {
        throw new BadRequestException('Re-admission date must fall inside the active session');
      }
      const enrollment = await tx.studentEnrollment.create({
        data: { schoolId, studentId, academicSessionId: session.id,
          classId: clazz.id, sectionId: section.id,
          classNameSnapshot: clazz.name, sectionNameSnapshot: section.name,
          status: 'ACTIVE', validFrom: date, enrollmentVersion: 1 },
      });
      await tx.student.update({
        where: { id: studentId },
        data: { status: 'ACTIVE', deactivationReason: null, version: { increment: 1 },
          transportRequired: false, transportSetupState: 'NOT_REQUIRED' },
      });
      await this.audit.append({
        requestId: actor.requestId, schoolId, actorType: actor.userType, actorId: actor.userId,
        eventType: 'STUDENT_READMISSION', targetType: 'STUDENT', targetId: studentId,
        metadata: { effectiveDate: input.effectiveDate, enrollmentId: enrollment.id,
          academicSessionId: session.id, classId: clazz.id, sectionId: section.id },
      }, tx);
      return { studentId, enrollmentId: enrollment.id, status: 'ACTIVE', alreadyReadmitted: false };
    });
  }
}
