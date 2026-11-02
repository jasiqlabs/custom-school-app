import 'dotenv/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

/**
 * Explicit, create-only local development fixture.
 * NEVER run as a production predeploy seed or reset real operator credentials.
 */
async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEV_OPERATOR_SEED !== 'true') {
    throw new Error('Development operator seed is disabled. Opt in only on a disposable local database.');
  }
  const email = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
  const password = process.env.OPERATOR_PASSWORD;
  const schoolName = process.env.DEV_SEED_SCHOOL_NAME?.trim() || 'Greenfield Public School';
  if (!email || !password || password.length < 12) {
    throw new Error('Set OPERATOR_EMAIL and OPERATOR_PASSWORD (at least 12 characters) for the disposable test database.');
  }
  const prisma = new PrismaClient();
  try {
    const normalizedName = schoolName.toLowerCase();
    let school = await prisma.school.findFirst({ where: { normalizedName } });
    if (!school) {
      school = await prisma.school.create({
        data: {
          id: randomUUID(),
          name: schoolName,
          normalizedName,
          status: 'ACTIVE',
        },
      });
    } else if (school.status !== 'ACTIVE') {
      throw new Error('The named school exists but is not active. Refusing to change school status.');
    }

    const existing = await prisma.schoolOperator.findUnique({
      where: { email }, select: { id: true },
    });
    if (existing) {
      console.log(JSON.stringify({ level: 'info', event: 'dev_operator_seed.skipped_existing' }));
      return;
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    try {
      await prisma.schoolOperator.create({
        data: {
          schoolId: school.id,
          email,
          fullName: 'Local Test Operator',
          passwordHash,
          status: 'ACTIVE',
        },
      });
      console.log(JSON.stringify({ level: 'info', event: 'dev_operator_seed.created' }));
    } catch (error: any) {
      if (error?.code === 'P2002') {
        console.log(JSON.stringify({ level: 'info', event: 'dev_operator_seed.concurrent_existing' }));
        return;
      }
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(JSON.stringify({
    level: 'error', event: 'dev_operator_seed.failed',
    errorClass: error instanceof Error ? error.name : 'Unknown',
  }));
  process.exitCode = 1;
});
