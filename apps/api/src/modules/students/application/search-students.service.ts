import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SensitiveFieldCryptoService, EncryptedEnvelope } from '../../../platform/crypto/sensitive-field-crypto.service';
import { StudentDomainValidator } from '../domain/student.validator';
import { StudentsRepository } from '../repository/students.repository';
import type { SessionActor, StudentProfileDto, AdmissionFormPrintDto } from '@custom-school/contracts';

@Injectable()
export class SearchStudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: StudentsRepository,
    private readonly crypto: SensitiveFieldCryptoService,
    private readonly validator: StudentDomainValidator
  ) {}

  async search(actor: SessionActor, query: string, limit: number = 20) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    return this.repo.search(schoolId, query, limit);
  }

  async getDirectory(
    actor: SessionActor,
    filters: {
      page?: number;
      limit?: number;
      classId?: string;
      sectionId?: string;
      gender?: 'BOY' | 'GIRL';
      status?: 'ACTIVE' | 'INACTIVE';
      search?: string;
    }
  ) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    return this.repo.findDirectory(schoolId, filters);
  }

  async getProfile(actor: SessionActor, studentId: string): Promise<StudentProfileDto> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const student = await this.repo.findById(schoolId, studentId);
    if (!student) {
      throw new NotFoundException('Student not found in this school');
    }

    let maskedPrivate: StudentProfileDto['privateProfile'] = null;

    if (student.privateProfile) {
      try {
        const envelope: EncryptedEnvelope = JSON.parse(student.privateProfile.encryptedPayload);
        const decrypted: any = this.crypto.decryptJson(envelope, {
          schoolId,
          studentId: student.id
        });

        maskedPrivate = {
          aadhaarMasked: this.validator.maskAadhaar(student.privateProfile.aadhaarLast4),
          panMasked: this.validator.maskPan(decrypted.panNumber),
          bankMasked: decrypted.bank
            ? {
                bankName: decrypted.bank.bankName || undefined,
                accountHolderName: decrypted.bank.accountHolderName || undefined,
                accountNumberMasked: this.validator.maskAccountNumber(decrypted.bank.accountNumber) || undefined,
                ifsc: decrypted.bank.ifsc || undefined,
                branch: decrypted.bank.branch || undefined
              }
            : null,
          religion: decrypted.religion || null,
          caste: decrypted.caste || null,
          disability: decrypted.disability || null,
          medicalConditions: decrypted.medicalConditions || null,
          allergies: decrypted.allergies || null
        };
      } catch {
        maskedPrivate = {
          aadhaarMasked: this.validator.maskAadhaar(student.privateProfile.aadhaarLast4)
        };
      }
    }

    const activeEnrollment = student.enrollments[0];

    return {
      id: student.id,
      schoolId: student.schoolId,
      studentCode: student.studentCode,
      fullName: student.fullName,
      fatherName: student.fatherName,
      motherName: student.motherName,
      familyCode: student.familyCode,
      tallyLedgerName: student.tallyLedgerName,
      dob: student.dob.toISOString().split('T')[0],
      gender: student.gender,
      admissionDate: student.admissionDate.toISOString().split('T')[0],
      address: student.address,
      phone: student.phone,
      email: student.email,
      emergencyContact: student.emergencyContact,
      emergencyRelation: student.emergencyRelation,
      penNumber: student.penNumber,
      udiseCode: student.udiseCode,
      previousSchool: student.previousSchool,
      previousTcNumber: student.previousTcNumber,
      bloodGroup: student.bloodGroup,
      nationality: student.nationality,
      hobbies: student.hobbies,
      achievements: student.achievements,
      concessionType: student.concessionType,
      concessionValue: Number(student.concessionValue),
      transportRequired: student.transportRequired,
      transportSetupState: student.transportSetupState,
      photoFileId: student.photoFileId,
      status: student.status as 'ACTIVE' | 'INACTIVE',
      deactivationReason: student.deactivationReason,
      version: student.version,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      enrollment: activeEnrollment
        ? {
            classId: activeEnrollment.classId,
            className: activeEnrollment.class.name,
            sectionId: activeEnrollment.sectionId,
            sectionName: activeEnrollment.section.name
          }
        : null,
      privateProfile: maskedPrivate
    };
  }

  async getAdmissionFormPrint(actor: SessionActor, studentId: string): Promise<AdmissionFormPrintDto> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const [school, profile] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, address: true, phone: true, email: true, logoFileId: true }
      }),
      this.getProfile(actor, studentId)
    ]);

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return {
      school,
      student: profile,
      printedAt: new Date().toISOString()
    };
  }
}
