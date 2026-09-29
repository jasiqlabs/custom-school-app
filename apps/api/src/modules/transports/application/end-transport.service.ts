import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { AssignmentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { SessionActor, EndStudentTransportInput } from '@custom-school/contracts';

@Injectable()
export class EndTransportService {
  constructor(private readonly prisma: PrismaService) {}

  async endAssignment(actor: SessionActor, assignmentId: string, input: EndStudentTransportInput) {
    const schoolId = actor.schoolId!;

    return this.prisma.$transaction(async tx => {
      // 1. Lock existing assignment row
      const existingRows = await tx.$queryRaw<any[]>`
        SELECT id, student_id, transport_id, stoppage_id, status
        FROM transport_assignments
        WHERE school_id = ${schoolId} AND id = ${assignmentId}::uuid
        FOR UPDATE
      `;

      if (!existingRows || existingRows.length === 0) {
        throw new NotFoundException('Assignment not found');
      }

      const existing = existingRows[0];
      if (existing.status !== AssignmentStatus.ACTIVE) {
        throw new ConflictException('This transport assignment is already ended.');
      }

      const studentId = existing.student_id;

      // 2. Student advisory lock
      const lockKey = `transport:student:${schoolId}:${studentId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 3. Mark assignment ENDED
      const now = new Date();
      const updated = await tx.transportAssignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.ENDED,
          endedAt: now,
          endedReason: input.reason || 'ENDED',
          updatedAt: now,
          version: { increment: 1 },
        },
        include: {
          transport: true,
          stoppage: true,
        },
      });

      // 4. Reconcile student transport setup state
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId },
        select: { id: true, transportRequired: true },
      });

      if (student) {
        if (input.setStudentPreferenceNo) {
          await tx.student.update({
            where: { id: studentId },
            data: {
              transportRequired: false,
              transportSetupState: 'NOT_REQUIRED',
              updatedAt: now,
            },
          });
        } else if (student.transportRequired) {
          await tx.student.update({
            where: { id: studentId },
            data: {
              transportSetupState: 'SETUP_PENDING',
              updatedAt: now,
            },
          });
        }
      }

      return updated;
    });
  }
}
