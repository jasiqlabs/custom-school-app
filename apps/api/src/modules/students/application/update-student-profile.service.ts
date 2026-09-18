import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { StudentDomainValidator } from '../domain/student.validator';
import type { SessionActor, UpdateStudentProfileInput } from '@custom-school/contracts';

@Injectable()
export class UpdateStudentProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly validator: StudentDomainValidator
  ) {}

  async update(actor: SessionActor, studentId: string, input: UpdateStudentProfileInput) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.student.findFirst({
        where: { id: studentId, schoolId },
        include: {
          enrollments: { where: { status: 'ACTIVE' }, take: 1 }
        }
      });

      if (!existing) {
        throw new NotFoundException('Student not found in this school');
      }

      if (existing.version !== input.version) {
        throw new ConflictException({
          code: 'ERR_STUDENT_VERSION_CONFLICT',
          message: 'Student profile has been modified concurrently. Please refresh the page and try again.',
          currentVersion: existing.version
        });
      }

      const updateData: any = {
        version: existing.version + 1
      };

      if (input.fullName !== undefined) {
        updateData.fullName = input.fullName.trim();
        updateData.normalizedName = input.fullName.trim().toLowerCase();
      }
      if (input.fatherName !== undefined) updateData.fatherName = input.fatherName.trim();
      if (input.motherName !== undefined) updateData.motherName = input.motherName.trim();
      if (input.familyCode !== undefined) updateData.familyCode = input.familyCode?.trim() || null;
      if (input.tallyLedgerName !== undefined) updateData.tallyLedgerName = input.tallyLedgerName?.trim() || null;
      if (input.dob !== undefined) updateData.dob = this.validator.validateDob(input.dob);
      if (input.gender !== undefined) updateData.gender = input.gender;
      if (input.address !== undefined) updateData.address = input.address.trim();
      if (input.phone !== undefined) updateData.phone = input.phone.trim();
      if (input.email !== undefined) updateData.email = input.email?.trim().toLowerCase() || null;
      if (input.emergencyContact !== undefined) updateData.emergencyContact = input.emergencyContact.trim();
      if (input.emergencyRelation !== undefined) updateData.emergencyRelation = input.emergencyRelation.trim();
      if (input.penNumber !== undefined) updateData.penNumber = input.penNumber?.trim() || null;
      if (input.udiseCode !== undefined) updateData.udiseCode = input.udiseCode?.trim() || null;
      if (input.previousSchool !== undefined) updateData.previousSchool = input.previousSchool?.trim() || null;
      if (input.previousTcNumber !== undefined) updateData.previousTcNumber = input.previousTcNumber?.trim() || null;
      if (input.bloodGroup !== undefined) updateData.bloodGroup = input.bloodGroup?.trim() || null;
      if (input.nationality !== undefined) updateData.nationality = input.nationality?.trim() || 'Indian';
      if (input.hobbies !== undefined) updateData.hobbies = input.hobbies?.trim() || null;
      if (input.achievements !== undefined) updateData.achievements = input.achievements?.trim() || null;

      if (input.concession !== undefined) {
        this.validator.validateConcession(input.concession.type, input.concession.value);
        updateData.concessionType = input.concession.type;
        updateData.concessionValue = input.concession.value;
      }

      if (input.photoFileId !== undefined) {
        await this.validator.validatePhotoFile(tx, schoolId, input.photoFileId);
        updateData.photoFileId = input.photoFileId || null;
      }

      if (input.transportRequired !== undefined) {
        updateData.transportRequired = input.transportRequired;
        if (input.transportRequired && existing.transportSetupState === 'NOT_REQUIRED') {
          updateData.transportSetupState = 'SETUP_PENDING';
        } else if (!input.transportRequired && existing.transportSetupState !== 'ACTIVE') {
          updateData.transportSetupState = 'NOT_REQUIRED';
        }
      }

      // Handle class/section re-enrollment if changed
      const currentEnrollment = existing.enrollments[0];
      const targetClassId = input.classId ?? currentEnrollment?.classId;
      const targetSectionId = input.sectionId ?? currentEnrollment?.sectionId;

      if (
        (input.classId && input.classId !== currentEnrollment?.classId) ||
        (input.sectionId && input.sectionId !== currentEnrollment?.sectionId)
      ) {
        if (!targetClassId || !targetSectionId) {
          throw new ConflictException('Both class and section must be specified for enrollment change');
        }
        await this.validator.validateAcademics(tx, schoolId, targetClassId, targetSectionId);

        if (currentEnrollment) {
          await tx.studentEnrollment.update({
            where: { id: currentEnrollment.id },
            data: { status: 'ENDED', endedAt: new Date() }
          });
        }

        await tx.studentEnrollment.create({
          data: {
            schoolId,
            studentId,
            classId: targetClassId,
            sectionId: targetSectionId,
            status: 'ACTIVE',
            startedAt: new Date()
          }
        });
      }

      const updated = await tx.student.update({
        where: { id: studentId },
        data: updateData
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'STUDENT_PROFILE_UPDATED',
          targetType: 'STUDENT',
          targetId: studentId,
          metadata: {
            previousVersion: existing.version,
            newVersion: updated.version,
            classId: targetClassId,
            sectionId: targetSectionId
          }
        },
        tx
      );

      return {
        id: updated.id,
        version: updated.version,
        updatedAt: updated.updatedAt.toISOString()
      };
    });
  }
}
