require('dotenv/config');
const path = require('node:path');
const { defineConfig, env } = require('prisma/config');

module.exports = defineConfig({
    schema: path.join('prisma', 'schema.prisma'),
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});
