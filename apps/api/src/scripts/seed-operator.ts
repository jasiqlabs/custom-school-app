import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const schoolName = 'Greenfield Public School';
    const normalizedName = schoolName.toLowerCase();
    const operatorEmail = (process.env.OPERATOR_EMAIL || 'operator@example.com').trim().toLowerCase();
    const operatorPassword = process.env.OPERATOR_PASSWORD || 'OperatorPassword123!';

    let school = await prisma.school.findFirst({ where: { normalizedName } });
    if (!school) {
      school = await prisma.school.create({
        data: {
          id: (await import('crypto')).randomUUID(),
          name: schoolName,
          normalizedName,
          status: 'ACTIVE',
          address: '123 Education Lane, Springfield',
          phone: '+1-555-0199',
          email: 'admin@greenfield.edu',
        },
      });
      console.log(`Created active school: ${school.name} (${school.id})`);
    } else {
      school = await prisma.school.update({
        where: { id: school.id },
        data: { status: 'ACTIVE' },
      });
      console.log(`Updated active school: ${school.name} (${school.id})`);
    }

    const hash = await argon2.hash(operatorPassword, { type: argon2.argon2id });
    await prisma.schoolOperator.upsert({
      where: { email: operatorEmail },
      create: {
        schoolId: school.id,
        email: operatorEmail,
        fullName: 'Default School Operator',
        passwordHash: hash,
        status: 'ACTIVE',
      },
      update: {
        schoolId: school.id,
        passwordHash: hash,
        status: 'ACTIVE',
        failedCount: 0,
        lockedUntil: null,
      },
    });
    console.log(`Operator seed completed for: ${operatorEmail}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
