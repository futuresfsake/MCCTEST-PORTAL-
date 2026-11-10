# Admin Edit Trainee (MP-42): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-09 |
| **Audited** | Branch `feature/MP42-admin-edit-trainee` at `ae7d9c5` (author `Expired_Biskwit`, 2026-11-06). Working tree clean except the untracked `text.txt`, which is not part of the branch. Nothing in the audited code was edited |
| **Compared with** | `origin/dev` at `11ad2c9`. The branch is 1 commit ahead and 0 behind. 22 files changed (+1938, −184), 1 migration added. Against `origin/main`: 7 ahead, 2 behind |
| **Jira status** | Done (resolved 2026-11-08), assignee Aubrien Fuentes, MP Sprint 4. The branch is **not merged**, so the Jira status is ahead of the work (finding F-3) |
| **How it was run** | A throwaway Postgres 17 outside the repository (Docker was installed but its engine was not running): all 14 migrations applied from nothing, seeded with fake data, the built backend run against it, 155 end-to-end checks over real HTTP (run twice: the audit, then again as a regression run). 215 unit tests were then written locally and checked with a break-it run; they are **not committed** (section 7). Supabase was read with read-only queries only. Everything was removed afterwards (section 7) |
| **Not audited** | The pages in a real browser (code reading only). Whether a pull request exists (`gh` is not installed here). A real save against Supabase (writes are not allowed there, and the migration is not applied there yet). Supabase timing. Attendance rows after a batch change (the enrollment keeps its id, so they should follow, but no attendance rows were seeded). The Known Gaps in `acceptance.md` about MP-47 were read, not run |
| **Definition of Done used** | The Jira "Definition of Done" section and its 22 Acceptance Criteria, the backlog `acceptance.md` (23 rows) and its test cases TC-01 to TC-10 |

## Re-check on 2026-11-10 (after the merge into `dev`)

The branch was merged into `dev` as pull request #96 (merge commit `2f5f0e9`). Everything below was re-checked on that commit; the sections after it keep the 2026-11-09 audit as written, with the changes noted here.

| Check | Result on 2026-11-10 |
|-------|----------------------|
| Merged into `dev` | **Yes**, PR #96, commit `2f5f0e9`. Not yet in `staging` or `main` |
| Supabase migration `20261106_trainee_enrollment_transfers` | **Applied** with `prisma migrate deploy`. `migrate status`: 14 found, "Database schema is up to date!". The table `enrollment_transfers` exists with 0 rows and the migration record is finished (finding F-2 closed) |
| Backend `tsc`, `nest build`, eslint, `prisma validate` | Clean on `2f5f0e9` |
| Backend `jest` | 102 of 102 (12 suites). Still none for the new code (F-1) |
| Frontend `tsc -b`, eslint, `vite build` | Clean |
| `npm audit --omit=dev` (what ships) | 0 vulnerabilities in both projects |
| `npm audit` (everything) | **New since 2026-11-09:** backend 28 (5 low, 23 moderate), frontend 10 (moderate), none high or critical, all in test and lint tools (jest, eslint, typescript-eslint, `@nestjs/cli`, minimatch, glob). Not caused by this branch (finding F-17) |
| Uniform stock on a change, tested on a throwaway Postgres | A batch change and a program change without the uniform do not touch stock. A program change with the uniform given deducts 1 from the new program and writes a stock log entry. Out of stock gives 400 and saves nothing. Nothing is returned to the old program (F-16, decision D-6) |
| Payment | The enrollment payment is one-time (decision D-7). The MP-47 fee line for a shifted trainee stays a known gap (F-4) |
| Still open | F-15 (a missing `beneficiary` gives 500), F-1 (no unit tests), one batch change and one program change checked in a browser, Jira status |

## Verdict

**The code meets 21 of the 22 acceptance criteria (20 on 2026-11-09; AC 20 passes now that the migration is applied) and has one real bug (F-15), which keeps AC 2 PARTIAL. As of 2026-11-10 it is merged into `dev` and the migration is applied on Supabase. It is not ready for `main` until the open points in the re-check table are settled.**

1. **Behaviour is correct.** All 155 end-to-end checks pass on a clean database, including rollback after a forced failure, three-way races for the last slot, and every 401 and 403 combination. Lint, type-check, build and `prisma validate` are clean, and `npm audit` shows 0 vulnerabilities in both projects.
2. **The branch has no unit tests for the new code (F-1).** About 770 changed lines in `enrollments.service.ts`, two DTOs and five endpoints have no spec file in the branch, and its 102 passing Jest tests are the same 102 as on `dev`. After the first audit I wrote 215 unit tests (4 spec files) and ran them: the whole suite was 317 of 317, the new service methods were 82 of 82 statements covered, and a break-it run caught 35 of 35 deliberate breaks. At the owner's request they were never committed, and the files were then deleted, so those results cannot be re-run without writing the tests again.
3. **One real bug found by those tests (F-15).** `PATCH /admin/trainees/:id` with no `beneficiary` field at all returns **500**, not a clear 400. Confirmed on the live API. A `null` or empty `beneficiary` gives a correct 400, and nothing is saved. This makes AC 2 PARTIAL.
4. **The migration was not on Supabase (F-2). Fixed on 2026-11-10, it is applied.** On 2026-11-09 `prisma migrate status` listed `20261106_trainee_enrollment_transfers` as not applied and the table does not exist there. AC 20 stays PARTIAL until the PM applies it.
5. **Merged into `main` is NOT DONE (F-3). On 2026-11-10 it is merged into `dev` (PR #96), not yet into `staging` or `main`.** On 2026-11-09 the branch was pushed but not merged into `dev` or `main`. A trial merge into both has no conflicts. Whether a pull request is open could not be checked. Jira already says Done.
6. **Known integration gap with MP-47 (F-4).** MP-47 is already on `dev`. A shifted trainee's new enrollment has no receipt of its own, so the withdrawal page can show the enrollment fee as unpaid. The branch notes list this as a Known Gap. It needs a decision before the two meet in `main`.

### Ready to merge into `dev`?

**Update 2026-11-10: merged into `dev` (PR #96) and the migration is applied on Supabase. The text below is the 2026-11-09 assessment.**

**Almost. Yes for `dev`, once two things are done. Not for `main` yet.** Before `dev`: (1) fix F-15 (one line, `@IsDefined()` on `beneficiary`) or accept it knowingly, because no screen can trigger it; (2) the PM applies the migration to Supabase when the code reaches `dev`, or the history and change actions fail there (F-2). The branch is 0 behind `dev` and a trial merge has no conflicts. Before `main`: F-4 (the MP-47 gap) stays open as a known gap by decision D-7, decide whether unit tests are written for the branch (F-1), and check one batch change and one program change in a browser.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` | PASS, after `prisma generate`. **Before it, 7 errors**: the generated client under `src/generated/prisma` is git-ignored, so a fresh checkout does not know `enrollment_transfers` (F-9) |
| 3 | Backend `nest build` | PASS |
| 4 | Backend `jest` | PASS, 102 of 102 (12 suites) in the branch. **None cover the new code** (F-1). With my 4 spec files (since deleted): 317 of 317 (16 suites) |
| 5 | `prisma validate` | PASS |
| 6 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 7 | Frontend `tsc -b` and `vite build` | PASS. Main bundle 649 kB, over the 500 kB warning (existing) |
| 8 | `npm audit --omit=dev`, backend and frontend | 0 vulnerabilities in both (re-checked 2026-11-10: still 0; the full `npm audit` now lists dev-tool advisories, F-17) |
| 9 | New dependencies | None. No `package.json` changed |
| 10 | Frontend tests | The frontend has no test script |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 11 | Migrations added compared with `origin/dev` | PASS. Exactly 1: `20261106_trainee_enrollment_transfers` |
| 12 | All 14 migrations applied to an empty database, in order | PASS, 0 errors (byte-order mark stripped in memory, TECH-02) |
| 13 | Database from migrations compared with `schema.prisma` | PASS for the new table and enum: 0 differences. The only differences are the existing 3 enums and 5 trainer columns (TECH-03). After I aligned those on the throwaway database, `migrate diff` said "No difference detected" |
| 14 | Foreign keys | PASS. 6 keys, all `NO ACTION`, so a trainee, enrollment, batch or admin with history cannot be deleted. That fits an append-only log |
| 15 | Indexes for the new queries | PASS. `(trainee_id, created_at DESC, id DESC)` serves the history list (the planner used an index-only scan). `(to_enrollment_id)` serves the carried-payment walk |
| 16 | Supabase: migration applied | **YES, since 2026-11-10.** On 2026-11-09 it was not applied (`to_regclass('enrollment_transfers')` was null). Now `migrate status` says up to date and the table exists with 0 rows |
| 17 | Supabase: row level security | Off on all 40 tables, so the new table matches the others (finding F-10, existing) |
| 18 | Supabase: enum labels the app expects | PASS. `employment_type_enum` has `FULL TIME` and `PART TIME`, as `schema.prisma` says |
| 19 | Orphan rows, inconsistent rows | Not applicable. The table does not exist on Supabase yet |

## 3. Evidence from real use

None on the shared database, because the migration is not applied there. The behaviour was exercised on the throwaway database through the built backend (section 4 and 7). The branch notes say a browser run covered 30 checks as Admin, Registrar and Encoder. I did not see it.

## 4. Acceptance Criteria

Numbered as in Jira (22). The backlog `acceptance.md` has 23 rows because it adds a row 17 (history rows cannot be edited or deleted), so its numbers from 17 on are one higher than Jira's (section 4a).

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Admin edits info, saves, and it persists after a refresh | PASS | PATCH 200, then read back from the database and from the profile endpoint. Contact number, beneficiary and email all saved. Email is lower-cased |
| 2 | Invalid input shows a clear error, not a server error | PARTIAL | Future birth date, empty and whitespace-only name, duplicate email (also in other case), bad email, wrong contact length, text over 100 characters, bad enum, bad beneficiary contact and a malformed date all give 400 or 409 with a message. Nothing saved after a rejection. **But a missing `beneficiary` field gives 500 (F-15).** Found by a unit test and confirmed on the live API; `null` and `{}` are correctly 400 |
| 3 | Username and password cannot be edited | PASS | Sent `systemId`, `username`, `password`, `password_hash`, `role` and `is_active`: all ignored, and the stored hash still verifies the original password |
| 4 | Batch change keeps the same enrollment, ID card, OR, uniform, documents | PASS | Same enrollment id now in A2. ID card, status, uniform size, remarks, OR, uniform row and checklist unchanged |
| 5 | Only open, non-full batches of the same program are offered. Full, closed or past is rejected clearly | PASS | Options list A2 and the batch ending today, and hide the full, closed, past and current batch. Each is rejected with "already full", "no longer open" or "already ended". A batch ending today is allowed |
| 6 | Schedule overlap on non-accredited programs is rejected | PASS | A trainee active in B (Mon to Wed 13:00 to 17:00) and C (Mon 14:00 to 16:00) moving to E (Mon 15:00 to 17:00): 409, nothing changed, and the options list hides E. Overlap can only arise on a program change, because the schedule belongs to the program |
| 7 | Program change withdraws the old enrollment and creates a new `ENROLLED` one | PASS | Old: `WITHDRAWN`, `exit_reason` "Shifted to Program D: wants accredited". New: `ENROLLED` in D1, same trainee row |
| 8 | New ID card with the new prefix, checklist copied | PASS | `2026-DD###`, different from the old number. Checklist flags copied |
| 9 | Payment carries over by default. "New payment" records a new OR | PASS | Carry-over: remarks name the old OR, no receipt on the new enrollment, and a second shift still names the original OR. New payment: one new OR on the new enrollment, returned in the response |
| 10 | Uniform given deducts 1 from stock. Out of stock blocks the change | PASS | Stock 5 to 4 with a transaction row. Out of stock (size S, 0 left): blocked, and the old enrollment, the new enrollment count, the history and the stock are unchanged |
| 11 | One active accredited program, capacity and overlap are enforced | PASS | Second active accredited program: 409. Full target: 400 "already full". Same program, inactive program, and a batch the trainee already holds are all rejected |
| 12 | A reason is required | PASS | Missing, empty and whitespace-only reason give 400 on both endpoints. Over 500 characters gives 400. The reason is trimmed before it is stored |
| 13 | Only `PENDING` and `ENROLLED` can change | PASS | `WITHDRAWN`, `DROPPED` and `COMPLETED` get 400 from change-batch, change-program and change-options. `PENDING` can change and stays `PENDING` |
| 14 | If any part fails, nothing is saved | PASS | A database trigger forced a failure at the last step. Program change: every table, the ID counter and the stock were identical before and after. Batch change: not moved. Info update, failing on the beneficiary: the user and trainee rows were not changed either |
| 15 | Every change writes a history row with date and time and the admin's `users.id` | PASS | One `BATCH_CHANGE` row with the same from and to enrollment, one `PROGRAM_CHANGE` row with different ones, `performed_by` = the admin's id, `created_at` set |
| 16 | The profile shows the change history, newest first, for Admin and Registrar | PASS (API and code) | Both history endpoints return newest first with type, from, to, reason, date and admin name. The section has loading, empty and error states. The page itself was not seen in a browser |
| 17 | Registrar sees no Edit or Change actions, and the admin endpoints return 403 | PASS (API and code) | 403 on all 5 admin endpoints. The Registrar's `canEdit` is false, so the Edit and Change buttons do not render. Not seen in a browser |
| 18 | Trainee, trainer and encoder get 403. No token gets 401 | PASS | All 6 endpoints with no token: 401. Registrar, trainer, trainee and encoder on the 5 admin endpoints: 403. Admin, trainer, trainee and encoder on the registrar history endpoint: 403. The 403 calls changed nothing |
| 19 | Responses never include `password_hash` | PASS | No `password`, `hash` or `email` in the PATCH, change-batch, change-program, change-options or history responses, nor in the admin and registrar profile responses |
| 20 | Exactly one migration, and `migrate status` says up to date after applying | PASS (2026-11-10) | One migration, applies cleanly to an empty database with 0 drift for the new table. It was PARTIAL on 2026-11-09 because it was not applied on Supabase. Applied on 2026-11-10 and `migrate status` says "Database schema is up to date!" |
| 21 | No logic copied from `EnrollmentsService` or the MP-24 module | PASS (code reading) | `changeBatch` and `changeProgram` call the shared `validateBatchAvailability`, `validateTraineeProgramRules`, `generateIdCardNumber`, `recordUniformDistribution` and `recordPayment`. The last two were moved out of `createEnrollment` into helpers, so there is one copy |
| 22 | Type-check, build and lint with 0 problems | PASS | Section 1. Needs `prisma generate` first (F-9) |

**Totals: 20 PASS, 2 PARTIAL (AC 2, AC 20), 0 NOT MET = 22.**

### 4a. Jira against `acceptance.md`

| Jira | `acceptance.md` | Note |
|------|-----------------|------|
| 1 to 16 | 1 to 16 | Same |
| none | 17 | Extra row in the backlog: history rows cannot be edited or deleted. Append-only by convention only (F-7) |
| 17 to 22 | 18 to 23 | Same wording, one number higher |

Other differences: `acceptance.md` says "Assignee: Not assigned (open gap 1)", but Jira now shows Aubrien Fuentes. The Jira comment of 2026-11-04 still lists both open gaps.

### Test cases

| Test case | Result | Covered by |
|-----------|--------|------------|
| TC-01 Edit info | PASS | AC 1, 3 |
| TC-02 Validation | PASS | AC 2 |
| TC-03 Change batch | PASS | AC 4, 15 |
| TC-04 Full batch | PASS | AC 5. "already full", no history row |
| TC-05 Schedule overlap | PASS | AC 6 |
| TC-06 Change program | PASS | AC 7, 8, 9, 15 |
| TC-07 Program change with uniform | PASS | AC 10 |
| TC-08 Rollback | PASS | AC 14, forced failure |
| TC-09 No reason | PASS | AC 12 |
| TC-10 Registrar view | PASS (API and code) | AC 16, 17, 18. UI not seen |

## 5. Security, concurrency, performance, configuration

| # | Check | Result |
|---|-------|--------|
| S-1 | 401 and 403 on every endpoint | PASS (AC 18) |
| S-2 | Input validated | PASS. Bad ids give 400 (`ParseUUIDPipe`), unknown ids give 404, extra fields are dropped, text limits enforced. A 2 MB body is refused with 413 (the limit is 100 KB) |
| S-3 | Sensitive fields in responses | PASS (AC 19) |
| S-4 | Secrets committed | PASS. No `.env` is tracked, and the diff has no keys, tokens or connection strings |
| S-5 | Tokens or personal data in logs | PASS. The server log has no bearer token, password or session token |
| C-1 | Three simultaneous batch changes into a 1-slot batch | PASS. Exactly one winner, two clear 4xx, nothing half-saved, no history for the losers |
| C-2 | Three simultaneous program changes into a 1-slot batch | PASS. Exactly one winner, no 500 |
| C-3 | Eight simultaneous program changes into a batch with room for three | PASS for safety: ID card numbers are unique and there is no 500. **Only 2 won, 6 got 409** "saved at the same time, please try again" (F-5) |
| C-4 | Four simultaneous edits of one trainee | PASS. No 500 |
| C-5 | Stale save | The change endpoints re-read the enrollment inside a `Serializable` transaction, so a stale view cannot move an enrollment that is no longer active (AC 13) |
| C-6 | History rows append-only | By convention only. No route updates or deletes, and the code never does, but there is no database trigger (F-7) |
| P-1 | Query count as history grows | PASS. 9 SQL statements for a trainee with 1 history row and 9 for one with 500 |
| P-2 | Timing | 500 history rows in 12 ms locally. **Local timing is not Supabase timing.** The history list has no paging (F-6) |
| D-1 | Constants defined in both backend and frontend | Found. The contact pattern `+63` plus 10 digits, the 100 and 50 character limits and the 500 character reason limit are in the DTOs and again in `TraineeEditModal.tsx` and `EnrollmentChangeModal.tsx` (F-8) |

## 6. Frontend and UX (code reading only)

| # | Check | Result |
|---|-------|--------|
| U-1 | Role gating | PASS. `canEdit` is true for Admin only and `canViewHistory` for Admin and Registrar. Trainer and encoder get neither. Routes sit behind `ProtectedRoute` per role |
| U-2 | Edit opens a modal, not a route | The old `/edit` link is gone and no `/edit` route remains |
| U-3 | "From → To" confirmation before a batch or program change | Present (`confirming` step with a summary) |
| U-4 | Loading, empty and error states | Present in the change history section and the change modal (loading, load error, save error) |
| U-5 | Client checks | Required fields, contact pattern, and a required reason. The server repeats them |
| U-6 | Toast and refresh after save | Present. `handleSaved` closes the modal, shows a 4 second toast and reloads the profile and history |
| U-7 | URL state | Not affected. The change is on the profile page, which has no filters |
| U-8 | Seen in a browser | **No** |

## 7. Tests run (full inventory)

| Group | What was run | Result |
|-------|--------------|--------|
| Unit tests in the branch | Jest, 12 suites. None are for the new code | 102 of 102 |
| Unit tests for the new code (written and run, **never committed, then deleted**) | 4 spec files: `enrollments.transfer.service.spec.ts` (service, fake database: update trainee, change options, change batch, change program, payment and uniform, history, errors and write conflicts), `enrollments.transfer.controllers.spec.ts` (routes, methods, role access for every new endpoint, the logged-in admin passed on, no write route for the registrar), `dto/change-enrollment.dto.spec.ts` and `dto/update-trainee.dto.spec.ts` (limits, trimming, bad values, extra fields dropped, email handling) | 215 of 215. Two of them are `it.failing` tests that record the known bug F-15 |
| Whole suite with those specs (before they were deleted) | `npx jest` | 317 of 317 in 16 suites |
| Coverage of the new code | `jest --coverage` on the service, DTOs and controllers | The new service methods (updateTrainee to getTraineeChangeHistory): 82 of 82 statements. `update-trainee.dto.ts` 100%, `change-enrollment.dto.ts` 100% |
| Break-it check | 35 deliberate breaks of the service, DTOs and controllers, one at a time, with the file restored after each (confirmed by `git status`) | **35 of 35 caught.** On the first pass 27 were caught. Of the 8 others, 5 were my script failing to match the file's Windows line endings, 2 changed the wrong occurrence in the file, and 1 was too mild a change. After correcting the script all 8 were caught, so no weak test was found |
| Engineering | Backend eslint, `tsc`, `nest build`, `prisma validate`. Frontend eslint, `tsc -b`, `vite build`. `npm audit` in both | All clean (section 1) |
| Migration | 14 migrations on an empty Postgres 17, then `migrate diff` against `schema.prisma`, with and without the existing TECH-03 drift | 0 differences for the new table |
| End-to-end script | **155 checks**: Security 33, Edit info 28, Change batch 31, Program rules 9, Change program 22, Rollback 4, Concurrency 8, Change history 15, Responses 4, Performance 1 | 155 of 155, and again 155 of 155 as a regression run on a rebuilt database |
| Regression run | Full Jest (317), whole-project `eslint` (0 problems), `tsc --noEmit`, `nest build`, and the end-to-end script again | All clean. The only issue was one cast in my own controller spec, fixed |
| Live probe for F-15 | `PATCH` with `beneficiary` missing, `null` and `{}` | 500, 400, 400. The database was unchanged |
| Performance | Statement logging for 1 and 500 history rows, and `EXPLAIN` of the history query | 9 and 9 statements. Index-only scan |
| Branch | Pushed state, ahead and behind, trial merges with `git merge-tree` into `dev` and `main` | Clean merges. PR state not checked |
| Secrets and test data | Diff scan for keys, tokens and connection strings. `git grep` for the seeded names, ids and passwords | None found |
| Supabase (read-only) | `migrate status`, table existence, row level security on 40 tables, enum labels | Section 2 |
| Manual checks by the owner | Reported in `acceptance.md`: 194 API and 30 browser checks | Not re-run by me |

The first end-to-end runs showed failures that were my own test data: ids that were not valid UUIDs, a seeded ID card number ahead of the sequence, and a login rate limit hit by repeated logins. None came from the code. The login limit is itself a working protection. The counts above are from the final, clean run.

### Where the test data lived and what was cleaned up

| Item | Where | Cleaned up |
|------|-------|------------|
| Throwaway Postgres 17 cluster (port 55432, fake users, programs, batches, trainees). Built twice: for the audit, and again for the regression run | A `pgdata` folder in the session scratchpad, outside the repository | Server stopped and folder deleted after each |
| Backend server on port 38455 | Started from the built `dist`, pointed at the throwaway database only, run from outside the project folder so the project `.env` was not read | Process stopped |
| Seed SQL, the end-to-end script, logs | Session scratchpad, not in the repository | Left in the scratchpad (fake data and a fake test password only) |
| Rebuilt output | Git-ignored `dist` folders, and the git-ignored generated Prisma client | Not tracked. Left in place |
| Docker | Not used. No containers, volumes or images created | Nothing to remove |
| Supabase | Read-only queries only | Nothing written, so nothing to remove |

## 8. Definition of Done items

| Item | Status |
|------|--------|
| Code reviewed and merged into `main` | **NOT DONE.** The branch is pushed, not merged into `dev` or `main`. PR state not checked |
| Tested as admin: edit info, change batch, change program (accredited and non-accredited), full batch, schedule overlap, uniform out of stock, rollback on failure | DONE by this audit, over the API. Not in a browser by me |
| Tested as registrar: change history visible, no edit actions, update endpoints rejected | DONE over the API. The missing edit actions were checked by code reading |

## 9. Decisions that change the ticket

These were made while building or in the Jira comment of 2026-11-04. They are recorded here so the audit does not count them as failures.

| # | Decision | Effect |
|---|----------|--------|
| D-1 | Change history table kept as written (D-01, option A). For `BATCH_CHANGE`, from and to enrollment are the same row | AC 15 and the test cases |
| D-2 | Payment carries over by default because all programs have the same payment | AC 9. The "new payment" option is kept for now (gap G-2) |
| D-3 | A `PENDING` enrollment stays `PENDING` after a program change | Checked, AC 13 |
| D-4 | A contact number is not checked for uniqueness | Only the length check was asked for |
| D-5 | "A batch the trainee was in before cannot be chosen" | **Narrower than written.** Tested: the same enrollment can move back to a batch it held earlier (it is one row, so there is no duplicate). A program change into a batch where the trainee has another row is rejected with 409. The wording in `acceptance.md` decision 2 should say that |
| D-6 | **The old uniform is not returned to stock when a trainee changes program. The trainee keeps it** (decision by the owner, 2026-11-10) | A program change deducts one uniform from the new program only when the admin marks it as given. Nothing is added back to the old program (F-16) |
| D-7 | **The enrollment payment is a one-time payment** (decision by the owner, 2026-11-10). A trainee who shifts program is not charged again, so the payment is carried over and the new enrollment gets no receipt of its own | MP-47 shows the enrollment fee as unpaid for a shifted trainee (F-4). This is listed as a known gap and is not fixed for now. The fee line there is for information only, so withdrawal approval is not blocked |

## 10. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | The branch has no unit tests for the new service methods, DTOs, controllers or the five endpoints. The 102 passing tests are unchanged from `dev`. 215 tests were written and run, then deleted at the owner's request | Medium | Write unit tests for the branch if the team wants them (service, validators, controllers). The first run of them found F-15 |
| F-2 | Migration `20261106_trainee_enrollment_transfers` was not applied on Supabase | Medium | **Closed 2026-11-10.** Applied with `prisma migrate deploy`; `migrate status` says up to date |
| F-3 | Jira says Done (resolved 2026-11-08). On 2026-11-09 the branch was not merged. It is now merged into `dev` (PR #96, 2026-11-10) but not into `staging` or `main`, so the DoD item "merged into `main`" is still open | Low | Accept Done as "built and in `dev`", or keep it open until `main` |
| F-4 | A shifted trainee's new enrollment has no receipt, so MP-47 (already on `dev`) reads it as an unpaid enrollment fee. The profile also hides the carried-over OR (remarks) and `exit_reason`. Listed as Known Gaps 1 and 3 in `acceptance.md`. Read in code (`withdrawal.service.ts` reads the enrollment's receipts), not run | Medium | **Known gap, accepted for now (decision D-7).** Later options: follow the transfer chain in MP-47, or record a zero-amount carried receipt |
| F-5 | Under heavy parallel use, program changes into the same batch mostly end in 409 "try again" even when the batch has room (2 of 8 won; room for 3). Safe and clear, but a nuisance | Low | Accept for admin-only, low-volume use. Revisit if admins complain |
| F-6 | The change history endpoints return every row with no paging | Low | Fine for the expected volume (500 rows in 12 ms, 9 statements). Add a cap if histories grow |
| F-7 | History is append-only by convention only. No database trigger blocks UPDATE or DELETE | Low | Same as the other history tables. Optional later |
| F-8 | Limits and the contact pattern are duplicated in the DTOs and in the two modals | Low | Accept, or share through a small constants file |
| F-9 | The generated Prisma client is git-ignored, so `tsc` fails on a fresh checkout (7 errors) until `prisma generate` runs. `start:dev` runs it, but a build or CI step might not | Low (existing) | Make sure the build and CI run `prisma generate` first |
| F-10 | Row level security is off on all 40 Supabase tables, including this one when created | Low (existing) | Same as every table. Keep in mind for the whole project |
| F-11 | A unique clash on `id_card_number` (for example if a number already exists ahead of `batch_seq`) comes back as a 500, not a clear message. Seen while seeding. Logged as TECH-05 | Low (existing) | See `technical/id-card-sequence-collision` |
| F-12 | A new payment on a program change uses the existing base fee rule (500 without insurance, 450 with). That is TECH-04 | Medium (existing) | Fix TECH-04 once, in one place |
| F-13 | TECH-03 (migration history against `schema.prisma`) meant I had to align 3 enums and 5 trainer columns on the throwaway database before the app would run on it | Medium (existing) | See TECH-03 |
| F-14 | Untracked `text.txt` in the working tree | Low | Do not commit it |
| F-15 | `PATCH /admin/trainees/:id` with no `beneficiary` field returns **500**. `@ValidateNested()` skips a missing value, and the service then reads a field of `undefined`. `null` and `{}` are correctly 400. Nothing is saved (rolled back). Breaks AC 2 ("not a server error") for a client that leaves the object out. The Edit form always sends it. The enrollment form shares `TraineeDetailsDto`, so `POST` enrollments may have the same weakness (not tested) **Cause:** a code gap, not an account problem. It depends on what the request sends, not on which trainee it is for. The validator skips a missing field, then the service reads a field of `undefined` and crashes (rolled back, nothing saved). A trainee with no beneficiary row yet is fine: `saveBeneficiary` is an upsert, so the row is created on save (by code reading, not tested). The Edit form always sends the object, so only a direct API call can trigger it. | Medium | Add `@IsDefined()` (or `@IsNotEmptyObject()`) to `beneficiary` in `TraineeDetailsDto`. The deleted specs had two tests for exactly this case, so add one when unit tests are written |
| F-16 | Uniform stock on a program change. Tested on the Docker database (Cookery M = 1, Welding M = 5): a batch change does not touch stock; a program change with the uniform not given does not touch stock; a program change with the uniform given and size M deducts 1 from the new program (Cookery M 1 to 0), writes a `DISTRIBUTED` stock log entry and sets the new checklist to given, size M; with Cookery M at 0 the same request is refused with 400 "No M uniform is currently in stock for this program" and the trainee stays in the old batch. The old program's stock stays at 5, because nothing is returned (decision D-6). A trainee who already received a uniform and then marks a new one as given costs the stock two uniforms | Low (decision recorded) | Accepted by the owner: the trainee keeps the old uniform. Known gap, not a bug. Revisit if stock counts drift. The modal could warn the admin when the old enrollment already has a uniform given |
| F-17 | New `npm audit` advisories since 2026-11-09, found in the 2026-11-10 re-check: backend 28 (5 low, 23 moderate), frontend 10 (moderate), 0 high or critical. All are in test and lint tools (jest, ts-jest, eslint, typescript-eslint, `@nestjs/cli`, minimatch, glob). `npm audit --omit=dev` is still 0 in both, so nothing that ships is affected. Not caused by this branch | Low | Update the dev tools in a separate chore. Most fixes are major upgrades (jest, `@nestjs/cli`, eslint), so test them first. Do not run `npm audit fix --force` |

## 11. Gaps to ask the product owner

1. **"Record a new payment instead": still needed?** All programs have the same payment, so a new payment would only be used if the admin wants to charge again. Options: keep it (current, and it works), or remove it to simplify the modal. Removing it would also take away the only path that records a receipt for the new enrollment (see F-4).
2. **How should MP-47 treat a shifted trainee?** Options: follow the `enrollment_transfers` chain to the original receipt, or record a zero-amount carried receipt on the new enrollment.
3. **Jira status.** Keep Done, or move back to In Review until the merge into `main`.

## 12. Release steps still open

1. Decide F-15 (fix the missing-beneficiary 500) and F-1 (write unit tests for the branch). F-4 (MP-47 interaction) is a known gap by decision D-7.
2. ~~Open or find the pull request, review it, and merge into `dev`.~~ Done: PR #96, 2026-11-10.
3. ~~The PM applies the migration to Supabase.~~ Done on 2026-11-10; `prisma migrate status` says "Database schema is up to date!".
4. After `dev`, `staging` and `main` promotion, check one real batch change and one program change in a browser, then re-run the read-only Supabase checks (table shape, orphan rows, history rows against enrollments).
5. Update the Jira status to match.
