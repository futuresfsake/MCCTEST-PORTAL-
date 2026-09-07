/**
 * Seed: creates the first ADMIN user.
 *
 * system_id format: MCCTP-YY-SEQ  (e.g. MCCTP-26-001 for 2026)
 *
 * Run with:  npx prisma db seed
 * Or:        npx ts-node --project tsconfig.json prisma/seed.ts
 */

import 'dotenv/config'; // 1. Load environment variables first
import { Pool } from 'pg'; // 2. Import Pool from the pg driver
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, user_role_enum } from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

// 3. Initialize the pool and adapter correctly
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const SALT_ROUNDS = 12;

  const yy = String(new Date().getFullYear()).slice(-2);

  /*
   * ============================================================
   * ADMIN — MCCTP-26-001
   * ============================================================
   */

  const adminSystemId = `MCCTP-${yy}-001`;

  const existingAdmin = await prisma.users.findUnique({
    where: { system_id: adminSystemId },
  });

  if (existingAdmin) {
    console.log(`Admin account already exists: ${adminSystemId}`);
  } else {
    const rawAdminPassword =
      process.env.ADMIN_SEED_PASSWORD ?? 'Admin@1234!';

    const adminPasswordHash = await bcrypt.hash(
      rawAdminPassword,
      SALT_ROUNDS,
    );

    const admin = await prisma.users.create({
      data: {
        system_id: adminSystemId,
        first_name: 'System',
        last_name: 'Admin',
        middle_name: '',
        role: user_role_enum.ADMIN,
        password_hash: adminPasswordHash,
        is_active: true,
      },
    });

    console.log('Admin account seeded:');
    console.log(`   system_id : ${admin.system_id}`);
    console.log(`   password  : ${rawAdminPassword}`);
    console.log(`   role      : ${admin.role}`);
  }

  /*
   * ============================================================
   * REGISTRAR — MCCTP-26-002
   * ============================================================
   */

  const registrarSystemId = `MCCTP-${yy}-002`;

  const existingRegistrar = await prisma.users.findUnique({
    where: { system_id: registrarSystemId },
  });

  if (existingRegistrar) {
    console.log(
      `Registrar account already exists: ${registrarSystemId}`,
    );
  } else {
    const rawRegistrarPassword =
      process.env.REGISTRAR_SEED_PASSWORD ?? 'Registrar@1234!';

    const registrarPasswordHash = await bcrypt.hash(
      rawRegistrarPassword,
      SALT_ROUNDS,
    );

    const registrar = await prisma.users.create({
      data: {
        system_id: registrarSystemId,
        first_name: 'System',
        last_name: 'Registrar',
        middle_name: '',
        role: user_role_enum.REGISTRAR,
        password_hash: registrarPasswordHash,
        is_active: true,
      },
    });

    console.log('Registrar account seeded:');
    console.log(`   system_id : ${registrar.system_id}`);
    console.log(`   password  : ${rawRegistrarPassword}`);
    console.log(`   role      : ${registrar.role}`);
  }

  console.log('\nSeed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // 4. Important: Close the pg pool gracefully so the script can exit
    await pool.end();
  });