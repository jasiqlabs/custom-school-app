import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Serialize academic enrollment mutations against school-year prepare/process/finalize.
 * Lock the school BEFORE the student to avoid reversed-order deadlocks with finalize.
 * Fee collection and read-only requests do not acquire the school-wide lock.
 */
export async function assertEnrollmentChangesAllowed(
  tx: Prisma.TransactionClient, schoolId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM schools WHERE id = ${schoolId}::uuid FOR UPDATE
  `;
  if (!rows.length) throw new ConflictException('School is no longer available.');
  const transition = await tx.yearTransition.findFirst({
    where: { schoolId, status: { in: ['PREPARED', 'CLOSING'] } },
    select: { id: true },
  });
  if (transition) {
    throw new ConflictException(
      'Academic year transition is in progress. Complete the year transition before changing student enrollment.',
    );
  }
}
