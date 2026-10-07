import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

async function main() {
  const email = (process.env.PLATFORM_ADMIN_EMAIL || 'admin@example.com').trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || 'AdminPassword123!';
  if (password.length < 12) throw new Error('Password must be at least 12 characters');

  const prisma = new PrismaClient();
  try {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const targets = Array.from(new Set([email, 'admin@example.com', 'admin@platform.local']));

    for (const adminEmail of targets) {
      await prisma.platformUser.upsert({
        where: { email: adminEmail },
        create: {
          email: adminEmail,
          fullName: 'Platform Administrator',
          passwordHash: hash,
          status: 'ACTIVE',
        },
        update: {
          passwordHash: hash,
          status: 'ACTIVE',
          accountVersion: { increment: 1 },
          failedCount: 0,
          lockedUntil: null,
        },
      });
      console.log(`Platform admin seed/update completed for: ${adminEmail}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
