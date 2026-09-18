import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SensitiveFieldCryptoService } from '../../../platform/crypto/sensitive-field-crypto.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { StudentIdentifierAllocator } from '../domain/student-identifier-allocator';
import { StudentDomainValidator } from '../domain/student.validator';
import type { SessionActor, StudentAdmissionInput, StudentAdmissionResult } from '@custom-school/contracts';

@Injectable()
export class AdmitStudentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: SensitiveFieldCryptoService,
    private readonly audit: AuditService,
    private readonly allocator: StudentIdentifierAllocator,
    private readonly validator: StudentDomainValidator
  ) {}

  async admit(actor: SessionActor, input: StudentAdmissionInput): Promise<StudentAdmissionResult> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const dob = this.validator.validateDob(input.dateOfBirth);
    this.validator.validateConcession(input.concession.type, input.concession.value);
    const { clean: cleanAadhaar, last4: aadhaarLast4 } = this.validator.validateAadhaar(input.aadhaarNumber);

    const admissionDate = input.admissionDate ? new Date(input.admissionDate) : new Date();

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<StudentAdmissionResult> => {
      await this.validator.validateAcademics(tx, schoolId, input.classId, input.sectionId);
      await this.validator.validatePhotoFile(tx, schoolId, input.photoFileId);

      let finalCode: string;
      if (input.studentCodeMode === 'AUTO') {
        finalCode = await this.allocator.allocateAutoCode(tx, schoolId);
      } else {
        if (!input.studentCode || input.studentCode.trim().length === 0) {
          throw new ConflictException('Student code is required in MANUAL mode');
        }
        finalCode = input.studentCode.trim().toUpperCase();
        const normalized = this.allocator.normalizeCode(finalCode);

        const existing = await tx.student.findUnique({
          where: { schoolId_normalizedCode: { schoolId, normalizedCode: normalized } }
        });
        if (existing) {
          throw new ConflictException(`Student code ${finalCode} is already assigned in this school`);
        }
      }

      const normalizedCode = this.allocator.normalizeCode(finalCode);
      const normalizedName = input.fullName.trim().toLowerCase();

      const transportSetupState = input.transportRequired ? 'SETUP_PENDING' : 'NOT_REQUIRED';

      const student = await tx.student.create({
        data: {
          schoolId,
          studentCode: finalCode,
          normalizedCode,
          fullName: input.fullName.trim(),
          normalizedName,
          fatherName: input.fatherName.trim(),
          motherName: input.motherName.trim(),
          familyCode: input.familyCode?.trim() || null,
          tallyLedgerName: input.tallyLedgerName?.trim() || null,
          dob,
          gender: input.gender,
          admissionDate,
          address: input.address.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim().toLowerCase() || null,
          emergencyContact: input.emergencyContact.trim(),
          emergencyRelation: input.emergencyContactRelation.trim(),
          penNumber: input.penNumber?.trim() || null,
          udiseCode: input.udiseCode?.trim() || null,
          previousSchool: input.previousSchool?.trim() || null,
          previousTcNumber: input.previousTcNumber?.trim() || null,
          bloodGroup: input.bloodGroup?.trim() || null,
          nationality: input.nationality?.trim() || 'Indian',
          hobbies: input.hobbiesInterests?.trim() || null,
          achievements: input.previousAchievements?.trim() || null,
          concessionType: input.concession.type,
          concessionValue: input.concession.value,
          transportRequired: input.transportRequired,
          transportSetupState,
          photoFileId: input.photoFileId || null,
          status: 'ACTIVE'
        }
      });

      const privateData = {
        aadhaarNumber: cleanAadhaar,
        panNumber: input.panNumber?.trim() || null,
        bank: input.bank || null,
        religion: input.religion?.trim() || null,
        caste: input.caste?.trim() || null,
        disability: input.disability || null,
        medicalConditions: input.medicalConditions?.trim() || null,
        allergies: input.allergies?.trim() || null
      };

      const encrypted = this.crypto.encryptJson(privateData, {
        schoolId,
        studentId: student.id
      });

      await tx.studentPrivateProfile.create({
        data: {
          schoolId,
          studentId: student.id,
          encryptedPayload: JSON.stringify(encrypted),
          keyVersion: encrypted.keyVersion,
          aadhaarLast4
        }
      });

      await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId: student.id,
          classId: input.classId,
          sectionId: input.sectionId,
          status: 'ACTIVE',
          startedAt: admissionDate
        }
      });

      await this.audit.append(
        {
          requestId: actor.requestId,
          schoolId,
          actorType: actor.userType,
          actorId: actor.userId,
          eventType: 'STUDENT_ADMISSION',
          targetType: 'STUDENT',
          targetId: student.id,
          metadata: {
            studentCode: finalCode,
            classId: input.classId,
            sectionId: input.sectionId,
            transportRequired: input.transportRequired
          }
        },
        tx
      );

      return {
        id: student.id,
        studentCode: finalCode,
        fullName: student.fullName,
        transportSetupState
      };
    });
  }
}
