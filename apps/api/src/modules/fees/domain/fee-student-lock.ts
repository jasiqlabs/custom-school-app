import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * One lock ordering boundary for all per-student fee mutations and document clearance.
 * Uses the pre-existing student row, so no new table or destructive migration is required.
 */
export async function lockStudentForFees(
  tx: Prisma.TransactionClient,
  schoolId: string,
  studentId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM students
    WHERE school_id = ${schoolId}::uuid AND id = ${studentId}::uuid
    FOR UPDATE
  `;
  if (!rows.length) throw new NotFoundException('Student not found in school');
}
