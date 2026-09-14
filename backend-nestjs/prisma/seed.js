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
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not defined in the environment variables');
}
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const SALT_ROUNDS = 12;
    const yy = String(new Date().getFullYear()).slice(-2);
    const adminSystemId = `MCCTP-${yy}-001`;
    const existingAdmin = await prisma.users.findUnique({
        where: { system_id: adminSystemId },
    });
    if (existingAdmin) {
        console.log(`Admin account already exists: ${adminSystemId}`);
    }
    else {
        const rawAdminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin@1234!';
        const adminPasswordHash = await bcrypt.hash(rawAdminPassword, SALT_ROUNDS);
        const admin = await prisma.users.create({
            data: {
                system_id: adminSystemId,
                first_name: 'System',
                last_name: 'Admin',
                middle_name: '',
                role: client_1.user_role_enum.ADMIN,
                password_hash: adminPasswordHash,
                is_active: true,
            },
        });
        console.log('Admin account seeded:');
        console.log(`   system_id : ${admin.system_id}`);
        console.log(`   password  : ${rawAdminPassword}`);
        console.log(`   role      : ${admin.role}`);
    }
    const registrarSystemId = `MCCTP-${yy}-002`;
    const existingRegistrar = await prisma.users.findUnique({
        where: { system_id: registrarSystemId },
    });
    if (existingRegistrar) {
        console.log(`Registrar account already exists: ${registrarSystemId}`);
    }
    else {
        const rawRegistrarPassword = process.env.REGISTRAR_SEED_PASSWORD ?? 'Registrar@1234!';
        const registrarPasswordHash = await bcrypt.hash(rawRegistrarPassword, SALT_ROUNDS);
        const registrar = await prisma.users.create({
            data: {
                system_id: registrarSystemId,
                first_name: 'System',
                last_name: 'Registrar',
                middle_name: '',
                role: client_1.user_role_enum.REGISTRAR,
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
    await pool.end();
});
//# sourceMappingURL=seed.js.map