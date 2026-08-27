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

  const yy = String(new Date().getFullYear()).slice(-2); // '26' for 2026
  const systemId = `MCCTP-${yy}-001`;

  const existing = await prisma.users.findUnique({ where: { system_id: systemId } });

  if (existing) {
    console.log(`Admin account already exists: ${systemId} — skipping seed.`);
    return;
  }

  const rawPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin@1234!';
  const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

  const admin = await prisma.users.create({
    data: {
      system_id: systemId,
      first_name: 'System',
      last_name: 'Admin',
      middle_name: '',
      role: user_role_enum.ADMIN,
      password_hash: passwordHash,
      is_active: true,
    },
  });

  console.log('Admin account seeded:');
  console.log(`   system_id : ${admin.system_id}`);
  console.log(`   password  : ${rawPassword}`);
  console.log(`   role      : ${admin.role}`);
  console.log('\nChange the password immediately after first login!');
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