# Dev before staging: Definition of Done Audit (MP-49 and the four features together)

| Field | Value |
|-------|-------|
| **Date** | 2026-11-10 |
| **Audited** | `origin/dev` at `8695eff` (merge of PR #101, MP-49), in a clean checkout with nothing uncommitted. Local `dev` has one extra unpushed docs commit (`537432f`, the MP-47 dev audit). It changes no code and is not part of the audited commit |
| **Compared with** | `origin/staging` at `6549a8c` and `origin/main` at `2a07943`. `dev` is 13 commits ahead of `staging`. `staging` has 2 commits `dev` lacks, both merge commits with no file changes. The delta is 19 files (+1610, −27): the MP-49 backend (controller, module, 2 DTOs, 208 lines in `withdrawal.service.ts`), the admin withdrawal page and panel, the route and sidebar link, and docs. **0 migrations. `schema.prisma` and both `package.json` files unchanged** |
| **Jira status** | MP-49 is **Done** (resolved 2026-11-10 09:54), assignee Chelsea Cllj, MP Sprint 4. 12 acceptance criteria, no comments. The code is on `dev` only, not on `staging` or `main` (finding F-3) |
| **How it was run** | A clean checkout of `dev` with the installed packages (lockfiles identical to the earlier tested install). Lint, type-check, build and tests in both projects. A throwaway Postgres 17 in Docker (a new database `audit_dev` in container `mp42_pg`, port 5443), built from all 14 migrations on an empty database, seeded with fake data. The built backend ran against it and 102 end-to-end checks were sent over real HTTP. The MP-41, MP-42 and MP-47 scripts were re-run on the merged build. The shared Supabase database was read with read-only queries only (a read-only transaction) |
| **Not audited** | The admin withdrawal page in a real browser (list, side panel, ID tick, approve, reject: TC-A11 to TC-A15), by me. One real sign-off on Supabase (writes are not allowed there). Photo upload to real storage. Supabase timing (local timing is not Supabase timing). The unit tests of MP-49 as part of the repository: there are none (finding F-1) |
| **Definition of Done used** | The Jira "Definition of Done" (7 items) and the 12 acceptance criteria of MP-49, the backlog rows A-1 to A-11 in `shared/withdrawal/acceptance.md`, and the earlier audits of MP-41, MP-42, MP-47 and MP-49 for the combined behaviour |

## Verdict

**`dev` is ready to be promoted to `staging`. Not ready for `main` until the admin page has been seen in a browser and the open decisions below are answered.** The code meets 11 of the 12 acceptance criteria with evidence and 1 is PARTIAL (the side panel has not been seen in a browser). Nothing blocks `staging`.

1. **Behaviour is correct.** 101 of 102 end-to-end checks pass on a clean database. The one failure is a small finding (F-2), not a break of an acceptance criterion. The checks cover every endpoint with no token and with every other role, validation (7 bad bodies, bad and unknown ids, extra fields), sign-off at each wrong stage, approve, reject, four simultaneous approvals (one winner, three clean 400), an approve and a reject at the same moment, a rollback when the enrollment is already completed, and the whole pipeline from the trainee to the admin.
2. **The four features work together.** The MP-47 script passes 109 of 109 on its own fixture. The MP-41 smoke test passes 69 of 70 (the known fake-image 500). The MP-42 flow passes 28 of 29 (the known missing-`beneficiary` 500, F-15). A request from a trainee who changed program or batch (MP-42) shows up for the admin and can be signed off, and the MP-41 profile and the MP-42 history still load afterwards.
3. **No migration, no schema change, no package change** in the delta. The 14 migrations apply to an empty database in order. `prisma migrate diff` shows only the known drift (TECH-03: 3 enums and 5 trainer columns) and nothing on the withdrawal or transfer tables. Supabase says "Database schema is up to date!" (14 of 14).
4. **One small new finding (F-2, TECH-06):** a search for `%` or `_` matches every row in the withdrawal lists. Low severity.
5. **Open decisions that need an answer before `main`:** what happens to the trainee's account after approval (F-4), and what happens to an open withdrawal request when the admin changes the trainee's program (F-6, now tested).
6. **Jira says Done before the release.** MP-49 is not on `staging` or `main` (F-3), and its browser cases have not been run.

## 1. Engineering checks

Run on `origin/dev` at `8695eff` (clean checkout, `prisma generate` first):

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (no fix) | 0 problems |
| 2 | Backend `tsc --noEmit` | Clean |
| 3 | Backend `nest build` | Clean |
| 4 | Backend `jest` | **102 of 102** (12 suites). None of them is for the MP-49 code (F-1) |
| 5 | `prisma validate` | Valid |
| 6 | Frontend `eslint` | 0 problems |
| 7 | Frontend `tsc -b` | Clean |
| 8 | Frontend `vite build` | Built (only the usual chunk-size notice) |
| 9 | `npm audit --omit=dev`, backend and frontend | **0 vulnerabilities in both** |
| 10 | `npm audit` (everything), backend and frontend | Backend 28 (5 low, 23 moderate), frontend 10 (moderate), none high or critical, all in test and lint tools. Already logged as F-17 of the MP-42 audit. Not from this change |
| 11 | Secrets and stray files in the delta | No `.env` tracked, no keys, tokens or connection strings in the diff, no `text.txt` tracked. The only hits for "password_hash" and "secret" are sentences in the docs |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 12 | Migrations in the delta | **0**. `schema.prisma` and `package.json` unchanged |
| 13 | All 14 migrations on an empty database, in order | All applied (0_init with its byte-order mark removed in memory only, TECH-02). 40 tables |
| 14 | `prisma migrate diff` (migrated database against `schema.prisma`) | Only the known drift, TECH-03: 3 enums and 5 trainer columns. **0 items on the withdrawal or transfer tables** |
| 15 | Withdrawal tables: foreign keys | 7, all present: the request to the enrollment, to the trainer, registrar and admin users and the reviewer; the history to the request and to its actor |
| 16 | Indexes for the new queries | `idx_withdrawal_status`, `idx_withdrawal_enrollment`, `idx_withdrawal_history_request_changed`. The admin list filters on status, so it is covered |
| 17 | `withdrawal_status_enum` | 6 values: `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `PENDING_ADMIN_SIGNOFF`, `APPROVED`, `REJECTED`, `CANCELLED` |
| 18 | Supabase (read-only): migrations | `migrate status`: 14 found, "Database schema is up to date!". The migration table has 15 rows and 14 finished: one is an old rolled-back attempt of `20260914_add_program_schedule`, later applied. Harmless and existing |
| 19 | Supabase (read-only): shape and consistency | 1 withdrawal request (`TRAINER_VALIDATED`, waiting for the registrar), 0 at the admin step, 0 signed off by an admin. 0 approved requests with an enrollment that is not `WITHDRAWN`. 0 requests without a history row. 0 orphan history rows. 0 enrollments with more than one open request. 0 `enrollment_transfers` rows and 0 pointing at a missing enrollment |
| 20 | Row level security | **Off on all 41 tables** (also on the withdrawal and transfer tables), so the new tables match the others. Existing finding A-2 |

## 3. Evidence from real use

Supabase holds one real request, waiting for the registrar. Nothing has reached the admin step there yet, so the admin sign-off has not been used on real data. The first real sign-off is a release check (section 12). The 9 accounts on Supabase that look like test accounts (`MCCTP-26-00x`, `TRN-26-00x`) came from the project's own data, not from this audit: the audit never writes to Supabase.

## 4. Acceptance Criteria

The 12 criteria of MP-49 in Jira (the same 12 as in `acceptance.md`, rows A-1 to A-7 and A-3a):

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Admin sees all withdrawal requests with filters and search | PASS | `status=ALL` returned all 10 requests of the seed (not scoped to a batch). Status, program and batch filters, name and system ID search, and paging (limit 3, page 2: 3 rows, 4 pages) work. Bad status, bad ids, `limit=51` and `page=0` give 400. The page uses the same API (code reading) |
| 2 | Default view shows what waits for the admin | PASS | The default list held exactly the 5 requests at `PENDING_ADMIN_SIGNOFF` |
| 3 | Sign-off only when `PENDING_ADMIN_SIGNOFF` | PASS | Sign-off at `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `REJECTED` and `CANCELLED` each gave 400 and changed nothing |
| 4 | Approval sets `APPROVED` and `WITHDRAWN` atomically | PASS | One transaction (`withdrawal.service.ts` `signOffByAdmin`). A forced failure (the enrollment already `COMPLETED`) gave 409 and rolled back: the request stayed waiting, no history row, the enrollment unchanged |
| 5 | Rejection leaves the enrollment unchanged | PASS | The enrollment stayed `ENROLLED` after a reject at the admin step, and the trainee could submit a new request |
| 6 | The panel shows the trainer validation, the registrar checks, the ID confirmation and the timeline | PARTIAL | The API detail carries all of it (`trainerRemarks`, `checklist`, `enrollmentFee`, `requirements`, `idSurrendered`, `adminRemarks`, `stages`, `history`). The panel was read in code (sections, Escape closes, dialog role) but **not seen in a browser** |
| 7 | Every action creates a history row | PASS | Approve and reject each added exactly one row (old status, new status, the admin, the time). The full pipeline shows `TRAINEE, TRAINER, REGISTRAR, ADMIN` in order |
| 8 | Sign-off on a non-ready request returns 400 | PASS | See criterion 3. Also a second sign-off on a request already signed off gives 400 |
| 9 | Responses exclude `password_hash` | PASS | No password, hash or token text in the list, detail, filter options, sign-off or an error response |
| 10 | Non-admin roles get 403 | PASS | 21 checks: 4 endpoints with no token (401) and as trainee, trainer, registrar and encoder (403 each). The refused calls changed nothing |
| 11 | Pages type-check, build and lint with 0 problems | PASS | Section 1 |
| 12 | Approval needs the ID surrendered tick | PASS | Approve with no `surrendered_id`, with `false` and with text `"yes"` gave 400. Approve with `true` saved `true`. A reject saved the value as sent (`false`). The registrar never sets it |

**Totals: 11 PASS, 1 PARTIAL, 0 NOT MET (12).**

### Jira Definition of Done (7 items)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| D-1 | All 5 withdrawal tickets (MP-45 to MP-49) merged | PARTIAL | All five are on `dev`. MP-45 to MP-48 are also on `staging` and `main`. MP-49 is on `dev` only |
| D-2 | Full pipeline tested end to end | PASS | Trainee, trainer, registrar, admin approves, enrollment `WITHDRAWN`, with a history row per step and the right role |
| D-3 | Rejection tested at each stage | PASS | Trainer, registrar and admin rejections each worked |
| D-4 | Registrar cannot act before the trainer (400) | PASS | 400 |
| D-5 | Admin cannot approve without the ID tick (400) | PASS | 400 |
| D-6 | Cancellation by the trainee tested | PASS | Works. The trainee cannot cancel once the request is at the admin step |
| D-7 | Pipeline view shows the right status at every step | PARTIAL | The API status and history are right at every step. The progress view in a browser was not seen |

**Totals: 5 PASS, 2 PARTIAL (7).**

### Test cases of the module (`acceptance.md`, A-1 to A-11)

A-1 to A-8 are PASS (the rows above). A-9 (unit tests): **the repository has none for MP-49**. The 65 tests written earlier (2 spec files, 65 of 65 pass today) are kept local on purpose (decision D-11) and are not in `dev`. A-10 (pages in a browser): NOT RUN. A-11 (released on its own): on `dev`, not on `staging` or `main`.

## 5. Security, concurrency, performance, configuration

| Area | Result |
|------|--------|
| Authentication and roles | All four admin endpoints answer 401 with no token and 403 to a trainee, trainer, registrar and encoder. `@Roles(Role.ADMIN)` with `JwtAuthGuard` and `RolesGuard`. The admin always comes from the token, never from the body |
| Sensitive fields | No `password`, `hash` or session text in any response. An error response carries no stack trace or SQL |
| Input validation | `action` must be `APPROVE` or `REJECT` (lowercase and unknown values give 400). `remarks` over 1000 characters give 400, blank remarks become empty. `surrendered_id` must be a boolean. Malformed ids give 400, unknown ids 404. Extra fields in the body (`status`, `withdrawal_status`, `admin_signed_off_by`, `password_hash`, `enrollment_status`) are dropped or refused and never applied. A 2 MB body is refused without a server error |
| Concurrency | Four simultaneous approvals of one request: exactly one 200, three clean 400, one history row. An approve and a reject at the same moment: one wins, and the request and the enrollment agree. The update is a conditional `updateMany` on the status inside one transaction |
| Integrity | A request whose enrollment is already `COMPLETED` cannot be approved: 409 and a full rollback. History rows are append-only **by convention only**: no trigger blocks UPDATE or DELETE, the same as the other history tables |
| Performance | The database statements per request stay fixed as the data grows (counted from the database log): 11 for the default list, 19 for the list of all with limit 50, 25 for a search, 19 for filter options, 24 for a detail, the same at **7 requests and at 3007 requests (3023 history rows)**. A sign-off took 34 statements. All answered in 8 to 40 ms locally, which is not Supabase timing |
| Config duplication | The remarks limit (1000) is in both the DTO and the panel. The page sizes (10, 20, 50) are in both the query DTO (cap 50) and the page. Low risk, the same as the other modules |

## 6. Frontend and UX (code reading only)

- Route `/admin/withdrawal-requests` is inside `ProtectedRoute allowedRoles={['ADMIN']}` and lazy loaded. The sidebar link is in the admin group only.
- Filters, search, page and limit live in the URL (`useSearchParams`), so a refresh keeps them.
- States exist: "Loading requests…", an error message with a retry, and three empty texts ("No requests match your filters.", "Nothing is waiting for your sign-off.", "No requests with this status.").
- The panel: Escape closes it, `role="dialog"`, remarks capped at 1000, the approve button stays off until the ID tick is set and while saving, and the form is disabled while saving.
- **Not seen in a browser by me:** all of the above, the phone and tablet layout, and one real sign-off.

## 7. Tests run (full inventory)

| Group | What was run | Result |
|-------|--------------|--------|
| Engineering | Backend eslint, `tsc`, `nest build`, `prisma validate`. Frontend eslint, `tsc -b`, `vite build`. `npm audit` and `npm audit --omit=dev` in both | All clean. Audit: 0 for what ships, 28 and 10 in dev tools |
| Unit tests in the repository | `jest`, 12 suites | **102 of 102**. None for MP-49 |
| Unit tests kept local (decision D-11) | `withdrawal.admin.service.spec.ts` and `admin-withdrawal.controller.spec.ts`, untracked | 65 of 65 pass. Not in the repository and not committed |
| Break-it check | Not run for the local tests in this audit | NOT RUN. It was done when those tests were written |
| MP-49 end-to-end script (new, 102 checks) | Setup 1, Security 21, Getting requests to the admin step 9, List and filters 13, Detail 6, Sign-off validation 17, Approve 10, Reject 5, Concurrency and rollback 6, History and response integrity 6, Whole pipeline and cancellation 7 | **101 passed, 1 failed** (the `%` search, F-2) |
| MP-47 regression (registrar withdrawal script) | On its own seed (1 program, 1 batch) | **109 of 109**. On a seed with extra programs and batches 107 of 109: its two failing checks count exactly 1 program and 1 batch, so that is the script's assumption, not a defect |
| MP-41 regression (profile smoke test) | On the merged build | 69 of 70. The failure is the known fake-image 500 |
| MP-42 regression (admin edit and change flow) | On the merged build | 28 of 29. The failure is the known missing-`beneficiary` 500 (F-15) |
| Four features together | A program change on a trainee with an open request, a batch change with an open request, approve and reject through all roles, profile and history after the withdrawal | Results in F-6 and the earlier combined run on `fa0035e` (all pass) |
| Migrations and database | 14 migrations on an empty database, `migrate diff`, foreign keys, indexes, enum | Section 2 |
| Supabase (read-only transaction) | `migrate status`, consistency counts, row level security, migration table | Section 2 |
| Performance | Statements per request at 7 and at 3007 requests | Fixed counts (section 5) |
| Manual checks by the owner | None recorded for the admin page | The owner has checked the MP-41 and MP-42 pages in a browser. The admin page is not recorded |

### Where the test data lived and what was cleaned up

| What | Where | Cleaned up |
|------|-------|------------|
| Fake users, programs, batches, enrollments, 3000 bulk requests | The throwaway database `audit_dev` in Docker container `mp42_pg` (port 5443). Never in the repository, never on Supabase | The database `audit_dev` was dropped. The container `mp42_pg` itself was created earlier for the MP-42 checks and is still running; remove it with `docker rm -f -v mp42_pg` when you no longer need it |
| Test scripts, seed SQL, helper files, working copies of the code | The session scratch folder, outside the repository | Left there, not in the repository. `git grep` for the seeded password, the test secret and the test reasons outside the spec files found nothing |
| The backend started for the audit (port 3900) | A local process | Stopped |
| Supabase | Read-only queries only, inside a read-only transaction | Nothing to clean. The test-looking accounts found there are from real use |

## 8. Definition of Done section items

See the table "Jira Definition of Done" in section 4: 5 PASS, 2 PARTIAL (D-1 and D-7).

## 9. Decisions that change the ticket

| # | Decision | Effect |
|---|----------|--------|
| D-1 | Account after approval: **option A**, only the enrollment becomes `WITHDRAWN`, the account stays as it is (to-be-discussed item 9). A TODO sits in `signOffByAdmin` | The Jira text says "become inactive" in the title but the background says option A for now. Checked: after approval `users.is_active` stays true |
| D-2 | The admin confirms the ID surrendered (D-09, 2026-11-06). The registrar never sets it | Criteria 6 and 12 |
| D-3 | MP-49 unit test files stay local (D-11) | A-9 stays PARTIAL, F-1 |
| D-4 | From the MP-42 audit: payment is one-time (D-7), old uniform stays with the trainee (D-6) | The withdrawal fee line shows "unpaid" for a trainee who changed program, F-4 of that audit |

## 10. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | The repository has no unit tests for the MP-49 code. 65 tests exist only on the owner's computer (decision D-11) and pass | Medium (decision) | Keep as decided, or commit the two spec files so CI runs them |
| F-2 | A search for `%` or `_` matches every row in the withdrawal lists (17 of 17 on the test data). `TRN_26_004` matches `TRN-26-004`. Prisma `contains` does not escape the wildcards. The same code serves the registrar and trainer lists. Nothing leaks: the rows are ones the role may see | Low | Logged as TECH-06 (`technical/search-wildcards`). Escape the term as `requirements.service.ts` already does |
| F-3 | Jira MP-49 says Done (resolved 2026-11-10) but the code is on `dev` only. The admin page browser cases (TC-A11 to TC-A15) have not been run | Medium | Accept Done as "built and in `dev`", or move to In Review until `main`. Run the browser cases on `staging` |
| F-4 | After approval the trainee's account stays active (decision option A). A withdrawn trainee can still log in | Medium (decision open) | Decide A, B or C (to-be-discussed item 9, open item O-24). `users.is_active` exists and login already rejects inactive accounts, so no schema change |
| F-5 | The old `request_status` column stays `PENDING` on every finished request (1204 of 1204 finished rows in the performance test) | Low | Decide to keep or retire it (open item O-25) |
| F-6 | **Tested: a program change (MP-42) while a withdrawal request is open.** The old enrollment becomes `WITHDRAWN` and the open request stays at its stage, pointing at that withdrawn enrollment. The registrar and admin can still approve it (200 each), and the approval changes nothing, because the old enrollment is already `WITHDRAWN`. The trainee stays `ENROLLED` in the new program. A batch change with an open request is fine: the request follows the same enrollment to the new batch | Medium (decision) | Decide (open item O-15, to-be-discussed item 17): cancel or move the open request when the program changes, or block the program change while a request is open |
| F-7 | History rows are append-only by convention only, no trigger | Low | Optional, the same as the other history tables |
| F-8 | Row level security is off on all 41 tables | Low (existing) | Open item O-28 |
| F-9 | New `npm audit` advisories in dev tools only (28 backend, 10 frontend, none high or critical). `npm audit --omit=dev` is 0 | Low | See F-17 of the MP-42 audit and open item O-30. Do not run `--force` |
| F-10 | The earlier problems of MP-41, MP-42 and MP-47 are unchanged: the fake image 500, the failed old-photo clean-up, the missing-`beneficiary` 500 (F-15), the MP-47 fee line for a shifted trainee | Medium and Low | See `open-items.md` |
| F-11 | The MP-47 regression script counts exactly 1 program and 1 batch, so it fails 2 checks on a database with extra data | Low | Test script only, not part of the repository |

## 11. Gaps to ask the product owner

1. **What happens to the trainee's account after approval?** A: only the enrollment (today). B: deactivate the account. C: deactivate only if no other active enrollment. This also decides whether a trainee who withdrew can still log in.
2. **What should happen to an open withdrawal request when the admin changes the trainee's program?** Options: cancel the request automatically with a history row, move it to the new enrollment, or refuse the program change while a request is open.
3. **Must the admin give a reason to reject?** Today it is optional.
4. **Should the trainee's reason be copied into `exit_reason` on approval?**

## 12. Release steps still open

1. Merge `dev` into `staging` (the delta is 19 files, 0 migrations). Nothing to apply on Supabase.
2. On `staging`, run the admin page in a browser: list, side panel, ID tick, approve and reject (TC-A11 to TC-A15), and one real sign-off, then re-run the read-only Supabase checks (section 2, item 19).
3. Decide the open questions in section 11 before `main`.
4. Decide whether F-3 (Jira Done) stays or goes back to In Review until `main`.
5. After `main`, update the push log, move the open items, and check `main` matches `staging`.
