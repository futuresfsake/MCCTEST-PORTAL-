import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DEMO_PROGRAM_PREFIX = 'DEMO -';
const DEMO_TRAINER_PREFIX = 'DEMO-TRAINER-';
const DEMO_TRAINEE_PREFIX = 'DEMO-TRAINEE-';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const programs = await prisma.programs.findMany({
    where: { name: { startsWith: DEMO_PROGRAM_PREFIX } },
    select: { id: true },
  });

  if (programs.length === 0) {
    console.log('No demo data found.');
    return;
  }

  const programIds = programs.map(({ id }) => id);
  const batches = await prisma.batch.findMany({
    where: { program_id: { in: programIds } },
    select: { id: true },
  });
  const batchIds = batches.map(({ id }) => id);

  if (batchIds.length > 0) {
    const enrollments = await prisma.enrollments.findMany({
      where: { batch_id: { in: batchIds } },
      select: { id: true, trainee_id: true },
    });
    const enrollmentIds = enrollments.map(({ id }) => id);
    const traineeIds = [...new Set(enrollments.map(({ trainee_id }) => trainee_id))];

    if (enrollmentIds.length > 0) {
      const requestForms = await prisma.request_form.findMany({
        where: { enrollment_id: { in: enrollmentIds } },
        select: { id: true },
      });
      const requestFormIds = requestForms.map(({ id }) => id);
      const clearances = await prisma.clearance.findMany({
        where: { request_form_id: { in: requestFormIds } },
        select: { id: true },
      });
      const clearanceIds = clearances.map(({ id }) => id);

      await prisma.generated_certificate.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.clearance_certificate.deleteMany({ where: { clearance_id: { in: clearanceIds } } });
      await prisma.clearance_approval.deleteMany({ where: { clearance_id: { in: clearanceIds } } });
      await prisma.clearance.deleteMany({ where: { id: { in: clearanceIds } } });
      await prisma.request_form.deleteMany({ where: { id: { in: requestFormIds } } });
      await prisma.attendance.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.distribution_checklist.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.requirement_checklist.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.insurance_coverage.deleteMany({ where: { official_receipts: { enrollment_id: { in: enrollmentIds } } } });
      await prisma.official_receipts.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.trainee_outcome_status.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.withdrawal_request.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await prisma.enrollments.deleteMany({ where: { id: { in: enrollmentIds } } });
    }

    await prisma.training_session.deleteMany({ where: { batch_id: { in: batchIds } } });
    await prisma.batch_student_seq.deleteMany({ where: { batch_id: { in: batchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  }

  await prisma.batch_seq.deleteMany({ where: { program_id: { in: programIds } } });
  await prisma.ctrl_num_seq.deleteMany({ where: { program_id: { in: programIds } } });
  await prisma.learning_outcome.deleteMany({ where: { competency: { program_id: { in: programIds } } } });
  await prisma.competency.deleteMany({ where: { program_id: { in: programIds } } });
  await prisma.inventory.deleteMany({ where: { program_id: { in: programIds } } });
  await prisma.announcements.deleteMany({ where: { program_id: { in: programIds } } });
  await prisma.programs.deleteMany({ where: { id: { in: programIds } } });

  const trainerUsers = await prisma.users.findMany({
    where: { system_id: { startsWith: DEMO_TRAINER_PREFIX } },
    select: { id: true },
  });
  if (trainerUsers.length > 0) {
    const trainerIds = trainerUsers.map(({ id }) => id);
    await prisma.trainer.deleteMany({ where: { user_id: { in: trainerIds } } });
    await prisma.users.deleteMany({ where: { id: { in: trainerIds } } });
  }

  const traineeUsers = await prisma.users.findMany({
    where: { system_id: { startsWith: DEMO_TRAINEE_PREFIX } },
    select: { id: true },
  });
  if (traineeUsers.length > 0) {
    const traineeIds = traineeUsers.map(({ id }) => id);
    await prisma.trainee_beneficiaries.deleteMany({ where: { trainee_id: { in: traineeIds } } });
    await prisma.trainee.deleteMany({ where: { users_id: { in: traineeIds } } });
    await prisma.users.deleteMany({ where: { id: { in: traineeIds } } });
  }

  await prisma.certificates.deleteMany({ where: { template_name: { startsWith: 'COC -' } } });
  await prisma.sessions.deleteMany({ where: { session_token: { startsWith: 'demo-session-' } } });
  await prisma.announcements.deleteMany({ where: { content: { contains: 'Demo' } } });

  const roleIds = (
    await prisma.office_role.findMany({
      where: { role_name: { in: ['Registrar Office', 'Cashier Office', 'Guidance Office', 'Admin Office'] } },
      select: { office_role_id: true },
    })
  ).map(({ office_role_id }) => office_role_id);

  if (roleIds.length > 0) {
    await prisma.user_role.deleteMany({ where: { office_role_id: { in: roleIds } } });
  }

  console.log('All demo data removed.');
}

main()
  .catch((error) => {
    console.error('Demo cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
