import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { FEES_PUBLIC_FACADE, FeesPublicFacade } from '../ports/fees.port';
import type { ChangeStudentEnrollmentInput, SessionActor, StudentEnrollmentDto } from '@custom-school/contracts';

@Injectable()
export class ChangeStudentEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() @Inject(FEES_PUBLIC_FACADE) private readonly feesFacade?: FeesPublicFacade
  ) {}

  async changeEnrollment(
    actor: SessionActor,
    studentId: string,
    input: ChangeStudentEnrollmentInput
  ): Promise<StudentEnrollmentDto & { studentVersion: number }> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId }
      });
      if (!student) {
        throw new NotFoundException('Student not found in this school');
      }

      if (input.expectedVersion !== undefined && student.version !== input.expectedVersion) {
        throw new ConflictException({
          code: 'ERR_STUDENT_VERSION_CONFLICT',
          message: 'Student profile has been modified concurrently. Please refresh the page and try again.',
          currentVersion: student.version
        });
      }

      // Verify class belongs to school and is active
      const targetClass = await tx.class.findFirst({
        where: { id: input.classId, schoolId, status: 'ACTIVE' }
      });
      if (!targetClass) {
        throw new NotFoundException('Selected class was not found in this school');
      }

      // Verify section belongs to class and school and is active
      const targetSection = await tx.section.findFirst({
        where: { id: input.sectionId, classId: input.classId, schoolId, status: 'ACTIVE' }
      });
      if (!targetSection) {
        throw new NotFoundException('Selected section was not found for this class in this school');
      }

      // Resolve academic session
      let session: any;
      if (input.academicSessionId) {
        session = await tx.academicSession.findFirst({
          where: { id: input.academicSessionId, schoolId }
        });
        if (!session) {
          throw new NotFoundException('Specified academic session not found in this school');
        }
      } else {
        session = await tx.academicSession.findFirst({
          where: { schoolId, status: 'ACTIVE' }
        });
        if (!session) {
          throw new ConflictException('No active academic session found for this school');
        }
      }

      if (session.status === 'CLOSED' || session.status === 'ARCHIVED') {
        throw new ConflictException({
          code: 'ERR_SESSION_CLOSED',
          message: 'Enrollment cannot be modified for a closed or archived academic session'
        });
      }

      // Validate effective date within academic session bounds
      const effectiveDateStr = input.effectiveDate;
      const sessionStartStr = session.startDate instanceof Date
        ? session.startDate.toISOString().slice(0, 10)
        : String(session.startDate).slice(0, 10);
      const sessionEndStr = session.endDate instanceof Date
        ? session.endDate.toISOString().slice(0, 10)
        : String(session.endDate).slice(0, 10);

      if (effectiveDateStr < sessionStartStr || effectiveDateStr > sessionEndStr) {
        throw new BadRequestException(
          `Effective date (${effectiveDateStr}) must fall within the academic session bounds (${sessionStartStr} to ${sessionEndStr})`
        );
      }

      // Check current active enrollment segment
      const currentSegment = await tx.studentEnrollment.findFirst({
        where: { schoolId, studentId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' }
      });

      let nextVersion = 1;
      if (currentSegment) {
        nextVersion = (currentSegment.enrollmentVersion || 1) + 1;
        const currentStartStr = currentSegment.validFrom
          ? (currentSegment.validFrom instanceof Date
              ? currentSegment.validFrom.toISOString().slice(0, 10)
              : String(currentSegment.validFrom).slice(0, 10))
          : currentSegment.startedAt.toISOString().slice(0, 10);

        if (effectiveDateStr <= currentStartStr) {
          throw new ConflictException({
            code: 'ERR_ENROLLMENT_OVERLAP',
            message: `Backdated or overlapping effective date (${effectiveDateStr}) is not permitted. Effective date must be strictly after current segment start date (${currentStartStr}).`
          });
        }

        // Close current segment at day before effectiveDate
        const [y, m, d] = effectiveDateStr.split('-').map(Number);
        const effDate = new Date(Date.UTC(y, m - 1, d));
        const dayBefore = new Date(effDate.getTime() - 24 * 60 * 60 * 1000);

        await tx.studentEnrollment.update({
          where: { id: currentSegment.id },
          data: {
            status: 'ENDED',
            endedAt: new Date(),
            validUntil: dayBefore,
            endedReason: input.reason || 'CLASS_CHANGE'
          }
        });
      }

      // Create new active enrollment segment
      const [y, m, d] = effectiveDateStr.split('-').map(Number);
      const newValidFrom = new Date(Date.UTC(y, m - 1, d));

      const newEnrollment = await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId,
          academicSessionId: session.id,
          classId: input.classId,
          sectionId: input.sectionId,
          classNameSnapshot: targetClass.name,
          sectionNameSnapshot: targetSection.name,
          status: 'ACTIVE',
          startedAt: new Date(),
          validFrom: newValidFrom,
          validUntil: null,
          enrollmentVersion: nextVersion,
          endedReason: null
        }
      });

      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          version: { increment: 1 }
        }
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'STUDENT_ENROLLMENT_CHANGED',
          targetType: 'STUDENT',
          targetId: studentId,
          metadata: {
            previousEnrollmentId: currentSegment?.id || null,
            newEnrollmentId: newEnrollment.id,
            academicSessionId: session.id,
            effectiveDate: effectiveDateStr,
            previousClass: currentSegment?.classNameSnapshot || null,
            previousSection: currentSegment?.sectionNameSnapshot || null,
            newClass: targetClass.name,
            newSection: targetSection.name,
            reason: input.reason || 'CLASS_CHANGE'
          }
        },
        tx
      );

      return {
        id: newEnrollment.id,
        studentId,
        academicSessionId: session.id,
        academicSessionCode: session.code,
        academicSessionLabel: session.label,
        classId: newEnrollment.classId,
        className: targetClass.name,
        sectionId: newEnrollment.sectionId,
        sectionName: targetSection.name,
        status: newEnrollment.status,
        startedAt: newEnrollment.startedAt.toISOString(),
        endedAt: null,
        validFrom: effectiveDateStr,
        validUntil: null,
        endedReason: null,
        enrollmentVersion: newEnrollment.enrollmentVersion,
        studentVersion: updatedStudent.version
      };
    });

    if (this.feesFacade) {
      await this.feesFacade.ensureStudentDues({ schoolId, studentId });
    }

    return result;
  }

  async getEnrollmentAtDate(schoolId: string, studentId: string, date: Date | string) {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const segment = await this.prisma.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentId,
        validFrom: { lte: targetDate },
        OR: [
          { validUntil: null },
          { validUntil: { gte: targetDate } }
        ]
      },
      orderBy: { validFrom: 'desc' },
      include: {
        class: true,
        section: true,
        academicSession: true
      }
    });

    if (!segment) {
      // Fallback to active segment if date before validFrom or unindexed
      return this.prisma.studentEnrollment.findFirst({
        where: { schoolId, studentId, status: 'ACTIVE' },
        include: {
          class: true,
          section: true,
          academicSession: true
        }
      });
    }

    return segment;
  }
}
