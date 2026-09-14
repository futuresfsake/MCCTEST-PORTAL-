"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_path_1 = __importDefault(require("node:path"));
exports.default = {
    schema: node_path_1.default.join('prisma', 'schema.prisma'),
    migrations: {
        path: 'prisma/migrations',
        seed: 'npx tsx ./prisma/seed.ts',
    },
    datasource: {
        url: process.env.DATABASE_URL,
    },
};
//# sourceMappingURL=prisma.config.js.map