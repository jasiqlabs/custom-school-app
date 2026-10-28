import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SensitiveFieldCryptoService, EncryptedEnvelope } from '../../../platform/crypto/sensitive-field-crypto.service';
import { StudentDomainValidator } from '../domain/student.validator';
import { StudentsRepository } from '../repository/students.repository';
import type { SessionActor, StudentProfileDto, AdmissionFormPrintDto, StudentEnrollmentDto } from '@custom-school/contracts';

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
      pageSize?: number;
      academicSessionId?: string;
      classId?: string;
      sectionId?: string;
      gender?: 'BOY' | 'GIRL';
      status?: 'ACTIVE' | 'INACTIVE';
      search?: string;
      sortBy?: 'recent' | 'name' | 'code';
      sortOrder?: 'asc' | 'desc';
    }
  ) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    if (filters.academicSessionId) {
      const session = await this.prisma.academicSession.findFirst({
        where: { id: filters.academicSessionId, schoolId }
      });
      if (!session) {
        throw new NotFoundException('Academic session not found in this school');
      }
    }

    return this.repo.findDirectory(schoolId, filters);
  }

  async getProfile(actor: SessionActor, studentId: string, academicSessionId?: string): Promise<StudentProfileDto> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    let session: any = null;
    if (academicSessionId) {
      session = await this.prisma.academicSession.findFirst({
        where: { id: academicSessionId, schoolId }
      });
      if (!session) {
        throw new NotFoundException('Academic session not found in this school');
      }
    } else {
      session = await this.prisma.academicSession.findFirst({
        where: { schoolId, status: 'ACTIVE' }
      });
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
          aadhaarMasked: decrypted.aadhaarNumber ? this.validator.maskAadhaar(student.privateProfile.aadhaarLast4) : null,
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
          aadhaarMasked: student.privateProfile.aadhaarLast4 && student.privateProfile.aadhaarLast4 !== '0000' ? this.validator.maskAadhaar(student.privateProfile.aadhaarLast4) : null
        };
      }
    }

    let targetEnrollment: any = null;
    if (session) {
      targetEnrollment = await this.prisma.studentEnrollment.findFirst({
        where: { schoolId, studentId, academicSessionId: session.id },
        include: { class: true, section: true, academicSession: true },
        orderBy: [{ status: 'asc' }, { startedAt: 'desc' }]
      });
    }
    if (!targetEnrollment) {
      targetEnrollment = student.enrollments[0];
    }

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
      booksRequired: student.booksRequired,
      uniformRequired: student.uniformRequired,
      photoFileId: student.photoFileId,
      status: student.status as 'ACTIVE' | 'INACTIVE',
      deactivationReason: student.deactivationReason,
      version: student.version,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
      sessionStatus: session?.status || null,
      enrollment: targetEnrollment
        ? {
            id: targetEnrollment.id,
            classId: targetEnrollment.classId,
            className: targetEnrollment.classNameSnapshot || targetEnrollment.class?.name || 'Unassigned',
            sectionId: targetEnrollment.sectionId,
            sectionName: targetEnrollment.sectionNameSnapshot || targetEnrollment.section?.name || 'Unassigned',
            academicSessionId: targetEnrollment.academicSessionId || null,
            academicSessionCode: targetEnrollment.academicSession?.code || session?.code || null,
            academicSessionLabel: targetEnrollment.academicSession?.label || session?.label || null,
            enrollmentVersion: targetEnrollment.enrollmentVersion || 1,
          }
        : null,
      privateProfile: maskedPrivate
    };
  }

  async listEnrollments(actor: SessionActor, studentId: string): Promise<StudentEnrollmentDto[]> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    const student = await this.repo.findById(schoolId, studentId);
    if (!student) {
      throw new NotFoundException('Student not found in this school');
    }

    const list = await this.repo.listEnrollments(schoolId, studentId);
    return list.map((e: any) => ({
      id: e.id,
      studentId: e.studentId,
      academicSessionId: e.academicSessionId || null,
      academicSessionCode: e.academicSession?.code || null,
      academicSessionLabel: e.academicSession?.label || null,
      classId: e.classId,
      className: e.classNameSnapshot || e.class?.name || 'Unassigned',
      sectionId: e.sectionId,
      sectionName: e.sectionNameSnapshot || e.section?.name || 'Unassigned',
      status: e.status,
      startedAt: e.startedAt.toISOString(),
      endedAt: e.endedAt ? e.endedAt.toISOString() : null,
      validFrom: e.validFrom ? (e.validFrom instanceof Date ? e.validFrom.toISOString().slice(0, 10) : String(e.validFrom).slice(0, 10)) : (e.startedAt ? e.startedAt.toISOString().slice(0, 10) : null),
      validUntil: e.validUntil ? (e.validUntil instanceof Date ? e.validUntil.toISOString().slice(0, 10) : String(e.validUntil).slice(0, 10)) : (e.endedAt ? e.endedAt.toISOString().slice(0, 10) : null),
      endedReason: e.endedReason || null,
      enrollmentVersion: e.enrollmentVersion || 1,
    }));
  }

  async getAdmissionFormPrint(actor: SessionActor, studentId: string): Promise<AdmissionFormPrintDto> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const [school, profile] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, address: true, phone: true, email: true, logoFileId: true, udiseNumber: true, schoolCode: true, affiliationNumber: true }
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
