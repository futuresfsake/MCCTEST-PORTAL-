"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../src/generated/prisma/client");
const DEMO_PROGRAM_PREFIX = 'DEMO - ';
const DEMO_TRAINER_PREFIX = 'DEMO-TRAINER-';
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const programs = await prisma.programs.findMany({
        where: { name: { startsWith: DEMO_PROGRAM_PREFIX } },
        select: { id: true },
    });
    if (programs.length === 0) {
        console.log('No demo enrollment data found.');
        return;
    }
    const programIds = programs.map(({ id }) => id);
    const batches = await prisma.batch.findMany({
        where: { program_id: { in: programIds } },
        select: { id: true },
    });
    const batchIds = batches.map(({ id }) => id);
    if (batchIds.length > 0) {
        await prisma.attendance.deleteMany({ where: { training_session: { batch_id: { in: batchIds } } } });
        await prisma.training_session.deleteMany({ where: { batch_id: { in: batchIds } } });
        await prisma.enrollments.deleteMany({ where: { batch_id: { in: batchIds } } });
        await prisma.batch_student_seq.deleteMany({ where: { batch_id: { in: batchIds } } });
        await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
    }
    await prisma.batch_seq.deleteMany({ where: { program_id: { in: programIds } } });
    await prisma.ctrl_num_seq.deleteMany({ where: { program_id: { in: programIds } } });
    await prisma.inventory.deleteMany({ where: { program_id: { in: programIds } } });
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
    console.log('Demo enrollment data removed.');
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
//# sourceMappingURL=demo-clean.js.map