import { BullMQJobPayload } from '@custom-school/contracts';
import { buildTransferCertificatePdf } from './tc-pdf-builder';

export interface ITcPdfDatabase {
  findJobById(jobId: string): Promise<any>;
  findSchoolById(schoolId: string): Promise<any>;
  updateJobStatus(jobId: string, status: string, fileId?: string, error?: string): Promise<void>;
  createSchoolFile(file: any): Promise<void>;
  getFileBuffer?(schoolId: string, fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  saveFileBuffer?(storageKey: string, buffer: Buffer, mimeType: string): Promise<void>;
  sendToDlq?(jobId: string, error: string, finalPayload: any): Promise<void>;
}

export class TcPdfConsumer {
  constructor(private readonly db: ITcPdfDatabase) {}

  async processTcJob(
    payload: BullMQJobPayload,
    attemptNumber: number = 1,
    simulateError: boolean = false,
  ): Promise<{
    success: boolean;
    jobId: string;
    fileId?: string;
    schoolUuid?: string;
    retried?: boolean;
    sentToDlq?: boolean;
  }> {
    // Trusted Job Pattern: Worker uses only jobId from queue payload
    const jobId = payload.jobId;
    if (!jobId) {
      throw new Error('Invalid job payload: missing jobId');
    }

    const jobRow = await this.db.findJobById(jobId);
    if (!jobRow) {
      throw new Error(`Job not found in database: ${jobId}`);
    }

    const school = await this.db.findSchoolById(jobRow.schoolId);
    if (!school) {
      throw new Error(`School tenant not found: ${jobRow.schoolId}`);
    }

    await this.db.updateJobStatus(jobId, 'PROCESSING');

    // Simulate transient failure and DLQ logic
    if (simulateError) {
      if (attemptNumber < 3) {
        // Retry with backoff (attempt < 3)
        await this.db.updateJobStatus(jobId, 'RETRYING', undefined, `Attempt ${attemptNumber} failed`);
        return { success: false, jobId, retried: true };
      } else {
        // Terminal failure after 3 attempts -> Send to DLQ
        await this.db.updateJobStatus(jobId, 'FAILED', undefined, 'Terminal failure after 3 attempts');
        if (this.db.sendToDlq) {
          await this.db.sendToDlq(jobId, 'Terminal failure after 3 attempts', {
            jobId,
            schoolId: school.id,
            schoolUuid: school.schoolUuid,
            attempts: attemptNumber,
          });
        }
        return { success: false, jobId, sentToDlq: true };
      }
    }

    try {
      // Render authentic TC PDF document preserving immutable school identity
      const fileId = 'tc-file-' + jobId;
      const storageKey = `tenants/${school.id}/TRANSFER_CERTIFICATE/${fileId}.pdf`;

      let logoImageBuffer: Buffer | null = null;
      let logoMimeType: string | null = null;
      if (jobRow.payloadSnapshot?.includeLogo && school.logoFileId && this.db.getFileBuffer) {
        try {
          const res = await this.db.getFileBuffer(school.id, school.logoFileId);
          if (res) {
            logoImageBuffer = res.buffer;
            logoMimeType = res.mimeType;
          }
        } catch (e) {}
      }

      let signatureImageBuffer: Buffer | null = null;
      let signatureMimeType: string | null = null;
      if (jobRow.payloadSnapshot?.includeSignature && school.principalSignatureFileId && this.db.getFileBuffer) {
        try {
          const res = await this.db.getFileBuffer(school.id, school.principalSignatureFileId);
          if (res) {
            signatureImageBuffer = res.buffer;
            signatureMimeType = res.mimeType;
          }
        } catch (e) {}
      }

      const pdfBuffer = buildTransferCertificatePdf({
        schoolName: school.name,
        schoolCode: school.code,
        schoolUuid: school.schoolUuid,
        address: school.address,
        contactEmail: school.contactEmail,
        contactPhone: school.contactPhone,
        principalName: school.principalName,
        includeLogo: !!jobRow.payloadSnapshot?.includeLogo,
        logoFileId: school.logoFileId,
        logoImageBuffer,
        logoMimeType,
        includeSignature: !!jobRow.payloadSnapshot?.includeSignature,
        signatureFileId: school.principalSignatureFileId,
        signatureImageBuffer,
        signatureMimeType,
        jobId: jobId,
        generatedDate: new Date().toLocaleString(),
      });

      await this.db.createSchoolFile({
        id: fileId,
        schoolId: school.id,
        category: 'TRANSFER_CERTIFICATE',
        fileName: `Transfer_Certificate_${school.code}_${jobId}.pdf`,
        fileSizeBytes: pdfBuffer.length,
        mimeType: 'application/pdf',
        storageKey,
        uploadedBy: 'tc-pdf-worker',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (this.db.saveFileBuffer) {
        await this.db.saveFileBuffer(storageKey, pdfBuffer, 'application/pdf');
      }

      await this.db.updateJobStatus(jobId, 'COMPLETED', fileId);

      return {
        success: true,
        jobId,
        fileId,
        schoolUuid: school.schoolUuid,
      };
    } catch (err: any) {
      await this.db.updateJobStatus(jobId, 'FAILED', undefined, err.message);
      throw err;
    }
  }
}
