import { allocateConfiguredNumber, type SchoolSeriesPolicy } from '../../../common/numbering/school-numbering';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReceiptNumberAllocator {
  async allocateReceiptNumber(tx: Prisma.TransactionClient, schoolId: string): Promise<string> {
    const policy = await tx.school.findUnique({ where: { id: schoolId },
      select: { receiptNumberPolicy: true, receiptNumberPrefix: true } });
    if (policy?.receiptNumberPolicy && policy.receiptNumberPolicy !== 'LEGACY') {
      for (;;) {
        const candidate = await allocateConfiguredNumber(tx, { schoolId, kind: 'RECEIPT',
          policy: policy.receiptNumberPolicy as SchoolSeriesPolicy,
          prefix: policy.receiptNumberPrefix });
        const taken = await tx.feePayment.findUnique({
          where: { schoolId_receiptNumber: { schoolId, receiptNumber: candidate } }, select: { id: true },
        });
        if (!taken) return candidate;
      }
    }
    const year = new Date().getFullYear();

    while (true) {
      const rows = await tx.$queryRaw<Array<{ last_value: number }>>`
        INSERT INTO receipt_sequences (school_id, last_value, updated_at)
        VALUES (${schoolId}, 1, now())
        ON CONFLICT (school_id)
        DO UPDATE SET last_value = receipt_sequences.last_value + 1, updated_at = now()
        RETURNING last_value
      `;
      const val = rows[0]?.last_value ?? 1;
      const candidate = `REC-${year}-${String(val).padStart(5, '0')}`;

      const existing = await tx.feePayment.findUnique({
        where: { schoolId_receiptNumber: { schoolId, receiptNumber: candidate } },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }
  }
}
