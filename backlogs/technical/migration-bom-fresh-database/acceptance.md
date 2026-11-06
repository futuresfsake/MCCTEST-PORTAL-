# TECH-02: Technical — `0_init` migration cannot be applied to a new database (byte-order mark)

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Technical Debt / Infrastructure                                                         |
| Priority    | Medium                                                                                  |
| Discovered  | 2026-11-06, while testing MP-43 on a new Docker database                                 |
| Affected    | `backend-nestjs/prisma/migrations/0_init/migration.sql`                                  |
| Status      | **LOGGED, NOT FIXED**                                                                    |
| Assignee    | Unassigned                                                                               |
| Related     | TECH-03 (migration history disagrees with the live schema). Commit `b13fe19` (2026-10-20) |

---

## Problem

`npx prisma migrate deploy` on an **empty** database fails on the first migration:

```
Applying migration `0_init`
Error: P3018 ... Database error code: 42601
ERROR: syntax error at or near "﻿"
```

`0_init/migration.sql` begins with a UTF-8 byte-order mark (bytes `EF BB BF`). PostgreSQL does not
accept it as the start of a statement. It is the only migration with one. Of the 13 migrations,
12 start with `--` (and `20261019_add_inventory_transactions` starts with a blank line).

## Why the mark is there

The mark is deliberate. Commit `b13fe19` (MP-24, 2026-10-20), **"restore BOM in 0_init migration
to match applied checksum"**, put it back. Prisma stores a checksum of every applied migration
(in `_prisma_migrations`). Supabase applied `0_init` with the mark, so removing it changes the
checksum and Prisma reports the migration as modified.

So simply deleting the mark is **not** a safe fix: it would fix new databases and break the
shared one.

## Who is affected

| Situation | Effect |
|-----------|--------|
| Supabase (shared database) | None. `migrate status` says up to date |
| A new developer machine, a CI database, or rebuilding staging from migrations | `migrate deploy` fails at `0_init`. Nobody can build the schema from the repo |
| How it was worked around on 2026-11-06 | The mark was stripped in memory and each migration was fed to `psql` in order. Nothing in the repo was changed |

## Options (decision needed)

| # | Option | Effect on Supabase | Notes |
|---|--------|--------------------|-------|
| A | Leave the mark. Document that a new database needs the stripped-mark workaround | None | Cheapest. Everyone has to know the workaround |
| B | Remove the mark and update the stored checksum on Supabase | Edits `_prisma_migrations` on the shared database | One manual change to shared data. Easy to get wrong |
| C | Baseline: replace `0_init` with a clean file made from the live schema, then mark it applied on Supabase with `prisma migrate resolve --applied` | Edits `_prisma_migrations` | Best long term, and the right time to also fix TECH-03 |

## Acceptance Criteria

| #  | Criteria                                                                                   | Status      | Notes |
|----|--------------------------------------------------------------------------------------------|-------------|-------|
| 1  | `prisma migrate deploy` applies every migration to an empty PostgreSQL database            | NOT STARTED | Fails at `0_init` today |
| 2  | `prisma migrate status` on Supabase still reports "up to date" after the fix               | NOT STARTED | No checksum mismatch |
| 3  | The chosen option is written down (README or a note in `migrations/`)                      | NOT STARTED | |
| 4  | CI or a script builds an empty database from the migrations and diffs it with `schema.prisma` | NOT STARTED | Would have caught TECH-02 and TECH-03 |
