import { Injectable } from '@nestjs/common';
import { AuditLogRecord } from '@custom-school/contracts';

/**
 * Append-Only Audit Log Repository.
 * IMPORTANT: In accordance with TC-UNIT-000-004, this repository intentionally exposes
 * NO update or delete methods to preserve immutable audit trails.
 */
@Injectable()
export class AuditLogRepository {
  private logs: AuditLogRecord[] = [];

  async insert(record: AuditLogRecord): Promise<AuditLogRecord> {
    this.logs.push({ ...record });
    return { ...record };
  }

  async findByRequestId(requestId: string): Promise<AuditLogRecord[]> {
    return this.logs
      .filter((l) => l.requestId === requestId)
      .map((l) => ({ ...l }));
  }

  async findBySchoolId(schoolId: string): Promise<AuditLogRecord[]> {
    return this.logs
      .filter((l) => l.schoolId === schoolId)
      .map((l) => ({ ...l }));
  }

  async count(): Promise<number> {
    return this.logs.length;
  }
}
