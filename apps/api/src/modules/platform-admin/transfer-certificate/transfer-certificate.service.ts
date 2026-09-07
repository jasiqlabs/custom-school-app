import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
  Optional,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { SchoolsRepository } from '../schools/schools.repository';
import { AuditService } from '../../platform-foundation/services/audit.service';
import { JobEnqueueService } from '../../platform-foundation/services/job-enqueue.service';
import { DocumentJobRepository } from '../../platform-foundation/repositories/document-job.repository';
import { SchoolFileRepository } from '../../platform-foundation/repositories/school-file.repository';
import { ObjectStorageService } from '../../platform-foundation/services/object-storage.service';
import { buildTransferCertificatePdf } from './tc-pdf-builder';
import {
  MOD_001_ERRORS,
  GenerateTcRequest,
  GenerateTcResponse,
  JobRecord,
} from '@custom-school/contracts';

@Injectable()
export class TransferCertificateService {
  constructor(
    private readonly schoolsRepository: SchoolsRepository,
    private readonly documentJobRepository: DocumentJobRepository,
    private readonly jobEnqueueService: JobEnqueueService,
    private readonly auditService: AuditService,
    @Optional() private readonly schoolFileRepository?: SchoolFileRepository,
    @Optional() private readonly objectStorageService?: ObjectStorageService,
  ) {}

  async generateTransferCertificate(
    schoolId: string,
    dto: GenerateTcRequest,
    actorId?: string,
    requestId: string = 'req-' + crypto.randomUUID(),
  ): Promise<GenerateTcResponse> {
    const school = await this.schoolsRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School tenant not found.',
      });
    }

    // VT-001-033: Inactive school cannot generate TC
    if (school.status !== 'ACTIVE') {
      throw new ConflictException({
        code: MOD_001_ERRORS.ERR_SCHOOL_NOT_ACTIVE,
        message: 'Transfer Certificates can only be generated for active schools.',
      });
    }

    // VT-001-034: Missing signature prerequisite blocks TC when enabled
    if (dto.includeSignature && !school.principalSignatureFileId) {
      throw new UnprocessableEntityException({
        code: MOD_001_ERRORS.ERR_TC_PREREQUISITE_MISSING,
        message: 'Principal signature must be uploaded and verified before enabling includeSignature.',
      });
    }

    // Trusted Job Pattern: enqueue job in persistent DB row
    const job = await this.jobEnqueueService.enqueueJob({
      schoolId: school.id,
      jobType: 'TC_PDF',
      payloadSnapshot: {
        schoolId: school.id,
        schoolUuid: school.schoolUuid,
        schoolName: school.name,
        code: school.code,
        includeLogo: !!dto.includeLogo,
        includeSignature: !!dto.includeSignature,
        logoFileId: school.logoFileId,
        principalSignatureFileId: school.principalSignatureFileId,
        principalName: school.principalName,
      },
      enqueuedBy: actorId || 'platform-admin',
      idempotencyKey: dto.idempotencyKey,
    });

    await this.auditService.appendAuditEvent({
      requestId,
      actorId,
      actorRole: 'PLATFORM_ADMIN',
      schoolId: school.id,
      action: 'TC_GENERATION_ENQUEUED',
      resourceType: 'TRANSFER_CERTIFICATE',
      resourceId: job.id,
      metadata: {
        jobId: job.id,
        schoolUuid: school.schoolUuid,
        includeLogo: dto.includeLogo,
        includeSignature: dto.includeSignature,
      },
    });

    // In non-test environments (e.g. dev server), trigger background job processing
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(async () => {
        try {
          await this.documentJobRepository.updateStatus(job.id, 'PROCESSING');
          setTimeout(async () => {
            try {
              await this.executeJobWorker(job.id);
            } catch (workerErr) {
              console.error('TC worker processing error:', workerErr);
              await this.documentJobRepository.updateStatus(job.id, 'FAILED', undefined, String(workerErr));
            }
          }, 800);
        } catch (procErr) {
          console.error('TC transition to PROCESSING error:', procErr);
        }
      }, 400);
    }

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  async executeJobWorker(jobId: string) {
    const job = await this.documentJobRepository.findById(jobId);
    if (!job) return;
    const school = await this.schoolsRepository.findById(job.schoolId);
    if (!school) return;

    const fileId = 'tc-file-' + jobId;
    const storageKey = `tenants/${school.id}/TRANSFER_CERTIFICATE/${fileId}.pdf`;

    let logoImageBuffer: Buffer | null = null;
    let logoMimeType: string | null = null;
    if (job.payloadSnapshot?.includeLogo && school.logoFileId && this.objectStorageService) {
      try {
        const fileObj = await this.objectStorageService.getFileBuffer(school.id, school.logoFileId);
        logoImageBuffer = fileObj.buffer;
        logoMimeType = fileObj.mimeType;
        console.log('[TC-WORKER] Successfully loaded logo buffer, length:', logoImageBuffer.length, 'mimeType:', logoMimeType);
      } catch (err) {
        console.error('[TC-WORKER] Failed to load logo buffer:', err);
      }
    } else {
      console.log('[TC-WORKER] Logo skipped: includeLogo =', job.payloadSnapshot?.includeLogo, 'logoFileId =', school.logoFileId);
    }

    let signatureImageBuffer: Buffer | null = null;
    let signatureMimeType: string | null = null;
    if (job.payloadSnapshot?.includeSignature && school.principalSignatureFileId && this.objectStorageService) {
      try {
        const fileObj = await this.objectStorageService.getFileBuffer(school.id, school.principalSignatureFileId);
        signatureImageBuffer = fileObj.buffer;
        signatureMimeType = fileObj.mimeType;
        console.log('[TC-WORKER] Successfully loaded signature buffer, length:', signatureImageBuffer.length, 'mimeType:', signatureMimeType);
      } catch (err) {
        console.error('[TC-WORKER] Failed to load signature buffer:', err);
      }
    } else {
      console.log('[TC-WORKER] Signature skipped: includeSignature =', job.payloadSnapshot?.includeSignature, 'principalSignatureFileId =', school.principalSignatureFileId);
    }

    const pdfBuffer = buildTransferCertificatePdf({
      schoolName: school.name,
      schoolCode: school.code,
      schoolUuid: school.schoolUuid,
      address: school.address,
      contactEmail: school.contactEmail,
      contactPhone: school.contactPhone,
      principalName: school.principalName,
      includeLogo: !!job.payloadSnapshot?.includeLogo,
      logoFileId: school.logoFileId,
      logoImageBuffer,
      logoMimeType,
      includeSignature: !!job.payloadSnapshot?.includeSignature,
      signatureFileId: school.principalSignatureFileId,
      signatureImageBuffer,
      signatureMimeType,
      jobId: jobId,
      generatedDate: new Date().toLocaleString(),
    });

    const fileRecord = {
      id: fileId,
      schoolId: school.id,
      category: 'TRANSFER_CERTIFICATE' as const,
      fileName: `Transfer_Certificate_${school.code}_${jobId}.pdf`,
      fileSizeBytes: pdfBuffer.length,
      mimeType: 'application/pdf',
      storageKey,
      uploadedBy: 'tc-pdf-worker',
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.schoolFileRepository) {
      await this.schoolFileRepository.create(fileRecord);
    }

    if (this.objectStorageService) {
      await this.objectStorageService.saveRawFile({
        schoolId: school.id,
        fileId,
        storageKey,
        category: 'TRANSFER_CERTIFICATE',
        fileName: fileRecord.fileName,
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
        uploadedBy: 'tc-pdf-worker',
      });
    }

    await this.documentJobRepository.updateStatus(jobId, 'COMPLETED', fileId);
  }

  async listJobs(schoolId: string): Promise<JobRecord[]> {
    const school = await this.schoolsRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School tenant not found.',
      });
    }

    const all = await this.documentJobRepository.findBySchoolId(schoolId);
    return all.filter((j) => j.jobType === 'TC_PDF');
  }

  async getJob(schoolId: string, jobId: string): Promise<JobRecord> {
    const job = await this.documentJobRepository.findById(jobId);
    if (!job || job.schoolId !== schoolId) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'Transfer certificate job not found.',
      });
    }
    return job;
  }

  async getJobPdfBuffer(schoolId: string, jobId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const job = await this.getJob(schoolId, jobId);
    const school = await this.schoolsRepository.findById(schoolId);
    if (!school) {
      throw new NotFoundException({
        code: MOD_001_ERRORS.ERR_RESOURCE_NOT_FOUND,
        message: 'School tenant not found.',
      });
    }

    // Attempt retrieval from storage if available
    if (job.fileId && this.objectStorageService) {
      try {
        const fileObj = await this.objectStorageService.getFileBuffer(schoolId, job.fileId);
        console.log('[TC-DOWNLOAD] Retrieved existing PDF from storage, size:', fileObj.buffer.length);
        return { buffer: fileObj.buffer, fileName: fileObj.fileName };
      } catch (err) {
        console.warn('[TC-DOWNLOAD] Could not retrieve file from storage, falling back to build:', err);
      }
    }

    let logoImageBuffer: Buffer | null = null;
    let logoMimeType: string | null = null;
    if (job.payloadSnapshot?.includeLogo && school.logoFileId && this.objectStorageService) {
      try {
        const fileObj = await this.objectStorageService.getFileBuffer(school.id, school.logoFileId);
        logoImageBuffer = fileObj.buffer;
        logoMimeType = fileObj.mimeType;
      } catch (err) {}
    }

    let signatureImageBuffer: Buffer | null = null;
    let signatureMimeType: string | null = null;
    if (job.payloadSnapshot?.includeSignature && school.principalSignatureFileId && this.objectStorageService) {
      try {
        const fileObj = await this.objectStorageService.getFileBuffer(school.id, school.principalSignatureFileId);
        signatureImageBuffer = fileObj.buffer;
        signatureMimeType = fileObj.mimeType;
      } catch (err) {}
    }

    const pdfBuffer = buildTransferCertificatePdf({
      schoolName: school.name,
      schoolCode: school.code,
      schoolUuid: school.schoolUuid,
      address: school.address,
      contactEmail: school.contactEmail,
      contactPhone: school.contactPhone,
      principalName: school.principalName,
      includeLogo: !!job.payloadSnapshot?.includeLogo,
      logoFileId: school.logoFileId,
      logoImageBuffer,
      logoMimeType,
      includeSignature: !!job.payloadSnapshot?.includeSignature,
      signatureFileId: school.principalSignatureFileId,
      signatureImageBuffer,
      signatureMimeType,
      jobId: jobId,
      generatedDate: job.completedAt ? new Date(job.completedAt).toLocaleString() : new Date().toLocaleString(),
    });

    return {
      buffer: pdfBuffer,
      fileName: `Transfer_Certificate_${school.code}_${jobId}.pdf`,
    };
  }
}
