import { lockStudentForFees } from '../../fees/domain/fee-student-lock';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import type { SessionActor, ChangeStudentStatusInput } from '@custom-school/contracts';

@Injectable()
export class ChangeStudentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async changeStatus(actor: SessionActor, studentId: string, input: ChangeStudentStatusInput) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    if (input.status === 'INACTIVE' && (!input.reason || input.reason.trim().length === 0)) {
      throw new BadRequestException('Deactivation reason is mandatory when inactivating a student');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await lockStudentForFees(tx, schoolId, studentId);
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId }
      });

      if (!student) {
        throw new NotFoundException('Student not found in this school');
      }

      if (await tx.academicSession.findFirst({ where: { schoolId, status: 'CLOSING' }, select: { id: true } })) {
        throw new ConflictException('Year-end transition is in progress. Finish or recover the transition before editing students.');
      }

      if (student.status === input.status) {
        // Safe idempotent replay
        return {
          id: student.id,
          status: student.status,
          deactivationReason: student.deactivationReason
        };
      }

      if (input.status === 'ACTIVE') {
        const enrollment = await tx.studentEnrollment.findFirst({
          where: { schoolId, studentId, status: 'ACTIVE' },
          include: { academicSession: true },
        });
        // Reopening an expired/ended enrollment by flipping a status would erase history.
        if (!enrollment || (enrollment.academicSession && enrollment.academicSession.status !== 'ACTIVE')) {
          throw new ConflictException('Use Re-admit to Active Year to restore student enrollment');
        }
      } else {
        const localDay = new Intl.DateTimeFormat('en-US',{
          timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date());
        const get = (name: string) => localDay.find(p => p.type === name)?.value || '';
        const today = new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00.000Z`);
        await tx.studentEnrollment.updateMany({
          where: { schoolId, studentId, status: 'ACTIVE' },
          data: { status: 'ENDED', validUntil: today, endedAt: new Date(),
            endedReason: input.reason?.trim() || 'STUDENT_DEACTIVATED' },
        });
        await tx.transportAssignment.updateMany({
          where: { schoolId, studentId, status: 'ACTIVE' },
          data: { status: 'ENDED', serviceEndDate: today, endedAt: new Date(),
            endedReason: 'STUDENT_DEACTIVATED' },
        });
      }

      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: input.status,
          deactivationReason: input.status === 'INACTIVE' ? input.reason?.trim() || null : null,
          version: student.version + 1,
          ...(input.status === 'INACTIVE' ? {
            transportRequired: false, transportSetupState: 'NOT_REQUIRED' as const,
          } : {})
        }
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'STUDENT_STATUS_CHANGED',
          targetType: 'STUDENT',
          targetId: studentId,
          metadata: {
            oldStatus: student.status,
            newStatus: input.status,
            reason: input.reason?.trim() || null
          }
        },
        tx
      );

      return {
        id: updated.id,
        status: updated.status,
        deactivationReason: updated.deactivationReason,
        version: updated.version
      };
    });
  }
}
