import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  EnqueueJobDto,
  JobRecord,
  BullMQJobPayload,
} from '@custom-school/contracts';
import { DocumentJobRepository } from '../repositories/document-job.repository';
import { ExportJobRepository } from '../repositories/export-job.repository';

export interface IQueueProducer {
  add(queueName: string, jobName: string, data: BullMQJobPayload, opts?: Record<string, unknown>): Promise<void>;
}

@Injectable()
export class MockQueueProducer implements IQueueProducer {
  public enqueuedMessages: Array<{ queueName: string; jobName: string; data: BullMQJobPayload }> = [];

  async add(queueName: string, jobName: string, data: BullMQJobPayload): Promise<void> {
    this.enqueuedMessages.push({ queueName, jobName, data });
  }
}

@Injectable()
export class JobEnqueueService {
  constructor(
    private readonly documentJobRepository: DocumentJobRepository,
    private readonly exportJobRepository: ExportJobRepository,
    private readonly queueProducer: MockQueueProducer
  ) {}

  async enqueueJob(dto: EnqueueJobDto): Promise<JobRecord> {
    const isExport = dto.jobType === 'EXCEL_EXPORT' || dto.jobType === 'FEE_REPORT_EXPORT';
    const repository = isExport ? this.exportJobRepository : this.documentJobRepository;

    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await repository.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const jobId = crypto.randomUUID();
    const jobRecord: JobRecord = {
      id: jobId,
      schoolId: dto.schoolId,
      jobType: dto.jobType,
      status: 'QUEUED',
      idempotencyKey: dto.idempotencyKey || null,
      payloadSnapshot: dto.payloadSnapshot,
      fileId: null,
      errorMessage: null,
      enqueuedAt: new Date(),
      completedAt: null,
    };

    const saved = await repository.create(jobRecord);

    // Trusted Job Pattern: BullMQ payload is strictly { jobId }
    // No school_id or parameters in queue message to prevent payload tampering
    const queueName = isExport ? 'export' : 'document';
    const queuePayload: BullMQJobPayload = { jobId: saved.id };

    await this.queueProducer.add(queueName, dto.jobType, queuePayload);

    return saved;
  }
}
