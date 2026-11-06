# MP-45 Migration: `20261104_withdrawal_pipeline_schema`

| Field | Value |
|-------|-------|
| **Ticket** | MP-45 (Withdrawal Feature, Database Schema & Prisma Migration) |
| **Branch** | `feature/MP-45-withdrawal-schema` |
| **File** | `backend-nestjs/prisma/migrations/20261104_withdrawal_pipeline_schema/migration.sql` |
| **Type** | Additive. No column, table or index is dropped or altered |
| **Tested** | 2026-11-04, on a throwaway local PostgreSQL 17 (not Supabase) |
| **Applied to Supabase** | **Yes, 2026-11-04** with `npx prisma migrate deploy`. Only this migration was pending. `withdrawal_request` had 0 rows and 10 columns before, 23 after. Verified: status up to date, enum, both indexes, history table, no withdrawal drift |

Context and flow: see `acceptance.md` and decision D-06 in `registrar/decisions.md`.

---

## 1. What it changes

| Object | Change |
|--------|--------|
| Enum `withdrawal_status_enum` | **New.** `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `PENDING_ADMIN_SIGNOFF`, `APPROVED`, `REJECTED`, `CANCELLED` |
| Table `withdrawal_request` | **13 columns added** (below). The existing `surrendered_id` is reused, not duplicated |
| Table `withdrawal_status_history` | **New.** Audit log of every status change |
| Indexes | **2 new** |
| Foreign keys | **5 new** |

### Columns added to `withdrawal_request`

| Group | Columns |
|-------|---------|
| Pipeline status | `withdrawal_status` (enum, NOT NULL, default `PENDING_VALIDATION`) |
| Trainer (first validation) | `trainer_validated` (bool, default false), `trainer_remarks`, `trainer_validated_by` (FK users), `trainer_validated_at` |
| Registrar (second validation) | `finances_cleared`, `documents_submitted` (bools, default false), `registrar_remarks`, `registrar_validated_by` (FK users), `registrar_validated_at`. The "ID surrendered" checklist item is the **existing** `surrendered_id` column |
| Admin sign-off | `admin_signed_off_by` (FK users), `admin_signed_off_at`, `admin_remarks` |

All timestamps are `TIMESTAMPTZ(6)`. All new foreign keys are `ON DELETE NO ACTION ON UPDATE NO ACTION`.

### New table `withdrawal_status_history`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `withdrawal_request_id` | UUID | FK to `withdrawal_request` |
| `old_status` | enum, nullable | Null for the first row |
| `new_status` | enum | |
| `changed_by` | UUID | FK to `users` |
| `changed_at` | TIMESTAMPTZ(6) | Default now |
| `remarks` | text, nullable | |

### Indexes

| Name | On |
|------|----|
| `idx_withdrawal_status` | `withdrawal_request(withdrawal_status)` |
| `idx_withdrawal_history_request_changed` | `withdrawal_status_history(withdrawal_request_id, changed_at DESC)` |

---

## 2. Existing data

| Item | Behaviour |
|------|-----------|
| Existing rows | Kept. Nothing is deleted or rewritten except the new `withdrawal_status` |
| Backfill | `request_status` APPROVED, REJECTED, CANCELLED copy to `withdrawal_status`. Everything else (PENDING) stays `PENDING_VALIDATION` |
| Legacy columns | `request_status`, `reviewed_by`, `date_reviewed`, `remarks` are **kept**. New code uses the role-specific columns |
| `surrendered_id` | **Kept and reused** as the "ID surrendered" check. Since D-09 (2026-11-06) it belongs to the Admin sign-off (MP-49), not the registrar. It was first planned as the registrar's item (consistent naming, no duplicate column). Old values stay as they were. MP-47 reads and writes `surrendered_id` |

---

## 3. Test results (throwaway PostgreSQL 17)

Setup: all 11 earlier migrations applied, 4 legacy rows seeded (one per `request_status`), then this migration applied through `prisma migrate deploy`.

| # | Check | Result |
|---|-------|--------|
| 1 | Migration applies on a database that already has `withdrawal_request` rows | PASS |
| 2 | Backfill: PENDING→`PENDING_VALIDATION`, APPROVED→`APPROVED`, REJECTED→`REJECTED`, CANCELLED→`CANCELLED` | PASS |
| 3 | Legacy values and remarks unchanged on all 4 rows | PASS |
| 4 | `prisma migrate status`: "Database schema is up to date", 12 migrations | PASS |
| 5 | Enum has exactly 6 values, no `REGISTRAR_VALIDATED` (inserting it is rejected) | PASS |
| 6 | Both indexes exist, `idx_withdrawal_history_request_changed` is used by the history lookup | PASS |
| 7 | 7 foreign keys present on the two tables | PASS |
| 8 | New request gets defaults: `PENDING_VALIDATION`, all booleans false | PASS |
| 9 | History rows insert, with `old_status` null on the first | PASS |
| 10 | History for a missing request is rejected (FK) | PASS |
| 11 | Deleting a request that has history is blocked (NO ACTION) | PASS |
| 12 | A missing user in a sign-off column is rejected (FK) | NOT PROVEN. The test row tripped the enrollment FK first. The three constraints exist (check 7) |
| 13 | `npx prisma validate` and `npx prisma generate` | PASS |
| 14 | `tsc --noEmit` on the backend | PASS (0 errors). No existing code uses `withdrawal_request` |
| 15 | No withdrawal-related drift between the migrated database and `schema.prisma` | PASS |

---

## 4. Findings outside this ticket

| # | Finding | Impact |
|---|---------|--------|
| F-1 | **`0_init/migration.sql` starts with a byte-order mark.** On an empty database `prisma migrate deploy` fails with a syntax error at the first character | Does not affect Supabase (already baselined). Blocks building a fresh database from migrations, for example a new developer or CI. Not changed in this branch |
| F-2 | **Existing schema drift.** Migrations do not reproduce `schema.prisma` for `trainee`, `trainer` and the `employment_status`, `employment_type` and `highest_education` enums (35 lines of SQL). Identical with the old schema, so it is not caused by MP-45 | Same blocker for fresh databases. Needs its own ticket |
| F-3 | `prisma migrate dev` would try to include the drift in F-2 | Use `migrate deploy` for this migration, not `migrate dev` |

---

## 5. Rollout (done 2026-11-04, kept as the record of the steps)

1. Merge the branch to `dev`.
2. Back up (Supabase point-in-time or a dump) before applying to the shared database.
3. From `backend-nestjs`: `npx prisma migrate deploy`.
4. Check: `select withdrawal_status, count(*) from withdrawal_request group by 1;`
5. Restart the backend so it picks up the regenerated client (`npx prisma generate`).

**Rollback** (no data is lost, since the legacy columns remain):
```sql
DROP TABLE "withdrawal_status_history";
ALTER TABLE "withdrawal_request"
  DROP COLUMN "withdrawal_status", DROP COLUMN "trainer_validated", DROP COLUMN "trainer_remarks",
  DROP COLUMN "trainer_validated_by", DROP COLUMN "trainer_validated_at",
  DROP COLUMN "finances_cleared", DROP COLUMN "documents_submitted", DROP COLUMN "registrar_remarks",
  DROP COLUMN "registrar_validated_by", DROP COLUMN "registrar_validated_at",
  DROP COLUMN "admin_signed_off_by", DROP COLUMN "admin_signed_off_at", DROP COLUMN "admin_remarks";
DROP TYPE "withdrawal_status_enum";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261104_withdrawal_pipeline_schema';
```
Dropping the columns discards any withdrawal data entered after the migration, so roll back before MP-46 goes live. `surrendered_id` is not dropped, because it existed before this migration.
