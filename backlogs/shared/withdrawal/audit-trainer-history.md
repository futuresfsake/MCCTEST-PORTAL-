# Withdrawal (trainer side): Verification of the request history, security headers and multer fix

| Field | Value |
|-------|-------|
| **Date** | 2026-11-04 |
| **Audited** | Branch `fix/security-headers-multer-staging`, cut from `staging` at `16838f9`, with uncommitted changes (not yet pushed). **Since merged to `dev`:** helmet and multer in PR #75 (14:06), the history table in PR #76 (14:18), 2026-11-04. Re-checked on merged `dev`: backend 102 of 102 tests, `tsc` clean, frontend build and lint clean. Still not on `staging`, and the browser check is still open |
| **Changes covered** | (1) trainer Request history table and its search (`status=DECIDED`), (2) `helmet` in `main.ts` (finding A-1), (3) `multer` override to 2.5.0 (finding A-3), (4) MP-48 ticket text and acceptance criteria |
| **Builds on** | `audit-dev-trainer.md`, `audit-staging.md`, `audit-pre-staging.md` |
| **Ticket** | MP-48 (Trainer: Validate Withdrawal Request) |

## Verdict

**Ready to go to `dev`.** The API half is tested over real HTTP (45 of 45, section 5). Not done: the new page has not been looked at in a real browser (test cases 6, 7 and 9 of the history need one), and the race tests were not re-run (the transaction code is unchanged).

Findings A-1 and A-3 are fixed in this branch. A-2 (row level security) is untouched, see section 6.

## 1. Definition of done

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `tsc --noEmit` | PASS |
| 2 | Backend ESLint on `src`, `apps`, `libs`, `test` (no `--fix`) | PASS, 0 problems |
| 3 | Backend `prisma validate` | PASS |
| 4 | Backend `nest build` | PASS |
| 5 | Frontend `tsc -b` | PASS |
| 6 | Frontend ESLint (whole project) | PASS, 0 problems |
| 7 | Frontend `vite build` | PASS |

Note: linting the whole backend folder (not only the source folders) reports errors in `dist` and `coverage` build output. Those are not source files.

## 2. Unit tests and regression

| # | Check | Result |
|---|-------|--------|
| 8 | Backend unit tests | PASS, 102 of 102 (12 suites). One new test: `DECIDED` is scoped to the trainer's own batches, requires `trainer_validated_by`, and sorts by decision time |
| 9 | Regression: the trainee and trainer tests that existed before | All still pass. The default list, `ALL`, a single status and the batch filter are unchanged |
| 10 | Frontend tests | None exist (no test runner, finding A-4 still open) |

## 3. Security and leaks

| # | Check | Result |
|---|-------|--------|
| 11 | `X-Powered-By` header (A-1) | **Fixed.** `helmet()` added. Checked at runtime with Express and the same helmet version: `X-Powered-By` absent, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, HSTS set. Checked on a minimal Express app, not on the full Nest app (it needs the database) |
| 12 | Helmet side effects | No static or file serving in the backend (`useStaticAssets`, `ServeStatic`, `sendFile`, streams: none), so the default cross-origin resource policy does not block anything. The API returns JSON only. CORS is unchanged |
| 13 | `multer` advisory GHSA-q7qp-rjg7-q26m (A-3) | **Fixed.** `@nestjs/platform-express` pins 2.4.0 (vulnerable range 2.0.0 to 2.4.0), so `overrides.multer = 2.5.0` was added. `npm ls` shows 2.5.0 overridden. Backend `npm audit --omit=dev`: 0 vulnerabilities (was 2 high). Frontend: 0 |
| 14 | Upload routes affected by the multer bump | None in the withdrawal feature. Not re-tested elsewhere (no upload test in the repo). Check the MP-41 photo upload when it is built |
| 15 | New filter value `DECIDED` | Still behind `JwtAuthGuard`, `RolesGuard` and `@Roles(TRAINER)`. The query always includes `batch.trainer.user_id = caller`, so another trainer's decided requests cannot appear. The value is validated by `@IsIn` (unknown values: 400) |
| 16 | Data shown | Unchanged: trainee name and system ID only. No `password_hash`, contact details or birth date in the selects |
| 17 | Leak scan of every changed `.ts` and `.tsx` file: `password_hash`, `console.log`, `localStorage`, `dangerouslySetInnerHTML`, raw queries, `eval`, secrets | None found (the only `password_hash` match is a comment saying never to include it). No `.env` file is tracked |
| 18 | Search input | Sent as a URL parameter, trimmed, at most 100 characters, at most 5 words, used through Prisma `contains` (no raw SQL) |

## 4. Acceptance criteria (MP-48)

| # | Criterion | Result |
|---|-----------|--------|
| 1 to 12 | Original criteria | Same result as `audit-dev-trainer.md`. Code unchanged except the new filter, unit tests pass |
| 13 | Decided requests do not disappear: Request history table below the main list, only approved or rejected, newest decision first, new requests stay on top | PASS by unit test and build. **Not checked in a browser** |
| 14 | History has its own trainee search | PASS by build. **Not checked in a browser** |

Test cases for 13 and 14 are written in `acceptance.md` (TR-11, TR-12) and on the Jira ticket. They are manual and have not been run yet.

## 5. Integration

| # | Check | Result |
|---|-------|--------|
| 19 | Real HTTP end to end: the real compiled backend (with helmet) on a throwaway local PostgreSQL 17 built from the repo's migrations, 2 trainers, 4 trainees, real logins | **PASS, 45 of 45.** Covers test cases 1 to 5, 8 and the API half of 6 and 9 (see 19a), roles, scoping, state guard, leaks, helmet and CORS on the real app, and database consistency. The run used fake data on a separate database, not Supabase |
| 20 | Race tests (trainee cancel against trainer approve, approve against reject) | **Not run.** The transaction code is unchanged. Earlier result: exactly one winner in 60 of 60 trials |
| 21 | Real browser check of the trainer page and the history card | **Not run.** Test cases 6 (UI search box), 7 (URL state) and 9 (the panel without Approve/Reject) still need it |
| 22 | Supabase (read-only, shared database) | `prisma migrate status`: up to date (12 migrations). Withdrawal tables and the 4 trainer columns exist, all 6 status values exist. 1 request, 2 history rows, status matches the latest history, no orphans, no open duplicates, no rejection without a reason. Row level security: 0 of 39 public tables (A-2 unchanged) |

**19a. What the 45 checks proved:** history is empty before any decision; approve without remarks gives `TRAINER_VALIDATED`; reject with blank remarks is 400 and with a reason is `REJECTED`; the history then lists exactly the two decided requests, newest decision first, while the main list keeps only what is pending; a request cancelled by the trainee before review is in neither the history nor the waiting list and shows as `CANCELLED` under `ALL`; history search by first name, last name (any case), system ID and two words in any order, and no match gives an empty list; SQL text in the search returns 200 with nothing; page 2 of the history works; the other trainer sees an empty history, only their own pending request, and gets 403 on opening or validating the first trainer's request; unknown id is 404; acting twice is 400; trainee and admin get 403 and no token gets 401; unknown status value is 400; no password, hash, email or contact data in responses; `X-Powered-By` is absent and CORS still allows the frontend origin on the real app; in the database every request has history, the status matches the latest history row, and a rejection always has a reason.

## 6. Findings

| ID | Status |
|----|--------|
| A-1 | **Closed** by this branch (helmet) |
| A-2 | Still open. Row level security is off on all 38 tables. Not changed here: enabling it on the shared database needs a decision, and the role that `DATABASE_URL` connects with must be confirmed first (if it does not bypass RLS, the whole app would stop returning data) |
| A-3 | **Closed** by this branch (multer override). Remove the override once `@nestjs/platform-express` ships a version that depends on multer 2.5.0 or later |
| A-4 | Still open. The new `DECIDED` filter has a unit test. The controller, the page and the real-database behaviour still have no tests in the repo |
| A-10 (new, low) | `DECIDED` means "`trainer_validated_by` is set", not "set to the calling trainer". If a batch is reassigned to another trainer, the new trainer will see the old trainer's decisions in the history. This is probably what is wanted (the history of the batch) but it is a behaviour to confirm |
| A-12 (new, medium) | **A fresh database cannot be built from the migrations.** `prisma/migrations/0_init/migration.sql` starts with a UTF-8 byte-order mark, so `prisma migrate deploy` on an empty database fails with `syntax error at or near "\BOM"`. Supabase is unaffected (it was set up earlier). The fix is not to edit `0_init` (that changes its checksum on Supabase) but to decide how to handle it, for example a baseline for new environments. It blocks anyone setting up a local or CI database from the repo |
| A-13 (new, low) | The `trainer` table has `gender`, `complete_address`, `highest_education`, `date_of_birth` and `contact_number` as `NOT NULL` in the database, but the Prisma schema marks them optional. Creating a trainer without them fails in the database. Check which one is intended |
| A-14 (new, low) | Rejecting with blank remarks returns 400 with two messages, including an unrelated "remarks must be shorter than or equal to 1000 characters". Harmless, but confusing for an API client |
| A-11 (new, low) | The history table's page size is fixed at 10. The page-size selector inside the shared pagination component does nothing there |
