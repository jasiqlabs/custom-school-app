import { Injectable, NotFoundException, ConflictException, UnprocessableEntityException, Logger } from '@nestjs/common';
import { AssignmentStatus, TransportStatus } from '@prisma/client';
import { TransportsRepository } from '../repository/transports.repository';
import { PrismaService } from '../../../database/prisma.service';
import type { SessionActor, AssignStudentTransportInput } from '@custom-school/contracts';

@Injectable()
export class AssignTransportService {
  private readonly logger = new Logger(AssignTransportService.name);

  constructor(
    private readonly repository: TransportsRepository,
    private readonly prisma: PrismaService
  ) {}

  async assignStudent(actor: SessionActor, input: AssignStudentTransportInput) {
    const schoolId = actor.schoolId!;
    const userId = actor.userId;

    if (input.serviceStartDate && input.serviceEndDate) {
      if (input.serviceEndDate < input.serviceStartDate) {
        throw new UnprocessableEntityException('Service end date cannot precede start date');
      }
    }

    return this.prisma.$transaction(async tx => {
      // 1. Per-student advisory lock to serialize concurrent assignment attempts
      const lockKey = `transport:student:${schoolId}:${input.studentId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 2. Validate Student status and transportRequired preference
      const student = await tx.student.findFirst({
        where: { id: input.studentId, schoolId },
        select: { id: true, fullName: true, studentCode: true, status: true, transportRequired: true },
      });

      if (!student) {
        throw new NotFoundException('Student not found in this school');
      }

      if (student.status !== 'ACTIVE') {
        throw new ConflictException(`Cannot assign transport: Student "${student.fullName}" (${student.studentCode}) is ${student.status}.`);
      }

      if (!student.transportRequired) {
        throw new ConflictException({
          message: `Cannot assign transport: Student "${student.fullName}" does not have Transport Required set to YES. Please update transport preference in Student Profile first.`,
          code: 'TRANSPORT_PREFERENCE_REQUIRED',
        });
      }

      // 3. Lock stoppage and parent transport; verify both are ACTIVE
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
        WHERE s.school_id = ${schoolId} AND s.id = ${input.stoppageId}::uuid
        FOR UPDATE OF s, t
      `;

      if (!stoppageRows || stoppageRows.length === 0) {
        throw new NotFoundException('Selected stoppage not found in this school');
      }

      const target = stoppageRows[0];
      if (target.stoppage_status !== TransportStatus.ACTIVE) {
        throw new ConflictException(`Cannot assign: Stoppage "${target.stoppage_name}" is currently INACTIVE.`);
      }
      if (target.transport_status !== TransportStatus.ACTIVE) {
        throw new ConflictException(`Cannot assign: Parent transport "${target.transport_name}" is currently INACTIVE.`);
      }

      // 4. Check that no ACTIVE assignment currently exists for this student
      const existingActive = await tx.transportAssignment.findFirst({
        where: {
          schoolId,
          studentId: input.studentId,
          status: AssignmentStatus.ACTIVE,
        },
      });

      if (existingActive) {
        throw new ConflictException('Student already has an active transport assignment. Please use Reassign instead.');
      }

      // 5. Create new assignment
      const startDate = input.serviceStartDate ? new Date(input.serviceStartDate) : null;
      const endDate = input.serviceEndDate ? new Date(input.serviceEndDate) : null;

      const assignment = await tx.transportAssignment.create({
        data: {
          schoolId,
          studentId: input.studentId,
          transportId: target.transport_id,
          stoppageId: target.stoppage_id,
          status: AssignmentStatus.ACTIVE,
          serviceStartDate: startDate,
          serviceEndDate: endDate,
          startedAt: new Date(),
          createdBy: userId,
          version: 1,
        },
        include: {
          transport: true,
          stoppage: true,
        },
      });

      // 6. Reconcile student transportSetupState to ACTIVE
      try {
        await tx.student.update({
          where: { id: input.studentId },
          data: {
            transportSetupState: 'ACTIVE',
            updatedAt: new Date(),
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to reconcile student transportSetupState to ACTIVE for student ${input.studentId}: ${err?.message}`);
      }

      return assignment;
    });
  }
}
