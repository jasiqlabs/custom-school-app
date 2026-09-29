import { PrismaClient, EntityStatus, FeeDueStatus, Prisma } from '@prisma/client';
import { ConcessionCalculator } from '../domain/concession-calculator';

const prisma = new PrismaClient();

async function backfillMissingDues() {
  console.log('--- Multi-Tenant Fee Due Backfill Started ---');

  const schools = await prisma.school.findMany({
    where: { status: EntityStatus.ACTIVE },
  });

  let totalCreated = 0;
  let totalExisting = 0;

  for (const school of schools) {
    console.log(`Checking school: ${school.name} (${school.id})...`);

    // Fetch active fee configs for this school
    const configs = await prisma.classFeeConfig.findMany({
      where: {
        schoolId: school.id,
        status: EntityStatus.ACTIVE,
      },
      include: {
        class: true,
      },
    });

    if (configs.length === 0) {
      console.log(`  No active fee configs found for ${school.name}.`);
      continue;
    }

    for (const config of configs) {
      const { classId, effectiveMonth, amount } = config;
      const baseAmount = Number(amount);

      // Find all active enrollments for this class
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          schoolId: school.id,
          classId,
          status: 'ACTIVE',
          student: { status: EntityStatus.ACTIVE },
        },
        include: {
          student: true,
          class: true,
        },
      });

      for (const enrollment of enrollments) {
        const student = enrollment.student;

        // Check if due already exists for this school, student, and effectiveMonth
        const existingDue = await prisma.feeDue.findUnique({
          where: {
            schoolId_studentId_feeMonth: {
              schoolId: school.id,
              studentId: student.id,
              feeMonth: effectiveMonth,
            },
          },
        });

        if (existingDue) {
          totalExisting++;
          continue;
        }

        // Calculate concession
        const concession = ConcessionCalculator.calculate(
          baseAmount,
          student.concessionType as any,
          Number(student.concessionValue)
        );

        const netDue = concession.netDue;
        const status = netDue === 0 ? FeeDueStatus.PAID : FeeDueStatus.UNPAID;

        try {
          await prisma.feeDue.create({
            data: {
              schoolId: school.id,
              studentId: student.id,
              classId,
              feeConfigId: config.id,
              feeMonth: effectiveMonth,
              baseAmount: new Prisma.Decimal(concession.baseAmount),
              concessionTypeSnapshot: concession.concessionType as any,
              concessionValueSnapshot: new Prisma.Decimal(concession.concessionValue),
              concessionAmount: new Prisma.Decimal(concession.concessionAmount),
              netDue: new Prisma.Decimal(netDue),
              paidAmount: new Prisma.Decimal(0),
              balance: new Prisma.Decimal(netDue),
              status,
            },
          });

          totalCreated++;
          console.log(
            `  [CREATED] School: ${school.name} | Student: ${student.studentCode} (${student.fullName}) | Class: ${enrollment.class.name} | Month: ${effectiveMonth} | Net Due: ₹${netDue}`
          );
        } catch (err: any) {
          if (err.code === 'P2002') {
            totalExisting++;
          } else {
            console.error(`  [ERROR] Failed for student ${student.studentCode}:`, err);
          }
        }
      }
    }
  }

  console.log('--- Backfill Complete ---');
  console.log(`Total new dues created: ${totalCreated}`);
  console.log(`Total existing dues preserved: ${totalExisting}`);
}

backfillMissingDues()
  .catch((err) => {
    console.error('Backfill script error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
