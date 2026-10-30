import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../../platform/audit/audit.service';
import { lockStudentForFees } from '../domain/fee-student-lock';
import { buildXlsx, parseXlsx } from '../../students/application/xlsx.util';
import type { SessionActor } from '@custom-school/contracts';

const HEADERS = ['Student Code', 'Original Month YYYY-MM', 'Type DUE or EXTERNAL_PAID',
  'Amount INR', 'Original Receipt / Source Reference'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const MAX_ROWS = 5000;

@Injectable()
export class OpeningBalanceImportService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  template() {
    return buildXlsx('Opening Balances', HEADERS, [
      ['ST-001', '2026-04', 'DUE', 300, 'Old Register 4 / Page 12'],
      ['ST-001', '2026-03', 'EXTERNAL_PAID', 700, 'Original receipt 019'],
    ]);
  }

  async preview(actor: SessionActor, encoded: string, fileName: string, asOfDate: string) {
    const schoolId = actor.schoolId;
    if (!schoolId) throw new BadRequestException('School context required');
    if (!DATE.test(asOfDate) || !Number.isFinite(Date.parse(asOfDate + 'T00:00:00Z')))
      throw new BadRequestException('Valid as-of date is required');
    if (!/\.(csv|xlsx)$/i.test(fileName) || fileName.length > 255)
      throw new BadRequestException('Upload an XLSX or CSV file');
    if (!encoded || encoded.length > 14 * 1024 * 1024)
      throw new BadRequestException('Import file too large');
    const bytes = Buffer.from(encoded, 'base64');
    if (!bytes.length || bytes.length > 10 * 1024 * 1024)
      throw new BadRequestException('Import file too large');
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const asOf = new Date(asOfDate + 'T00:00:00Z');
    if (asOf.toISOString().slice(0, 10) !== asOfDate) throw new BadRequestException('Invalid as-of date');
    const already = await this.db.openingBalanceBatch.findUnique({
      where: { schoolId_checksum_asOfDate: { schoolId, checksum, asOfDate: asOf } },
    });
    if (already) return this.status(actor, already.id);

    let rows: string[][];
    if (fileName.toLowerCase().endsWith('.xlsx')) {
      try { rows = parseXlsx(bytes); }
      catch { throw new BadRequestException('Invalid XLSX workbook'); }
    } else {
      // CSV with quotes and double-quote escaping. Reject multiline cells and malformed quotes.
      let cell = ''; let row: string[] = []; let quoted = false; rows = [];
      const data = bytes.toString('utf8').replace(/^\uFEFF/, '');
      for (let i = 0; i < data.length; i++) {
        const ch = data[i];
        if (ch === '"') {
          if (quoted && data[i + 1] === '"') { cell += '"'; i++; }
          else quoted = !quoted;
        } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
        else if ((ch === '\n' || ch === '\r') && !quoted) {
          if (ch === '\r' && data[i + 1] === '\n') i++;
          row.push(cell); if (row.some(c => c.trim())) rows.push(row);
          row = []; cell = '';
        } else { cell += ch; }
      }
      if (quoted) throw new BadRequestException('CSV contains an unclosed quote');
      row.push(cell); if (row.some(c => c.trim())) rows.push(row);
    }
    if (!rows.length || rows.length < 2 || rows[0].length < HEADERS.length)
      throw new BadRequestException('Import needs a five-column header and at least one data row');
    const values = rows.slice(1);
    if (values.length > MAX_ROWS) throw new BadRequestException('Maximum 5,000 rows per import');
    const students = await this.db.student.findMany({
      where: { schoolId }, select: { id: true, studentCode: true },
    });
    const byCode = new Map(students.map(s => [s.studentCode.trim().toLocaleLowerCase('en-IN'), s.id]));
    const seen = new Set<string>();
    const prepared: Array<{
      rowNumber: number; studentId: string | null; studentCode: string; originMonth: string;
      kind: string; amount: Prisma.Decimal; externalRef: string;
      sourceKey: string; status: string; errorText: string | null;
    }> = [];
    for (let i = 0; i < values.length; i++) {
      const fields = values[i];
      const studentCode = String(fields[0] || '').trim();
      const month = String(fields[1] || '').trim();
      const kind = String(fields[2] || '').trim().toUpperCase();
      const rawAmount = String(fields[3] || '').trim();
      const externalRef = String(fields[4] || '').trim();
      const errs: string[] = [];
      const studentId = byCode.get(studentCode.toLocaleLowerCase('en-IN')) || null;
      if (!studentId) errs.push('Student code not found in this school');
      if (!MONTH.test(month) || month > asOfDate.slice(0, 7)) errs.push('Invalid/future original month');
      if (!['DUE', 'EXTERNAL_PAID'].includes(kind)) errs.push('Type must be DUE or EXTERNAL_PAID');
      let amount: Prisma.Decimal;
      try { amount = new Prisma.Decimal(rawAmount); }
      catch { amount = new Prisma.Decimal(0); errs.push('Invalid amount'); }
      if (!amount.isFinite() || amount.lte(0) || amount.decimalPlaces() > 2 || amount.gt(10000000))
        errs.push('Amount must be positive INR with at most two decimals');
      if (!externalRef || externalRef.length > 128) errs.push('Original source reference is required (max 128)');
      const sourceKey = 'OPENING:' + createHash('sha256').update(
        [studentId || studentCode, month, kind, externalRef].join('|'),
      ).digest('hex');
      if (seen.has(sourceKey)) errs.push('Duplicate obligation/reference in same workbook');
      seen.add(sourceKey);
      prepared.push({
        rowNumber: i + 2, studentId, studentCode: studentCode.slice(0, 64),
        originMonth: MONTH.test(month) ? month : '0000-01', kind: ['DUE','EXTERNAL_PAID'].includes(kind) ? kind : 'DUE',
        amount: amount.isFinite() && amount.gte(0) ? amount : new Prisma.Decimal(0),
        externalRef: externalRef.slice(0, 128), sourceKey, status: errs.length ? 'ERROR' : 'VALID',
        errorText: errs.length ? errs.join('; ') : null,
      });
    }
    const bad = prepared.filter(r => r.status === 'ERROR').length;
    const batch = await this.db.$transaction(async tx => {
      const b = await tx.openingBalanceBatch.create({ data: {
        schoolId, checksum, fileName, asOfDate: asOf, totalRows: prepared.length,
        validRows: prepared.length - bad, errorRows: bad, createdBy: actor.userId,
      } });
      // bounded, no personal contact details or original raw workbook retained
      for (let offset = 0; offset < prepared.length; offset += 250) {
        await tx.openingBalanceRow.createMany({
          data: prepared.slice(offset, offset + 250).map(r => ({ ...r, batchId: b.id })),
        });
      }
      return b;
    }, { timeout: 60000 });
    return this.status(actor, batch.id);
  }

  async status(actor: SessionActor, id: string, page = 1) {
    const schoolId = actor.schoolId;
    if (!schoolId) throw new BadRequestException('School context required');
    const batch = await this.db.openingBalanceBatch.findFirst({ where: { id, schoolId } });
    if (!batch) throw new NotFoundException('Opening balance import not found');
    const [remaining, processed, errors, items] = await Promise.all([
      this.db.openingBalanceRow.count({ where: { batchId: id, status: 'VALID' } }),
      this.db.openingBalanceRow.count({ where: { batchId: id, status: { in: ['IMPORTED', 'REFERENCED'] } } }),
      this.db.openingBalanceRow.count({ where: { batchId: id, status: 'ERROR' } }),
      this.db.openingBalanceRow.findMany({
        where: { batchId: id }, take: 50, skip: (Math.max(1, page)-1)*50, orderBy: { rowNumber: 'asc' },
        select: { rowNumber: true, studentCode: true, kind: true, originMonth: true,
          amount: true, externalRef: true, status: true, errorText: true },
      }),
    ]);
    return { id: batch.id, fileName: batch.fileName, asOfDate: batch.asOfDate.toISOString().slice(0,10),
      status: batch.status, totalRows: batch.totalRows, validRows: batch.validRows,
      errorRows: errors, importedRows: processed, remaining, page,
      items: items.map(r => ({ ...r, amount: r.amount.toFixed(2) })) };
  }

  async process(actor: SessionActor, batchId: string) {
    const schoolId = actor.schoolId;
    if (!schoolId) throw new BadRequestException('School context required');
    const current = await this.db.openingBalanceBatch.findFirst({ where: { id: batchId, schoolId } });
    if (!current) throw new NotFoundException('Opening balance batch not found');
    if (current.errorRows > 0) throw new ConflictException('Correct the preview errors before committing any rows');
    if (!['PREVIEW', 'IMPORTING', 'COMPLETED'].includes(current.status))
      throw new ConflictException('Import is not in a confirmable state');
    if (current.status === 'COMPLETED') return this.status(actor, batchId);
    await this.db.openingBalanceBatch.update({
      where: { id: batchId }, data: { status: 'IMPORTING' },
    });
    const next = await this.db.openingBalanceRow.findMany({
      where: { batchId, status: 'VALID' }, orderBy: { rowNumber: 'asc' }, take: 50,
    });
    for (const row of next) {
      if (!row.studentId) throw new ConflictException('Unmatched student row cannot import');
      await this.db.$transaction(async tx => {
        await lockStudentForFees(tx, schoolId, row.studentId!);
        const refreshed = await tx.openingBalanceRow.findUnique({ where: { id: row.id } });
        if (!refreshed || refreshed.status !== 'VALID') return;
        if (refreshed.kind === 'EXTERNAL_PAID') {
          // Preserve original payment proof without inventing app receipts/collection.
          await tx.openingBalanceRow.update({ where: { id: refreshed.id },
            data: { status: 'REFERENCED' } });
          return;
        }
        const category = await tx.feeCategory.upsert({
          where: { schoolId_code: { schoolId, code: 'OPENING_BALANCE' } },
          create: { schoolId, code: 'OPENING_BALANCE', displayName: 'Opening Outstanding Balance',
            chargeKind: 'MANUAL', status: 'ACTIVE' },
          update: {},
        });
        const charge = await tx.feeCharge.upsert({
          where: { schoolId_sourceKey: { schoolId, sourceKey: refreshed.sourceKey } },
          update: {},
          create: {
            schoolId, studentId: row.studentId!, categoryId: category.id,
            sourceKey: refreshed.sourceKey, originRef: refreshed.originMonth,
            description: 'Historical outstanding balance — ' + refreshed.externalRef.slice(0, 170),
            baseAmount: refreshed.amount, netAmount: refreshed.amount,
            balance: refreshed.amount, paidAmount: new Prisma.Decimal(0), status: 'UNPAID',
          },
        });
        if (charge.studentId !== row.studentId) throw new ConflictException('Opening balance source key reused for another student');
        await tx.openingBalanceRow.update({ where: { id: refreshed.id },
          data: { status: 'IMPORTED', chargeId: charge.id } });
      }, { maxWait: 10000, timeout: 30000 });
    }
    const rest = await this.db.openingBalanceRow.count({ where: { batchId, status: 'VALID' } });
    if (rest === 0) {
      await this.db.openingBalanceBatch.update({ where: { id: batchId }, data: { status: 'COMPLETED' } });
      await this.audit.append({ requestId: actor.requestId, schoolId, actorType: actor.userType,
        actorId: actor.userId, eventType: 'OPENING_BALANCES_IMPORTED', targetType: 'OpeningBalanceBatch',
        targetId: batchId, metadata: { rowCount: current.totalRows } });
    }
    return this.status(actor, batchId);
  }
}
