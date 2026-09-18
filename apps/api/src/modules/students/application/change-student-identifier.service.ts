import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { StudentIdentifierAllocator } from '../domain/student-identifier-allocator';
import type { SessionActor, ChangeStudentIdentifierInput } from '@custom-school/contracts';

@Injectable()
export class ChangeStudentIdentifierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly allocator: StudentIdentifierAllocator
  ) {}

  async changeIdentifier(actor: SessionActor, studentId: string, input: ChangeStudentIdentifierInput) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const cleanNewCode = input.newStudentCode.trim().toUpperCase();
    const normalizedNewCode = this.allocator.normalizeCode(cleanNewCode);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId }
      });

      if (!student) {
        throw new NotFoundException('Student not found in this school');
      }

      if (student.version !== input.version) {
        throw new ConflictException({
          code: 'ERR_STUDENT_VERSION_CONFLICT',
          message: 'Student record has been updated by another transaction. Please refresh and retry.',
          currentVersion: student.version
        });
      }

      if (student.normalizedCode === normalizedNewCode) {
        throw new ConflictException('New student code cannot be identical to the current code');
      }

      const duplicate = await tx.student.findUnique({
        where: {
          schoolId_normalizedCode: { schoolId, normalizedCode: normalizedNewCode }
        }
      });

      if (duplicate) {
        throw new ConflictException(`Student code ${cleanNewCode} is already assigned to another student in this school`);
      }

      const oldCode = student.studentCode;

      await tx.studentIdentifierHistory.create({
        data: {
          schoolId,
          studentId,
          oldCode,
          newCode: cleanNewCode,
          changedBy: actor.userId,
          reason: input.reason.trim()
        }
      });

      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          studentCode: cleanNewCode,
          normalizedCode: normalizedNewCode,
          version: student.version + 1
        }
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'STUDENT_IDENTIFIER_CHANGED',
          targetType: 'STUDENT',
          targetId: studentId,
          metadata: {
            oldCode,
            newCode: cleanNewCode,
            reason: input.reason.trim(),
            newVersion: updated.version
          }
        },
        tx
      );

      return {
        id: studentId,
        studentCode: updated.studentCode,
        version: updated.version,
        oldCode,
        changedAt: new Date().toISOString()
      };
    });
  }
}
