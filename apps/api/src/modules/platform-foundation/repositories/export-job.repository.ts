import { Injectable } from '@nestjs/common';
import { JobRecord } from '@custom-school/contracts';

@Injectable()
export class ExportJobRepository {
  private jobs = new Map<string, JobRecord>();

  async create(job: JobRecord): Promise<JobRecord> {
    this.jobs.set(job.id, { ...job });
    return { ...job };
  }

  async findById(id: string): Promise<JobRecord | null> {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<JobRecord | null> {
    for (const job of this.jobs.values()) {
      if (job.idempotencyKey === idempotencyKey) {
        return { ...job };
      }
    }
    return null;
  }

  async updateStatus(id: string, status: JobRecord['status'], fileId?: string, errorMessage?: string): Promise<JobRecord | null> {
    const job = this.jobs.get(id);
    if (!job) return null;
    job.status = status;
    if (fileId) job.fileId = fileId;
    if (errorMessage) job.errorMessage = errorMessage;
    if (status === 'COMPLETED' || status === 'FAILED') {
      job.completedAt = new Date();
    }
    return { ...job };
  }

  async findBySchoolId(schoolId: string): Promise<JobRecord[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.schoolId === schoolId)
      .map((j) => ({ ...j }));
  }
}
