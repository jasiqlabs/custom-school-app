import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export type SchoolSeriesPolicy = 'LEGACY' | 'CONTINUOUS' | 'ACADEMIC_YEAR' | 'FINANCIAL_YEAR';
function parts() {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  return { year: Number(fields.find(x => x.type === 'year')?.value),
    month: Number(fields.find(x => x.type === 'month')?.value) };
}
export async function allocateConfiguredNumber(tx: Prisma.TransactionClient, options: {
  schoolId: string; kind: 'RECEIPT' | 'STUDENT'; policy: SchoolSeriesPolicy; prefix: string;
  width?: number;
}): Promise<string> {
  const { schoolId, kind, policy, prefix } = options;
  if (policy === 'LEGACY') throw new ConflictException('Use existing legacy sequence for LEGACY mode');
  const {year, month} = parts();
  let periodKey = 'ALL';
  if (policy === 'FINANCIAL_YEAR') {
    const start = month >= 4 ? year : year - 1;
    periodKey = `${start}-${String((start + 1) % 100).padStart(2,'0')}`;
  } else if (policy === 'ACADEMIC_YEAR') {
    const current = await tx.academicSession.findFirst({
      where: { schoolId, status: 'ACTIVE' }, select: { code: true },
    });
    if (!current) throw new ConflictException('Activate an academic year before using academic-year numbering');
    periodKey = current.code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
    if (!periodKey) throw new ConflictException('Academic year code cannot be used in numbering');
  }
  const rows = await tx.$queryRaw<Array<{ last_value: number }>>`
    INSERT INTO school_number_series(school_id,kind,period_key,last_value)
    VALUES (${schoolId}::uuid,${kind},${periodKey},1)
    ON CONFLICT(school_id,kind,period_key)
    DO UPDATE SET last_value=school_number_series.last_value+1
    RETURNING last_value
  `;
  const seq = rows[0]?.last_value || 1;
  return `${prefix}-${periodKey === 'ALL' ? '' : periodKey + '-'}${String(seq).padStart(options.width || 5,'0')}`;
}
