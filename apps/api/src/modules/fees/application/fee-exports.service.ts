import { Injectable, BadRequestException } from '@nestjs/common';
import { QueryPendingFeesService } from './query-pending-fees.service';
import { PrivateFileService } from '../../../platform/files/private-file.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { buildXlsx } from './xlsx.util';
import type {
  CreatePendingFeeExportInput,
  SessionActor,
} from '@custom-school/contracts';

const HEADERS = [
  'Student Code',
  'Student Name',
  'Class',
  'Section',
  'Fee Month',
  'Base Fee (INR)',
  'Concession (INR)',
  'Net Due (INR)',
  'Paid Amount (INR)',
  'Outstanding Balance (INR)',
  'Status',
];

@Injectable()
export class FeeExportsService {
  constructor(
    private readonly pendingService: QueryPendingFeesService,
    private readonly fileService: PrivateFileService,
    private readonly audit: AuditService
  ) {}

  async generatePendingFeesXlsx(
    actor: SessionActor,
    input: CreatePendingFeeExportInput
  ): Promise<{ fileId: string; fileName: string; buffer: Buffer }> {
    if (!actor.schoolId) {
      throw new BadRequestException('School context is required');
    }
    const schoolId = actor.schoolId;

    // 1. Query full pending list (limit = 10000 to cover whole school cohort)
    const report = await this.pendingService.getPendingReport(schoolId, {
      feeMonth: input.feeMonth,
      classId: input.classId,
      search: input.search,
      page: 1,
      limit: 10000,
    });

    // 2. Build rows with safe projection (NO sensitive PII)
    const rows: (string | number)[][] = report.items.map((item) => [
      item.studentCode,
      item.studentName,
      item.className,
      item.sectionName || '-',
      item.feeMonth,
      item.baseAmount,
      item.concessionAmount,
      item.netDue,
      item.paidAmount,
      item.balance,
      item.status === 'GENERATED_PENDING'
        ? 'Pending'
        : item.status === 'PAID'
        ? 'Paid'
        : 'Due Not Generated',
    ]);

    const sheetName = `Pending Fees ${input.feeMonth}`;
    const buffer = buildXlsx(sheetName, HEADERS, rows);
    const fileName = `pending-fees-${input.feeMonth}.xlsx`;

    // 3. Store in private object storage
    const fileRecord = await this.fileService.storeGenerated({
      schoolId,
      fileType: 'REPORT_XLSX',
      buffer,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      createdBy: actor.userId,
    });

    // 4. Audit
    await this.audit.append({
      requestId: actor.requestId,
      schoolId,
      actorType: actor.userType,
      actorId: actor.userId,
      eventType: 'FEE_EXPORT_GENERATED',
      targetType: 'SchoolFile',
      targetId: fileRecord.id,
      metadata: {
        feeMonth: input.feeMonth,
        classId: input.classId,
        rowCount: rows.length,
        fileId: fileRecord.id,
      },
    });

    return {
      fileId: fileRecord.id,
      fileName,
      buffer,
    };
  }
}
