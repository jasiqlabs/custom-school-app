import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AppendAuditLogDto, AuditLogRecord } from '@custom-school/contracts';
import { AuditLogRepository } from '../repositories/audit-log.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditLogRepository) {}

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | null {
    if (!metadata) return null;
    const sanitized = { ...metadata };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'authorization', 'cookie'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        delete sanitized[key];
      }
    }
    return sanitized;
  }

  async appendAuditEvent(dto: AppendAuditLogDto): Promise<string> {
    const auditId = crypto.randomUUID();
    const record: AuditLogRecord = {
      id: auditId,
      occurredAt: new Date(),
      requestId: dto.requestId || 'req-' + crypto.randomUUID(),
      actorId: dto.actorId || null,
      actorRole: dto.actorRole || null,
      schoolId: dto.schoolId || null,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId || null,
      metadata: this.sanitizeMetadata(dto.metadata),
      ipHash: dto.ipHash || null,
    };

    await this.auditRepository.insert(record);
    return auditId;
  }

  async getAuditTrailByRequestId(requestId: string): Promise<AuditLogRecord[]> {
    return this.auditRepository.findByRequestId(requestId);
  }
}
