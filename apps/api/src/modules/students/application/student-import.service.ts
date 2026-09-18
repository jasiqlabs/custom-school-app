import { BadRequestException, ConflictException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { SensitiveFieldCryptoService } from '../../../platform/crypto/sensitive-field-crypto.service';
import { StudentIdentifierAllocator } from '../domain/student-identifier-allocator';
import { StudentDomainValidator } from '../domain/student.validator';
import { buildXlsx, parseXlsx } from './xlsx.util';
import type { SessionActor, BulkImportJobDto, BulkImportRowPreviewDto } from '@custom-school/contracts';

const TEMPLATE_HEADERS = [
  'Student ID/SR (Optional)',
  'Student Name*',
  'Father Name*',
  'Mother Name*',
  'Date of Birth (YYYY-MM-DD)*',
  'Gender (BOY/GIRL)*',
  'Class Name*',
  'Section Name*',
  'Address*',
  'Phone*',
  'Emergency Contact*',
  'Emergency Relation*',
  'Aadhaar Number (12 digits)*',
  'Transport Required (YES/NO)',
  'Concession Type (NONE/FIXED_AMOUNT/PERCENTAGE)',
  'Concession Value',
  'Family Code (Optional)',
  'Email (Optional)',
  'Blood Group (Optional)'
];

@Injectable()
export class StudentImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crypto: SensitiveFieldCryptoService,
    private readonly allocator: StudentIdentifierAllocator,
    private readonly validator: StudentDomainValidator
  ) {}

  generateTemplate(): Buffer {
    const sampleRows = [
      [
        '',
        'Aarav Sharma',
        'Rajesh Sharma',
        'Sunita Sharma',
        '2018-05-15',
        'BOY',
        'Class 1',
        'A',
        '123 Gandhi Road, Civil Lines',
        '9876543210',
        '9876543211',
        'Father',
        '234567890123',
        'NO',
        'NONE',
        '0',
        'FAM-001',
        'aarav@example.com',
        'B+'
      ]
    ];
    return buildXlsx('Students Template', TEMPLATE_HEADERS, sampleRows);
  }

  async uploadAndStage(actor: SessionActor, fileBuffer: Buffer, fileName: string): Promise<BulkImportJobDto> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      throw new PayloadTooLargeException('Import file size exceeds 10MB limit');
    }

    let rawRows: string[][];
    try {
      rawRows = parseXlsx(fileBuffer);
    } catch (err: any) {
      throw new BadRequestException(`Failed to parse spreadsheet: ${err.message || 'Invalid format'}`);
    }

    if (rawRows.length < 2) {
      throw new BadRequestException('Import file is empty or missing data rows');
    }

    const dataRows = rawRows.slice(1);
    if (dataRows.length > 5000) {
      throw new PayloadTooLargeException('Spreadsheet exceeds maximum of 5,000 rows');
    }

    // Lookup school classes and sections for validation
    const classes = await this.prisma.class.findMany({
      where: { schoolId, status: 'ACTIVE' },
      include: { sections: { where: { status: 'ACTIVE' } } }
    });

    const classMap = new Map<string, { id: string; sections: Map<string, string> }>();
    for (const c of classes) {
      const secMap = new Map<string, string>();
      for (const s of c.sections) {
        secMap.set(s.name.trim().toLowerCase(), s.id);
      }
      classMap.set(c.name.trim().toLowerCase(), { id: c.id, sections: secMap });
    }

    // Create the import job
    const job = await this.prisma.studentImportJob.create({
      data: {
        schoolId,
        operatorId: actor.userId,
        fileId: actor.userId, // Staged under operator session
        status: 'VALIDATING',
        totalRows: dataRows.length
      }
    });

    let validCount = 0;
    let errorCount = 0;
    const seenCodesInBatch = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;
      const errors: string[] = [];

      const rawCode = (row[0] || '').trim();
      const rawName = (row[1] || '').trim();
      const rawFather = (row[2] || '').trim();
      const rawMother = (row[3] || '').trim();
      const rawDob = (row[4] || '').trim();
      const rawGender = (row[5] || '').trim().toUpperCase();
      const rawClass = (row[6] || '').trim().toLowerCase();
      const rawSection = (row[7] || '').trim().toLowerCase();
      const rawAddress = (row[8] || '').trim();
      const rawPhone = (row[9] || '').trim();
      const rawEmergPhone = (row[10] || '').trim();
      const rawEmergRel = (row[11] || '').trim();
      const rawAadhaar = (row[12] || '').trim();
      const rawTransport = (row[13] || '').trim().toUpperCase();
      const rawConcType = (row[14] || '').trim().toUpperCase() || 'NONE';
      const rawConcVal = parseFloat((row[15] || '').trim()) || 0;
      const rawFamilyCode = (row[16] || '').trim();
      const rawEmail = (row[17] || '').trim();
      const rawBlood = (row[18] || '').trim();

      if (!rawName) errors.push('Student Name is required');
      if (!rawFather) errors.push('Father Name is required');
      if (!rawMother) errors.push('Mother Name is required');
      if (!rawAddress) errors.push('Address is required');
      if (!rawPhone) errors.push('Phone is required');
      if (!rawEmergPhone) errors.push('Emergency Contact is required');
      if (!rawEmergRel) errors.push('Emergency Relation is required');

      if (rawGender !== 'BOY' && rawGender !== 'GIRL') {
        errors.push("Gender must be 'BOY' or 'GIRL'");
      }

      // DOB
      if (!rawDob) {
        errors.push('Date of Birth is required');
      } else {
        try {
          this.validator.validateDob(rawDob);
        } catch (e: any) {
          errors.push(e.message);
        }
      }

      // Aadhaar
      let cleanAadhaar = '';
      if (!rawAadhaar) {
        errors.push('Aadhaar Number is required');
      } else {
        try {
          const res = this.validator.validateAadhaar(rawAadhaar);
          cleanAadhaar = res.clean;
        } catch (e: any) {
          errors.push(e.message);
        }
      }

      // Class and Section
      let resolvedClassId = '';
      let resolvedSectionId = '';
      const matchedClass = classMap.get(rawClass);
      if (!matchedClass) {
        errors.push(`Active class '${row[6] || ''}' not found in this school`);
      } else {
        resolvedClassId = matchedClass.id;
        const matchedSecId = matchedClass.sections.get(rawSection);
        if (!matchedSecId) {
          errors.push(`Active section '${row[7] || ''}' not found in class '${row[6] || ''}'`);
        } else {
          resolvedSectionId = matchedSecId;
        }
      }

      // Code uniqueness check
      if (rawCode) {
        const normCode = this.allocator.normalizeCode(rawCode);
        if (seenCodesInBatch.has(normCode)) {
          errors.push(`Student code '${rawCode}' appears multiple times in this spreadsheet`);
        } else {
          seenCodesInBatch.add(normCode);
          const existing = await this.prisma.student.findUnique({
            where: { schoolId_normalizedCode: { schoolId, normalizedCode: normCode } }
          });
          if (existing) {
            errors.push(`Student code '${rawCode}' already exists in this school`);
          }
        }
      }

      const isValid = errors.length === 0;
      if (isValid) validCount++;
      else errorCount++;

      const stagedData = {
        studentCodeMode: rawCode ? 'MANUAL' : 'AUTO',
        studentCode: rawCode || undefined,
        fullName: rawName,
        fatherName: rawFather,
        motherName: rawMother,
        familyCode: rawFamilyCode || undefined,
        dateOfBirth: rawDob,
        classId: resolvedClassId,
        sectionId: resolvedSectionId,
        className: row[6] || '',
        sectionName: row[7] || '',
        gender: rawGender,
        address: rawAddress,
        phone: rawPhone,
        email: rawEmail || undefined,
        emergencyContact: rawEmergPhone,
        emergencyContactRelation: rawEmergRel,
        aadhaarNumber: cleanAadhaar || rawAadhaar,
        transportRequired: rawTransport === 'YES',
        concession: {
          type: ['NONE', 'FIXED_AMOUNT', 'PERCENTAGE'].includes(rawConcType) ? rawConcType : 'NONE',
          value: rawConcVal
        },
        bloodGroup: rawBlood || undefined
      };

      const encrypted = this.crypto.encryptJson(stagedData, { schoolId, jobId: job.id, row: String(rowNum) });

      await this.prisma.studentImportRow.create({
        data: {
          schoolId,
          jobId: job.id,
          rowNumber: rowNum,
          status: isValid ? 'VALID' : 'ERROR',
          rawEncrypted: JSON.stringify(encrypted),
          previewJson: {
            studentCode: rawCode || '(AUTO)',
            fullName: rawName,
            className: row[6] || '',
            sectionName: row[7] || '',
            gender: rawGender,
            phone: rawPhone
          },
          errorMessages: errors.length > 0 ? errors : undefined
        }
      });
    }

    const finalStatus = validCount > 0 ? 'READY' : 'FAILED';
    const updatedJob = await this.prisma.studentImportJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        validRows: validCount,
        errorRows: errorCount
      }
    });

    return {
      id: updatedJob.id,
      schoolId: updatedJob.schoolId,
      fileId: updatedJob.fileId,
      errorFileId: updatedJob.errorFileId,
      status: updatedJob.status,
      totalRows: updatedJob.totalRows,
      validRows: updatedJob.validRows,
      errorRows: updatedJob.errorRows,
      importedRows: updatedJob.importedRows,
      createdAt: updatedJob.createdAt.toISOString(),
      updatedAt: updatedJob.updatedAt.toISOString()
    };
  }

  async getJob(actor: SessionActor, jobId: string): Promise<BulkImportJobDto> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    const job = await this.prisma.studentImportJob.findFirst({
      where: { id: jobId, schoolId }
    });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return {
      id: job.id,
      schoolId: job.schoolId,
      fileId: job.fileId,
      errorFileId: job.errorFileId,
      status: job.status,
      totalRows: job.totalRows,
      validRows: job.validRows,
      errorRows: job.errorRows,
      importedRows: job.importedRows,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    };
  }

  async getJobRows(actor: SessionActor, jobId: string, limit: number = 50): Promise<BulkImportRowPreviewDto[]> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    const rows = await this.prisma.studentImportRow.findMany({
      where: { jobId, schoolId },
      take: limit,
      orderBy: { rowNumber: 'asc' }
    });

    return rows.map(r => ({
      rowNumber: r.rowNumber,
      status: r.status,
      previewData: r.previewJson as any,
      errorMessages: (r.errorMessages as string[]) || undefined
    }));
  }

  async confirmImport(actor: SessionActor, jobId: string) {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }

    const job = await this.prisma.studentImportJob.findFirst({
      where: { id: jobId, schoolId }
    });

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    if (job.status !== 'READY') {
      throw new ConflictException(`Import job is in ${job.status} state and cannot be confirmed`);
    }

    await this.prisma.studentImportJob.update({
      where: { id: jobId },
      data: { status: 'IMPORTING' }
    });

    const validRows = await this.prisma.studentImportRow.findMany({
      where: { jobId, schoolId, status: 'VALID' },
      orderBy: { rowNumber: 'asc' }
    });

    let importedCount = 0;
    let failedCount = 0;

    for (const row of validRows) {
      try {
        const envelope = JSON.parse(row.rawEncrypted);
        const data: any = this.crypto.decryptJson(envelope, { schoolId, jobId, row: String(row.rowNumber) });

        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          let code = data.studentCode;
          if (data.studentCodeMode === 'AUTO' || !code) {
            code = await this.allocator.allocateAutoCode(tx, schoolId);
          }
          const normalizedCode = this.allocator.normalizeCode(code);

          const student = await tx.student.create({
            data: {
              schoolId,
              studentCode: code,
              normalizedCode,
              fullName: data.fullName,
              normalizedName: data.fullName.toLowerCase(),
              fatherName: data.fatherName,
              motherName: data.motherName,
              dob: new Date(data.dateOfBirth),
              gender: data.gender,
              address: data.address,
              phone: data.phone,
              emergencyContact: data.emergencyContact,
              emergencyRelation: data.emergencyContactRelation,
              concessionType: data.concession?.type || 'NONE',
              concessionValue: data.concession?.value || 0,
              transportRequired: data.transportRequired,
              status: 'ACTIVE'
            }
          });

          const privatePayload = {
            aadhaarNumber: data.aadhaarNumber,
            religion: null,
            caste: null,
            disability: null,
            medicalConditions: null,
            allergies: null,
            bank: null,
            panNumber: null
          };

          const encrypted = this.crypto.encryptJson(privatePayload, {
            schoolId,
            studentId: student.id
          });

          await tx.studentPrivateProfile.create({
            data: {
              schoolId,
              studentId: student.id,
              aadhaarLast4: data.aadhaarNumber.slice(-4),
              encryptedPayload: JSON.stringify(encrypted)
            }
          });

          await tx.studentEnrollment.create({
            data: {
              schoolId,
              studentId: student.id,
              classId: data.classId,
              sectionId: data.sectionId,
              status: 'ACTIVE'
            }
          });

          await tx.studentImportRow.update({
            where: { id: row.id },
            data: { status: 'IMPORTED' }
          });
        });

        importedCount++;
      } catch (err: any) {
        failedCount++;
        await this.prisma.studentImportRow.update({
          where: { id: row.id },
          data: {
            status: 'ERROR',
            errorMessages: [err?.message || 'Error creating student record']
          }
        });
      }
    }

    const finalStatus = importedCount === validRows.length ? 'COMPLETED' : 'FAILED';
    const updatedJob = await this.prisma.studentImportJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        importedRows: importedCount,
        errorRows: job.errorRows + failedCount
      }
    });

    await this.audit.append({
      requestId: actor.requestId,
      schoolId,
      actorType: actor.userType,
      actorId: actor.userId,
      eventType: 'STUDENT_IMPORT_CONFIRMED',
      targetType: 'STUDENT_IMPORT_JOB',
      targetId: jobId,
      metadata: { importedCount, failedCount }
    });

    return {
      id: updatedJob.id,
      schoolId: updatedJob.schoolId,
      fileId: updatedJob.fileId,
      errorFileId: updatedJob.errorFileId,
      status: finalStatus,
      importedRows: importedCount,
      errorRows: job.errorRows + failedCount
    };
  }

  async getErrorWorkbook(actor: SessionActor, jobId: string): Promise<Buffer> {
    const schoolId = actor.schoolId;
    if (!schoolId) {
      throw new ConflictException('Operator session does not have school context');
    }
    const errorRows = await this.prisma.studentImportRow.findMany({
      where: { jobId, schoolId, status: 'ERROR' },
      orderBy: { rowNumber: 'asc' }
    });

    const headers = ['Row Number', 'Student Name', 'Class', 'Section', 'Error Messages'];
    const data = errorRows.map(r => {
      const prev = r.previewJson as any;
      const errs = Array.isArray(r.errorMessages) ? (r.errorMessages as string[]).join('; ') : 'Validation error';
      return [r.rowNumber, prev?.fullName || '', prev?.className || '', prev?.sectionName || '', errs];
    });

    return buildXlsx('Import Errors', headers, data);
  }
}
