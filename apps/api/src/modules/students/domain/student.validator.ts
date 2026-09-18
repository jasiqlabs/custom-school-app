import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validateAadhaar } from '@custom-school/validation';
import type { StudentAdmissionInput, UpdateStudentProfileInput } from '@custom-school/contracts';

@Injectable()
export class StudentDomainValidator {
  validateDob(dobStr: string): Date {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) {
      throw new BadRequestException('Invalid date of birth');
    }
    const now = new Date();
    if (dob > now) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }
    const ageYears = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 2) {
      throw new BadRequestException('Student must be at least 2 years old for admission');
    }
    if (ageYears > 25) {
      throw new BadRequestException('Student age exceeds maximum admission threshold');
    }
    return dob;
  }

  validateConcession(type: string, value: number): void {
    if (value < 0) {
      throw new BadRequestException('Concession value cannot be negative');
    }
    if (type === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException('Concession percentage cannot exceed 100%');
    }
    if (type === 'NONE' && value !== 0) {
      throw new BadRequestException('Concession value must be 0 when type is NONE');
    }
  }

  validateAadhaar(aadhaar: string): { clean: string; last4: string } {
    const clean = aadhaar.replace(/[\s-]/g, '');
    if (!validateAadhaar(clean)) {
      throw new BadRequestException('Invalid Aadhaar number. Must be 12 digits, valid format, and pass Verhoeff checksum');
    }
    return { clean, last4: clean.slice(-4) };
  }

  async validateAcademics(
    tx: Prisma.TransactionClient,
    schoolId: string,
    classId: string,
    sectionId: string
  ): Promise<{ className: string; sectionName: string }> {
    const cls = await tx.class.findFirst({
      where: { id: classId, schoolId }
    });
    if (!cls) {
      throw new NotFoundException('Class not found in this school');
    }
    if (cls.status !== 'ACTIVE') {
      throw new ConflictException('Selected class is not active for enrollment');
    }

    const sec = await tx.section.findFirst({
      where: { id: sectionId, classId, schoolId }
    });
    if (!sec) {
      throw new NotFoundException('Section not found in this class');
    }
    if (sec.status !== 'ACTIVE') {
      throw new ConflictException('Selected section is not active for enrollment');
    }

    return { className: cls.name, sectionName: sec.name };
  }

  async validatePhotoFile(
    tx: Prisma.TransactionClient,
    schoolId: string,
    photoFileId?: string | null
  ): Promise<void> {
    if (!photoFileId) return;
    const file = await tx.schoolFile.findFirst({
      where: { id: photoFileId, schoolId }
    });
    if (!file) {
      throw new NotFoundException('Student photo file not found in school repository');
    }
    if (file.fileType !== 'STUDENT_PHOTO') {
      throw new BadRequestException('Uploaded file is not a valid student photo');
    }
  }

  maskAadhaar(last4: string): string {
    return `XXXX-XXXX-${last4}`;
  }

  maskPan(pan?: string | null): string | null {
    if (!pan || pan.length !== 10) return null;
    return `XXXXX${pan.slice(5, 9)}${pan[9]}`;
  }

  maskAccountNumber(acc?: string | null): string | null {
    if (!acc || acc.length < 4) return null;
    return `XXXXXX${acc.slice(-4)}`;
  }
}
