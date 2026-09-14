"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../src/generated/prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const DEMO_PREFIX = 'DEMO-ENROLLMENT';
const DEMO_PROGRAMS = [
    { name: 'DEMO - AutoCAD', code: 'AUTOCAD', idCardPrefix: 'DAUTOCAD', hours: 206, accredited: false, topic: 'technical drawing and AutoCAD' },
    { name: 'DEMO - Computer Systems Servicing', code: 'CSS', idCardPrefix: 'DCSS', hours: 264, accredited: false, topic: 'computer systems servicing' },
    { name: 'DEMO - Bread and Pastry Production', code: 'BPP', idCardPrefix: 'DBPP', hours: 216, accredited: false, topic: 'bread and pastry production' },
    { name: 'DEMO - Dressmaking', code: 'DRESS', idCardPrefix: 'DDRESS', hours: 206, accredited: false, topic: 'dressmaking and garment construction' },
    { name: 'DEMO - Agricultural Crops Production', code: 'AGRI', idCardPrefix: 'DAGRI', hours: 240, accredited: false, topic: 'agricultural crops production' },
    { name: 'DEMO - Shielded Metal Arc Welding', code: 'SMAW', idCardPrefix: 'DSMAW', hours: 264, accredited: false, topic: 'shielded metal arc welding' },
    { name: 'DEMO - Electrical Installation and Maintenance', code: 'EIM', idCardPrefix: 'DEIM', hours: 264, accredited: true, topic: 'electrical installation and maintenance' },
];
const DEMO_SHIFTS = [
    { label: 'Morning', time: '8:00 AM - 12:00 PM' },
    { label: 'Afternoon', time: '1:00 PM - 5:00 PM' },
    { label: 'Evening', time: '5:30 PM - 9:30 PM' },
];
const connectionString = process.env.DATABASE_URL;
if (!connectionString)
    throw new Error('DATABASE_URL is not defined in the environment variables');
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
function dateOnly(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day));
}
function timeOnly(hour, minute) {
    return new Date(Date.UTC(1970, 0, 1, hour, minute));
}
async function main() {
    const registrar = await prisma.users.findFirst({
        where: { role: client_1.user_role_enum.REGISTRAR, is_active: true },
        orderBy: { created_at: 'asc' },
    });
    if (!registrar)
        throw new Error('Run the base seed first so an active registrar exists.');
    const trainerPassword = await bcrypt.hash('DemoTrainer@1234!', 12);
    const seededPrograms = [];
    const seededBatches = [];
    for (const [programIndex, demoProgram] of DEMO_PROGRAMS.entries()) {
        const trainerSystemId = `DEMO-TRAINER-${String(programIndex + 1).padStart(3, '0')}`;
        const trainerUser = await prisma.users.upsert({
            where: { system_id: trainerSystemId },
            update: {
                first_name: 'Demo',
                last_name: `${demoProgram.code} Trainer`,
                middle_name: '',
                role: client_1.user_role_enum.TRAINER,
                is_active: true,
            },
            create: {
                system_id: trainerSystemId,
                first_name: 'Demo',
                last_name: `${demoProgram.code} Trainer`,
                middle_name: '',
                password_hash: trainerPassword,
                role: client_1.user_role_enum.TRAINER,
                is_active: true,
            },
        });
        const trainer = await prisma.trainer.upsert({
            where: { user_id: trainerUser.id },
            update: {
                gender: programIndex % 2 === 0 ? client_1.gender_enum.MALE : client_1.gender_enum.FEMALE,
                complete_address: 'Demo Training Center, Main Campus',
                highest_education: client_1.highest_education_enum.COLLEGE,
                date_of_birth: dateOnly(1985 + programIndex, 2 + programIndex, 10 + programIndex),
                contact_number: `0917000000${String(programIndex + 1)}`,
            },
            create: {
                user_id: trainerUser.id,
                gender: programIndex % 2 === 0 ? client_1.gender_enum.MALE : client_1.gender_enum.FEMALE,
                complete_address: 'Demo Training Center, Main Campus',
                highest_education: client_1.highest_education_enum.COLLEGE,
                date_of_birth: dateOnly(1985 + programIndex, 2 + programIndex, 10 + programIndex),
                contact_number: `0917000000${String(programIndex + 1)}`,
            },
        });
        const program = await prisma.programs.upsert({
            where: { name: demoProgram.name },
            update: {
                is_active: true,
                is_accredited: demoProgram.accredited,
                schedule: [client_1.day_enum.MON, client_1.day_enum.WED, client_1.day_enum.FRI],
                start_time: timeOnly(8, 0),
                end_time: timeOnly(17, 0),
                total_training_hours: demoProgram.hours,
                approx_months: '3 months',
                control_number_prefix: `DEMO-${demoProgram.code}`,
                id_card_prefix: demoProgram.idCardPrefix,
                created_by: registrar.id,
                updated_by: registrar.id,
            },
            create: {
                name: demoProgram.name,
                is_active: true,
                is_accredited: demoProgram.accredited,
                schedule: [client_1.day_enum.MON, client_1.day_enum.WED, client_1.day_enum.FRI],
                start_time: timeOnly(8, 0),
                end_time: timeOnly(17, 0),
                total_training_hours: demoProgram.hours,
                approx_months: '3 months',
                control_number_prefix: `DEMO-${demoProgram.code}`,
                id_card_prefix: demoProgram.idCardPrefix,
                created_by: registrar.id,
                updated_by: registrar.id,
            },
        });
        seededPrograms.push(program.name);
        for (const shift of DEMO_SHIFTS) {
            const batchName = `DEMO-${demoProgram.code}-${shift.label.toUpperCase()}-2026`;
            const existingBatch = await prisma.batch.findFirst({ where: { batch_name: batchName, program_id: program.id } });
            const batch = existingBatch
                ? await prisma.batch.update({
                    where: { id: existingBatch.id },
                    data: {
                        trainer_id: trainer.id,
                        created_by: registrar.id,
                        capacity: 30,
                        start_date: dateOnly(2026, 10, 5),
                        end_date: dateOnly(2027, 1, 5),
                        batch_status: client_1.batch_status_enum.OPEN,
                        remarks: `${shift.label} (${shift.time}). ${DEMO_PREFIX}: safe to delete with db:clean:demo`,
                    },
                })
                : await prisma.batch.create({
                    data: {
                        program_id: program.id,
                        trainer_id: trainer.id,
                        created_by: registrar.id,
                        batch_name: batchName,
                        capacity: 30,
                        start_date: dateOnly(2026, 10, 5),
                        end_date: dateOnly(2027, 1, 5),
                        batch_status: client_1.batch_status_enum.OPEN,
                        remarks: `${shift.label} (${shift.time}). ${DEMO_PREFIX}: safe to delete with db:clean:demo`,
                    },
                });
            seededBatches.push(batch.batch_name);
            await prisma.batch_student_seq.upsert({ where: { batch_id: batch.id }, update: { last_sequence: 0 }, create: { batch_id: batch.id, last_sequence: 0 } });
            await prisma.training_session.deleteMany({ where: { batch_id: batch.id } });
            await prisma.training_session.createMany({
                data: [
                    { batch_id: batch.id, session_date: dateOnly(2026, 10, 5), topics_covered: `Orientation and diagnostic assessment for ${demoProgram.topic}`, created_by: registrar.id },
                    { batch_id: batch.id, session_date: dateOnly(2026, 10, 7), topics_covered: `${demoProgram.topic}: tools, safety, and fundamentals`, created_by: registrar.id },
                    { batch_id: batch.id, session_date: dateOnly(2026, 10, 9), topics_covered: `${demoProgram.topic}: guided practical exercise`, created_by: registrar.id },
                ],
            });
        }
        for (const size of Object.values(client_1.size_enum)) {
            const itemName = `${DEMO_PREFIX} - ${demoProgram.code} Uniform`;
            const existing = await prisma.inventory.findFirst({ where: { program_id: program.id, item_name: itemName, sizes: size } });
            if (existing) {
                await prisma.inventory.update({ where: { id: existing.id }, data: { quantity: 10, updated_by: registrar.id } });
            }
            else {
                await prisma.inventory.create({ data: { program_id: program.id, item_name: itemName, sizes: size, quantity: 10, updated_by: registrar.id } });
            }
        }
    }
    console.log('Demo enrollment data is ready.');
    console.log(`  Programs: ${seededPrograms.length}`);
    console.log(`  Batches : ${seededBatches.length}`);
    console.log('  Trainers: 6, with one trainer assigned to each program');
    console.log('  Uniform : 10 pieces for every size per program');
    console.log('  Cleanup : npm run db:clean:demo');
}
main()
    .catch((error) => { console.error('Demo seed failed:', error); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); await pool.end(); });
//# sourceMappingURL=demo-seed.js.map