import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class StudentIdentifierAllocator {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  async suggestNextCode(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const seqRecord = await this.prisma.studentIdSequence.findUnique({
      where: { schoolId }
    });
    let nextVal = (seqRecord?.lastValue ?? 0) + 1;

    while (true) {
      const candidate = `STU-${year}-${String(nextVal).padStart(4, '0')}`;
      const normalized = this.normalizeCode(candidate);
      const existing = await this.prisma.student.findUnique({
        where: { schoolId_normalizedCode: { schoolId, normalizedCode: normalized } },
        select: { id: true }
      });
      if (!existing) {
        return candidate;
      }
      nextVal++;
    }
  }

  async allocateAutoCode(tx: Prisma.TransactionClient, schoolId: string): Promise<string> {
    const year = new Date().getFullYear();

    while (true) {
      const rows = await tx.$queryRaw<Array<{ last_value: number }>>`
        INSERT INTO student_id_sequences (school_id, last_value)
        VALUES (${schoolId}, 1)
        ON CONFLICT (school_id)
        DO UPDATE SET last_value = student_id_sequences.last_value + 1
        RETURNING last_value
      `;
      const val = rows[0]?.last_value ?? 1;
      const candidate = `STU-${year}-${String(val).padStart(4, '0')}`;
      const normalized = this.normalizeCode(candidate);

      const existing = await tx.student.findUnique({
        where: { schoolId_normalizedCode: { schoolId, normalizedCode: normalized } },
        select: { id: true }
      });

      if (!existing) {
        return candidate;
      }
    }
  }
}
