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
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId }
      });

      if (!student) {
        throw new NotFoundException('Student not found in this school');
      }

      if (student.status === input.status) {
        // Safe idempotent replay
        return {
          id: student.id,
          status: student.status,
          deactivationReason: student.deactivationReason
        };
      }

      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          status: input.status,
          deactivationReason: input.status === 'INACTIVE' ? input.reason?.trim() || null : null,
          version: student.version + 1
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
