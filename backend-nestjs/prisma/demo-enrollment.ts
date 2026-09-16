import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, user_role_enum } from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

const DEMO_PREFIX = 'DEMO-ENROLLMENT-';
const DEMO_SYSTEM_ID = `${DEMO_PREFIX}REGISTRAR`;
const DEMO_PROGRAM_CODE = 'DEMO-ENROLLMENT';
const DEMO_BATCH_NAME = 'DEMO Enrollment Batch';
const DEMO_PASSWORD = 'Demo@1234!';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not defined.');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDemo() {
  const demoBatch = await prisma.batch.findFirst({
    where: { batch_name: DEMO_BATCH_NAME },
    select: { id: true },
  });
  const demoInventory = await prisma.inventory.findMany({
    where: { item_name: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const demoUsers = await prisma.users.findMany({
    where: { system_id: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  const demoTrainees = demoUsers.length
    ? await prisma.trainee.findMany({
        where: { users_id: { in: demoUsers.map(({ id }) => id) } },
        select: { id: true },
      })
    : [];
  const traineeIds = demoTrainees.map(({ id }) => id);
  const enrollmentIds = demoBatch
    ? (await prisma.enrollments.findMany({ where: { batch_id: demoBatch.id }, select: { id: true } })).map(({ id }) => id)
    : [];
  const receiptIds = enrollmentIds.length
    ? (await prisma.official_receipts.findMany({ where: { enrollment_id: { in: enrollmentIds } }, select: { id: true } })).map(({ id }) => id)
    : [];
  const inventoryIds = demoInventory.map(({ id }) => id);

  await prisma.$transaction(async (tx) => {
    if (receiptIds.length) {
      await tx.insurance_coverage.deleteMany({ where: { official_receipt_id: { in: receiptIds } } });
    }
    if (enrollmentIds.length) {
      await tx.official_receipts.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await tx.requirement_checklist.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await tx.distribution_checklist.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
      await tx.enrollments.deleteMany({ where: { id: { in: enrollmentIds } } });
    }
    if (inventoryIds.length) {
      await tx.distribution_checklist.updateMany({
        where: { inventory_id: { in: inventoryIds } },
        data: { inventory_id: null },
      });
      await tx.inventory.deleteMany({ where: { id: { in: inventoryIds } } });
    }
    if (traineeIds.length) {
      await tx.trainee.deleteMany({ where: { id: { in: traineeIds } } });
    }
    await tx.program_schedule.deleteMany({ where: { programs: { program_code: DEMO_PROGRAM_CODE } } });
    await tx.batch.deleteMany({ where: { batch_name: DEMO_BATCH_NAME } });
    await tx.programs.deleteMany({ where: { program_code: DEMO_PROGRAM_CODE } });
    await tx.trainer.deleteMany({ where: { users: { system_id: `${DEMO_PREFIX}TRAINER` } } });
    await tx.users.deleteMany({ where: { system_id: { startsWith: DEMO_PREFIX } } });
  });

  console.log('Temporary enrollment demo data removed. Existing records were not targeted.');
}

async function seedDemo() {
  await cleanDemo();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const registrar = await prisma.users.create({
    data: {
      system_id: DEMO_SYSTEM_ID,
      first_name: 'Demo',
      middle_name: '',
      last_name: 'Registrar',
      password_hash: passwordHash,
      role: user_role_enum.REGISTRAR,
    },
  });
  const trainerUser = await prisma.users.create({
    data: {
      system_id: `${DEMO_PREFIX}TRAINER`,
      first_name: 'Demo',
      middle_name: '',
      last_name: 'Trainer',
      password_hash: passwordHash,
      role: user_role_enum.TRAINER,
    },
  });
  const trainer = await prisma.trainer.create({
    data: {
      user_id: trainerUser.id,
      gender: 'OTHER',
      complete_address: 'Demo address',
      highest_education: 'COLLEGE',
      date_of_birth: new Date('1990-01-01'),
      contact_number: '09170000001',
    },
  });
  const program = await prisma.programs.create({
    data: {
      name: 'Demo Enrollment Program',
      program_code: DEMO_PROGRAM_CODE,
      description: 'Temporary data for testing enrollment.',
      is_accredited: false,
      total_training_hours: 120,
      approx_months: '3',
      control_number_prefix: 'DEMO',
      created_by: registrar.id,
      updated_by: registrar.id,
    },
  });
  await prisma.program_schedule.create({
    data: {
      program_id: program.id,
      schedule_name: 'Demo weekday schedule',
      days: ['MON', 'WED', 'FRI'],
      start_time: new Date('1970-01-01T08:00:00Z'),
      end_time: new Date('1970-01-01T17:00:00Z'),
    },
  });
  const batch = await prisma.batch.create({
    data: {
      program_id: program.id,
      trainer_id: trainer.id,
      created_by: registrar.id,
      batch_name: DEMO_BATCH_NAME,
      capacity: 5,
      start_date: new Date('2027-01-04'),
      end_date: new Date('2027-03-31'),
      batch_status: 'OPEN',
    },
  });
  for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const) {
    await prisma.inventory.create({
      data: {
        program_id: program.id,
        item_name: `${DEMO_PREFIX}Uniform ${size}`,
        sizes: size,
        quantity: 5,
        updated_by: registrar.id,
      },
    });
  }
  const traineeUser = await prisma.users.create({
    data: {
      system_id: `${DEMO_PREFIX}TRAINEE`,
      first_name: 'Demo',
      middle_name: 'Existing',
      last_name: 'Trainee',
      password_hash: passwordHash,
      role: user_role_enum.TRAINEE,
    },
  });
  await prisma.trainee.create({
    data: {
      users_id: traineeUser.id,
      contact_number: '09170000002',
      street_address: 'Demo street',
      barangay: 'Demo barangay',
      municipality: 'Demo municipality',
      district: 'Demo district',
      province: 'Demo province',
      gender: 'OTHER',
      date_of_birth: new Date('2000-01-01'),
      place_of_birth: 'Demo municipality',
      citizenship: 'FILIPINO',
      mother_name: 'Demo Mother',
      father_name: 'Demo Father',
      civil_status: 'SINGLE',
      highest_education: 'COLLEGE',
      pwd: false,
      employment_status: 'NA',
      employment_type: 'NA',
    },
  });

  console.log('Temporary enrollment demo data created.');
  console.log(`Login system ID: ${DEMO_SYSTEM_ID}`);
  console.log(`Login password : ${DEMO_PASSWORD}`);
  console.log(`Batch          : ${batch.batch_name}`);
  console.log('Cleanup        : npm run demo:enrollment:clean');
}

const clean = process.argv.includes('--clean');
(clean ? cleanDemo() : seedDemo())
  .catch((error) => {
    console.error('Enrollment demo failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });