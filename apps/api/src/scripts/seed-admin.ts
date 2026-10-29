import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

/**
 * Create the explicitly configured initial platform administrator only.
 * Safe to run at every deployment: existing accounts are never modified.
 * Password changes and account reactivation must use an explicit admin flow.
 */
async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Platform admin seed skipped: set both PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD for first-time provisioning.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.platformUser.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      console.log('Platform admin already exists: seed skipped without changing credentials, status, or sessions.');
      return;
    }

    if (password.length < 12) {
      throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 12 characters for initial provisioning');
    }

    const hash = await argon2.hash(password, { type: argon2.argon2id });
    try {
      await prisma.platformUser.create({
        data: {
          email,
          fullName: 'Platform Administrator',
          passwordHash: hash,
          status: 'ACTIVE',
        },
      });
      console.log('Initial platform administrator created.');
    } catch (error) {
      // Concurrent first-time deploy: another process may have created the same account.
      // Treat only a unique-key conflict as an idempotent no-op.
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        console.log('Platform admin already created by another process; no existing account changed.');
        return;
      }
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error('Platform administrator provisioning failed:', error);
  process.exitCode = 1;
});
