import { BullMQJobPayload } from '@custom-school/contracts';

export interface IDocumentJobDatabase {
  findJobById(jobId: string): Promise<any>;
  updateJobStatus(jobId: string, status: string, fileId?: string, error?: string): Promise<void>;
  createSchoolFile(file: any): Promise<void>;
}

export class DocumentJobConsumer {
  constructor(private readonly db: IDocumentJobDatabase) {}

  async process(payload: BullMQJobPayload): Promise<{ success: boolean; jobId: string }> {
    // Trusted Job Pattern: Worker ignores any authority fields in payload, uses only jobId
    const jobId = payload.jobId;
    if (!jobId) {
      throw new Error('Invalid job payload: missing jobId');
    }

    const jobRow = await this.db.findJobById(jobId);
    if (!jobRow) {
      throw new Error(`Job not found in database: ${jobId}`);
    }

    await this.db.updateJobStatus(jobId, 'PROCESSING');

    try {
      // Simulate document rendering (e.g., PDF generation)
      const generatedFileId = 'file-' + jobId;
      await this.db.createSchoolFile({
        id: generatedFileId,
        schoolId: jobRow.schoolId, // Loaded securely from DB row
        category: 'DOCUMENT',
        fileName: `${jobRow.jobType}_${jobId}.pdf`,
        fileSizeBytes: 1024 * 50,
        mimeType: 'application/pdf',
        storageKey: `tenants/${jobRow.schoolId}/DOCUMENT/${generatedFileId}.pdf`,
        uploadedBy: 'system-worker',
      });

      await this.db.updateJobStatus(jobId, 'COMPLETED', generatedFileId);
      return { success: true, jobId };
    } catch (err: any) {
      await this.db.updateJobStatus(jobId, 'FAILED', undefined, err.message);
      throw err;
    }
  }
}
