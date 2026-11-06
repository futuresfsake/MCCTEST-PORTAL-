# TECH-03: Technical — migration history disagrees with `schema.prisma` and the live database

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Technical Debt / Data model                                                             |
| Priority    | Medium                                                                                  |
| Discovered  | 2026-11-06, by diffing a database built from the migrations with `schema.prisma`          |
| Affected    | `backend-nestjs/prisma/migrations/0_init`, `schema.prisma`, enums used by `trainee` and `trainer` |
| Status      | **LOGGED, NOT FIXED**                                                                    |
| Assignee    | Unassigned                                                                               |
| Related     | TECH-02 (`0_init` cannot be applied to a new database)                                    |

---

## Problem

A database built **only from the migrations** is not the same as `schema.prisma` and not the same as
Supabase. `prisma migrate diff` from such a database to `schema.prisma` lists these changes.

### Enum values (3 enums)

`schema.prisma` maps the names to values with spaces (`@map`). The migrations created them with underscores.

| Enum | Migrations (`0_init`) | `schema.prisma` and Supabase |
|------|-----------------------|------------------------------|
| `employment_status_enum` | `SELF_EMPLOYED` | `SELF EMPLOYED` |
| `employment_type_enum` | `FULL_TIME`, `PART_TIME` | `FULL TIME`, `PART TIME` |
| `highest_education_enum` | `HIGH_SCHOOL`, `POST_GRADUATE` | `HIGH SCHOOL`, `POST GRADUATE` |

### Trainer columns (5 columns)

| Column (`trainer`) | Migrations | `schema.prisma` and Supabase |
|--------------------|-----------|------------------------------|
| `gender`, `complete_address`, `highest_education`, `date_of_birth`, `contact_number` | `NOT NULL` | nullable |

## Where the live database stands

Checked read-only on 2026-11-06. **Supabase already matches `schema.prisma`**: the three enums have
the space-separated values and the five trainer columns are nullable (`trainer` has 2 rows,
`trainee` has 11). So the live database was changed some other way than through a migration
file. The repo's migration history never recorded it.

## Who is affected

| Situation | Effect |
|-----------|--------|
| Supabase and the running app | None today |
| A database rebuilt from the migrations (once TECH-02 is solved) | The app writes `SELF EMPLOYED`, `FULL TIME`, `HIGH SCHOOL`, `POST GRADUATE` and rejects those values on such a database. Creating a trainer without every field fails on `NOT NULL` |
| `prisma migrate dev` | Wants to generate a new migration for these changes the first time someone runs it |

## Fix notes

A new migration must **work on both databases**. On Supabase the values already have spaces, so a plain
`ALTER TYPE ... RENAME VALUE 'SELF_EMPLOYED' TO 'SELF EMPLOYED'` would fail there. It needs a
guard (a `DO` block that checks the value exists first) and `ALTER COLUMN ... DROP NOT NULL`, which is a
no-op where the column is already nullable. Do this together with the baseline decision in TECH-02.

## Acceptance Criteria

| #  | Criteria                                                                                          | Status      | Notes |
|----|---------------------------------------------------------------------------------------------------|-------------|-------|
| 1  | A database built from the migrations has no differences from `schema.prisma` (`prisma migrate diff` is empty) | NOT STARTED | 3 enums and 5 columns differ today |
| 2  | The fix runs without error on Supabase, where the schema is already correct                         | NOT STARTED | Must be safe to run twice |
| 3  | No data changes on Supabase                                                                         | NOT STARTED | Compare row counts for `trainee` and `trainer` before and after |
| 4  | `prisma migrate status` still reports up to date                                                    | NOT STARTED | |
