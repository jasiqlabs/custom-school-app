import { Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { AssignmentStatus, TransportStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { SessionActor, ReassignStudentTransportInput } from '@custom-school/contracts';

@Injectable()
export class ReassignTransportService {
  constructor(private readonly prisma: PrismaService) {}

  async reassignStudent(actor: SessionActor, assignmentId: string, input: ReassignStudentTransportInput) {
    const schoolId = actor.schoolId!;
    const userId = actor.userId;

    if (input.serviceStartDate && input.serviceEndDate) {
      if (input.serviceEndDate < input.serviceStartDate) {
        throw new UnprocessableEntityException('Service end date cannot precede start date');
      }
    }

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
        throw new ConflictException('This transport assignment is already ended and cannot be reassigned.');
      }

      const studentId = existing.student_id;

      // 2. Student advisory lock
      const lockKey = `transport:student:${schoolId}:${studentId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 3. Verify student is ACTIVE
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId },
        select: { id: true, fullName: true, status: true, transportRequired: true },
      });

      if (!student || student.status !== 'ACTIVE') {
        throw new ConflictException(`Cannot reassign: Student is ${student?.status ?? 'NOT_FOUND'}.`);
      }

      // 4. Lock new target stoppage and its parent transport; verify both are ACTIVE
      const stoppageRows = await tx.$queryRaw<any[]>`
        SELECT 
          s.id AS stoppage_id,
          s.name AS stoppage_name,
          s.status AS stoppage_status,
          s.transport_id,
          t.name AS transport_name,
          t.status AS transport_status
        FROM transport_stoppages s
        JOIN transports t ON t.id = s.transport_id
        WHERE s.school_id = ${schoolId} AND s.id = ${input.newStoppageId}::uuid
        FOR UPDATE OF s, t
      `;

      if (!stoppageRows || stoppageRows.length === 0) {
        throw new NotFoundException('Target stoppage not found');
      }

      const target = stoppageRows[0];
      if (target.stoppage_status !== TransportStatus.ACTIVE) {
        throw new ConflictException(`Cannot reassign: Target stoppage "${target.stoppage_name}" is INACTIVE.`);
      }
      if (target.transport_status !== TransportStatus.ACTIVE) {
        throw new ConflictException(`Cannot reassign: Parent transport "${target.transport_name}" is INACTIVE.`);
      }

      // 5. Mark existing assignment as ENDED with reason REASSIGNED
      const now = new Date();
      await tx.transportAssignment.update({
        where: { id: assignmentId },
        data: {
          status: AssignmentStatus.ENDED,
          endedAt: now,
          endedReason: input.reason || 'REASSIGNED',
          updatedAt: now,
          version: { increment: 1 },
        },
      });

      // 6. Create replacement ACTIVE assignment
      const startDate = input.serviceStartDate ? new Date(input.serviceStartDate) : null;
      const endDate = input.serviceEndDate ? new Date(input.serviceEndDate) : null;

      const replacement = await tx.transportAssignment.create({
        data: {
          schoolId,
          studentId,
          transportId: target.transport_id,
          stoppageId: target.stoppage_id,
          status: AssignmentStatus.ACTIVE,
          serviceStartDate: startDate,
          serviceEndDate: endDate,
          startedAt: now,
          createdBy: userId,
          version: 1,
        },
        include: {
          transport: true,
          stoppage: true,
        },
      });

      return replacement;
    });
  }
}
