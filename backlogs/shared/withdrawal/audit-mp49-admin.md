# Withdrawal, Admin Final Sign-off (MP-49): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-09 |
| **Audited** | Branch `feature/MP-49-admin-withdrawal-signoff` at `c825ad9`, pushed (the remote branch is the same commit). 3 commits: backend `b3fe592`, frontend `b4c4ad7`, docs `c825ad9`. Working tree: two untracked spec files (kept local by decision D-11) and the stray `text.txt` |
| **Compared with** | `origin/dev` at `11ad2c9`. The branch is 0 behind and 3 ahead. Against `origin/main`: 9 ahead, 2 behind. 14 files changed (+1218, −20). **0 migrations added**, 0 packages changed |
| **Jira status** | In Review (checked 2026-11-09), assignee Chelsea Cllj, MP Sprint 4. 12 acceptance criteria, no comments |
| **How it was run** | A throwaway Postgres 17 in Docker built from all 13 migrations and filled with fake data, the backend built from the pushed commit and started against it, 114 end-to-end checks over real HTTP. A second pass counted SQL statements for a small and a big list. Supabase was read with read-only queries only. Everything was removed afterwards (section 7) |
| **Not audited** | The pages in a real browser (TC-A11 to TC-A15). Two admins using the screens at the same time. A real sign-off on Supabase (writes are not allowed there). Supabase timing. Responsive layout (code reading only). The deployed site |
| **Definition of Done used** | The Jira "Definition of Done" section (7 items) and its 12 acceptance criteria, plus the backlog rows A-1 to A-11 in `acceptance.md` |

## Verdict

**The code meets all 12 acceptance criteria over the API and is ready to merge into `dev`. The ticket is not done as the Definition of Done defines it: the pages have not been seen in a browser, and the branch is not merged.**

1. **Behaviour is correct.** 114 of 114 end-to-end checks pass on a fresh database: the whole pipeline, rejection at every stage, cancellation, the registrar blocked before the trainer, the ID tick, every wrong status, forced-failure rollback, five simultaneous sign-offs, and every 401 and 403.
2. **No migration.** The admin columns came with MP-45. Supabase `migrate status` already says "up to date" for this branch's 13 migrations, so nothing has to be applied before the merge.
3. **Engineering checks are clean.** Lint, type-check, build and `npm audit` (0 vulnerabilities in both projects), 167 of 167 tests.
4. **No browser check yet.** The list, side panel, ID tick and confirm step were checked by code reading and through the API only. This is the main open item for the Definition of Done.
5. **Unit tests are not in the branch, by decision D-11.** 65 tests exist locally and a break-it run caught 19 of 19. They are untracked.
6. **Not merged.** The branch is pushed. A trial merge into `dev` and into `main` has no conflicts. The Jira DoD item "all 5 withdrawal tickets are merged" is open until this one is.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend `jest` | PASS, 167 of 167 (14 suites). In the branch alone: the 102 existing tests plus the registrar and trainer ones, none for the admin code. With my 2 local spec files: 65 more (section 7) |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS. Main bundle over the 500 kB warning (existing) |
| 7 | `npm audit --omit=dev`, backend and frontend | 0 vulnerabilities in both |
| 8 | New dependencies | None |
| 9 | Frontend tests | The frontend has no test script |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 10 | Migrations added compared with `origin/dev` | PASS. 0, as expected. Nothing in `prisma/` changed |
| 11 | All 13 migrations applied to an empty database, in order | PASS, 0 errors (byte-order mark stripped in memory, TECH-02) |
| 12 | Database from migrations compared with `schema.prisma` | PASS for the withdrawal tables: 0 differences. After aligning the known TECH-03 items on the throwaway database, `migrate diff` found nothing |
| 13 | Foreign keys and indexes for the new queries | PASS. The list uses the existing `idx_withdrawal_status` and `idx_withdrawal_enrollment` indexes from MP-45 |
| 14 | Supabase: migrations | PASS. 13 found, "Database schema is up to date" |
| 15 | Supabase: admin columns exist | PASS. `admin_signed_off_by`, `admin_signed_off_at`, `admin_remarks`, `surrendered_id` |
| 16 | Supabase: inconsistent rows | PASS. 0 approved requests whose enrollment is not `WITHDRAWN`, 0 approved requests with no admin or no ID confirmation, 0 orphan history rows |
| 17 | Supabase: current requests | 1 request, status `TRAINER_VALIDATED` (waiting for the registrar). None is at `PENDING_ADMIN_SIGNOFF`, so the admin list will open empty |
| 18 | Row level security on the withdrawal tables | Off, the same as every other table (existing, finding F-9) |

## 3. Evidence from real use

None on the shared database. No request there has reached the admin step, and writes are not allowed there. The behaviour was exercised on the throwaway database (sections 4 and 7).

## 4. Acceptance Criteria

Numbered as in Jira (12). The backlog `acceptance.md` has A-1 to A-7 and A-3a, plus A-8 to A-11 added during the build, and shared pipeline rows 7 to 10. The mapping is in section 4a.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Admin sees all withdrawal requests with filters and search | PASS (API and code) | Status, program, batch, name and system-ID filters, server-side pagination. Not scoped to a batch: requests from two programs appear. Bad values (status, limit 51, page 0, bad ids) give 400 |
| 2 | Default view shows requests awaiting admin sign-off | PASS (API and code) | Default returns only `PENDING_ADMIN_SIGNOFF`. `ALL` and each status can be chosen. The page opens on "Waiting for my sign-off" |
| 3 | Sign-off only when `PENDING_ADMIN_SIGNOFF`, after the trainer and then the registrar | PASS | Approve and reject on every other status (still with the trainer, with the registrar, approved, rejected, cancelled): 400, nothing changed, no history row |
| 4 | On approval, `APPROVED` and `WITHDRAWN` happen atomically | PASS | One transaction. A forced failure at the history step, and another at the enrollment step, each left the request waiting, the enrollment unchanged and no history row. The same request then signed off normally |
| 5 | On rejection, the enrollment status is unchanged | PASS | Admin reject, with and without a `surrendered_id` value: enrollment still `ENROLLED` |
| 6 | The detail panel shows trainer validation, the registrar's two checks, the ID confirmation and the full timeline | PASS (API data and code). Browser not run | Detail returns who, when and remarks for both validators, both checks, `idSurrendered` and the 3-entry timeline oldest first. The panel renders each in its own section |
| 7 | Every action creates a `withdrawal_status_history` row | PASS | Each pipeline step wrote one row. The sign-off row is `PENDING_ADMIN_SIGNOFF` to `APPROVED` or `REJECTED`, with the admin's id and remarks |
| 8 | Sign-off on a non-ready request returns 400 | PASS | Same checks as AC 3 |
| 9 | All responses exclude `password_hash` | PASS | No `password` or `hash` in the list, detail, filter-options or sign-off responses |
| 10 | Non-admin roles get 403 | PASS | All 4 endpoints with registrar, trainer, encoder and trainee: 403. No token: 401. The 403 calls changed nothing |
| 11 | Pages type-check, build and lint with 0 problems | PASS | Section 1 |
| 12 | Approval needs the ID surrendered tick (400 without it). Saved in `surrendered_id`. Reject does not need it. The registrar never sets it | PASS | Missing and `false` both give 400 and change nothing. `true` is saved. Reject works with no value and saves the value if sent |

**Totals: 12 PASS, 0 PARTIAL, 0 NOT MET = 12.** AC 1, 2 and 6 are about screens: they are PASS over the API and by code reading, and the browser run is the open item in section 8.

### 4a. Jira against `acceptance.md`

| Jira | `acceptance.md` | Note |
|------|-----------------|------|
| 1, 2 | A-1 | One row covers the list, the filters and the default |
| 3, 8 | A-2, shared rule 9 | |
| 4, 5 | A-3 | |
| 6 | A-4 | |
| 7 | shared rule 10 | History is only a pipeline rule, not an A-row |
| 9, 10 | A-5 | |
| 11 | A-7 | |
| 12 | A-3a | |
| none | A-8 to A-11 | Added during the build: concurrency, unit tests, browser, release |

The content matches. Only the numbering differs. Before this build all A-rows said "NOT STARTED" and shared rules 7 to 10 were stale. They are updated.

### Test cases

| Test case | Result | Covered by |
|-----------|--------|------------|
| TC-A1 Access and ids | PASS | AC 9, 10 |
| TC-A2 List and filters | PASS | AC 1, 2 |
| TC-A3 Detail | PASS | AC 6 |
| TC-A4 Wrong statuses | PASS | AC 3, 8 |
| TC-A5 Whole pipeline and ID tick | PASS | AC 4, 7, 12 |
| TC-A6 Admin reject | PASS | AC 5 |
| TC-A7 Reject at each stage and cancellation | PASS | Definition of Done |
| TC-A8 Forced failure | PASS | AC 4 |
| TC-A9 Simultaneous sign-offs | PASS | Integrity |
| TC-A10 Enrollment already completed, dropped or withdrawn | PASS | Decision 2 |
| TC-A11 to TC-A15 Browser | NOT RUN | Section 8 |

## 5. Security, concurrency, performance, configuration

| # | Check | Result |
|---|-------|--------|
| S-1 | 401 and 403 on every endpoint | PASS (AC 10) |
| S-2 | Input validated | PASS. `action` must be `APPROVE` or `REJECT`, `surrendered_id` must be a boolean, remarks are trimmed and limited to 1000, ids must be UUIDs, unknown fields are dropped (a body that named another admin, a status and an enrollment status changed nothing) |
| S-3 | Sensitive fields in responses | PASS (AC 9) |
| S-4 | Secrets committed | PASS. No `.env` tracked, and no keys, tokens or connection strings in the diff |
| S-5 | Tokens or personal data in logs | PASS. The server log has no bearer token, password or session token (the one search hit is a route name) |
| S-6 | Test data in the repository | PASS. No seeded names, ids or passwords in tracked files |
| C-1 | Five simultaneous sign-offs of one request | PASS. One winner, the others 400, one history row, the enrollment withdrawn once |
| C-2 | Approve and reject at the same moment | PASS. One winner, and the enrollment matches the winner |
| C-3 | Stale view | The update is conditional on `PENDING_ADMIN_SIGNOFF`, so a request someone else already signed off gives a clean 400 and the panel reloads to the real state |
| C-4 | Bulk operations | None |
| C-5 | History rows append-only | By convention only. The admin controller has no update or delete route and the code never updates or deletes history, but there is no database trigger (same as the other history tables) |
| P-1 | Query count as the list grows | PASS. 10 SQL statements for a page of 5 and 10 for a page of 50, out of 81 requests. The detail runs 14 |
| P-2 | Timing | List of 50: 23 ms locally. **Local timing is not Supabase timing** |
| D-1 | Constants defined in both backend and frontend | Found. The remarks limit (1000), the page sizes (10, 20, 50 with the server maximum of 50) and the status list are in both (finding F-7) |

## 6. Frontend and UX (code reading only)

| # | Check | Result |
|---|-------|--------|
| U-1 | Route is role-gated | PASS. `/admin/withdrawal-requests` sits behind `ProtectedRoute` for `ADMIN` only |
| U-2 | Sidebar link | Present in the admin sidebar only. Other roles have their own variants |
| U-3 | URL state | PASS by code. Status, program, batch, search, page, limit and the open request are read from and written to the URL |
| U-4 | Empty, loading and error states | Present. Loading text, an error banner with "Try again", and three empty messages (filtered, nothing waiting, no requests with this status) |
| U-5 | Confirm step | Approve and reject each ask "Yes / Go back" first. Approve stays disabled until the ID is ticked |
| U-6 | Someone else acted first | The panel shows the server's message and reloads the real state |
| U-7 | Other roles' pages | Untouched. No file changed under the registrar, trainer or trainee pages |
| U-8 | Responsive layout | Code only (scrolling table, a panel up to `max-w-xl`) |
| U-9 | Seen in a browser | **No** |

## 7. Tests run (full inventory)

| Group | What was run | Result |
|-------|--------------|--------|
| Unit tests in the branch | Jest, the existing suites | Pass. None cover the admin code |
| Unit tests for the new code (local, **never committed**) | `withdrawal.admin.service.spec.ts` (32): list defaults and filters, paging, the trainer and registrar decision for six row shapes, no account data, detail, sign-off (ID tick, wrong status, atomic order of writes, remarks, admin id, completed and dropped enrollments, reject variants), filter options. `admin-withdrawal.controller.spec.ts` (33): routes and methods, `filter-options` declared before `:id`, role access for every handler, the logged-in admin passed on, the sign-off body (action, ID value, remarks, extra fields dropped) and the list query | 65 of 65 |
| Whole suite with those specs | `npx jest` | 167 of 167 in 14 suites |
| Break-it check | 19 deliberate breaks of the service, DTO and controller, one at a time, file restored after each | **19 of 19 caught.** No weak test found |
| Engineering | Backend eslint, `tsc`, `nest build`, `prisma validate`. Frontend eslint, `tsc -b`, `vite build`. `npm audit` in both | All clean (section 1) |
| Migration | 13 migrations on an empty Postgres 17, `migrate diff` against `schema.prisma` | 0 differences for the withdrawal tables |
| End-to-end script | **114 checks**: Security 24, Pipeline approve 32, Rejections 11, Status guard 15, Enrollment edge cases 7, Atomicity 4, Concurrency 5, List and filters 15, Performance 1 | 114 of 114. Run twice (during the build and on the pushed commit) |
| Performance | Statement logging for 5 and 50 rows, and for the detail | 10, 10 and 14 statements |
| Branch | Pushed state, ahead and behind, trial merges with `git merge-tree` into `dev` and `main` | Clean merges |
| Secrets and test data | Diff scan, `git ls-files`, `git grep` for seeded names, ids and passwords | None found |
| Supabase (read-only) | `migrate status`, admin columns, inconsistent and orphan rows, row level security | Section 2 |
| Manual checks by the owner | None yet | Browser cases TC-A11 to TC-A15 |

The end-to-end script signs its own access tokens and creates session rows in the throwaway database instead of logging in, so the login rate limit never got in the way. The local unit specs used a fake database and fake data, never a real database.

### Where the test data lives and what was cleaned up

| Item | Where | Cleaned up |
|------|-------|------------|
| Throwaway Postgres 17 container `mp49_audit` (fake users, programs, batches, trainees, requests) | Docker, no volumes kept | Removed with `docker rm -f -v` |
| Backend server on port 38457 | Built from the pushed commit, pointed at the throwaway database only | Process stopped |
| Seed SQL, the end-to-end and statement-count scripts, logs | Session scratchpad, outside the repository | Left there (fake data and a fake test password only) |
| Rebuilt output | Git-ignored `dist` folders and the generated Prisma client | Not tracked |
| Local spec files | Untracked in the working tree | Left on purpose (D-11). Do not commit |
| Supabase | Read-only queries only | Nothing written, nothing to remove |

Other projects' containers and images (`mp47_pg`, the `capstone-*` set and so on) were left alone. Docker Desktop is still running (I started it for an earlier check).

## 8. Definition of Done items

| Item | Status |
|------|--------|
| All 5 withdrawal tickets (MP-45 to MP-49) are merged | **NOT DONE.** MP-45 to MP-48 are on `dev`. MP-49 is pushed, not merged |
| Full pipeline tested end to end: trainee, trainer, registrar, ID handed in, admin confirms and signs off, `WITHDRAWN` | DONE over the API (TC-A5) |
| Rejection tested at each stage (trainer, registrar, admin) | DONE over the API (TC-A6, TC-A7) |
| Registrar cannot act before the trainer (400) | DONE over the API |
| Admin cannot approve without the ID tick (400) | DONE over the API |
| Cancellation by the trainee | DONE over the API |
| Pipeline view shows the correct status at every step | **PARTIAL.** Every status, stage and history entry was verified in the API data and the shared stepper was not changed, but the screen itself was not seen |

## 9. Decisions that change the ticket

Recorded in `acceptance.md` under "Decisions made while building (MP-49)" and listed here so the audit does not count them as failures.

| # | Decision | Effect |
|---|----------|--------|
| D-1 | Remarks are optional for both approve and reject, as the ticket says. The trainer and the registrar must give a reason to reject | Ticket text. Question G-1 below |
| D-2 | Approving an enrollment that is already `COMPLETED` or `DROPPED` gives 409. One already `WITHDRAWN` is accepted | Not in the ticket. A finished or dropped enrollment must not be turned back into withdrawn |
| D-3 | Reject saves `surrendered_id` as sent and leaves it alone if not sent | Ticket text |
| D-4 | The admin list shares the registrar's list code and filters | Only the default status and the two extra columns differ |
| D-5 | `exit_reason` is not set on approval | The ticket sets only `enrollment_status`. Question G-2 below |

## 10. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | The pages were not run in a browser. The Definition of Done asks that the pipeline view shows the right status at every step | Medium | Run TC-A11 to TC-A15 on `dev` after the merge |
| F-2 | No unit tests for the new code are in the branch. 65 exist locally and a break-it run caught 19 of 19. This is the project's decision D-11 | Low (decision) | None, unless the team changes D-11 |
| F-3 | An admin can reject without writing a reason, so the trainee may not learn why | Low | Decide (gap G-1). If a reason is required, it is a one-line change in the DTO |
| F-4 | `exit_reason` stays empty when a withdrawal is approved, while MP-42 fills it for a program change | Low | Decide (gap G-2). Could copy the trainee's reason |
| F-5 | The trainee's account stays active after approval (option A, with a TODO in `signOffByAdmin`). Existing open decision, `to-be-discussed.md` item 9 | Low (existing) | Decide A, B or C. B or C need no schema change |
| F-6 | MP-42 (not merged yet) lets an admin shift a trainee to another program while a withdrawal request is open. The request then stays on the old, already withdrawn enrollment, so approving it changes nothing for the new one | Medium | Decide before MP-42 and MP-49 meet in `main`. Noted in the MP-42 audit (F-4) |
| F-7 | The remarks limit, the page sizes and the status list are defined in both the backend and the frontend | Low | Accept, or share through a constants file |
| F-8 | Supabase has no request at the admin step yet, so the first real sign-off will be the first time this code runs on real data | Low | Do one real sign-off in a browser on `dev` right after the merge, then re-run the read-only checks |
| F-9 | Row level security is off on all Supabase tables, including the withdrawal ones | Low (existing) | Same as every table |
| F-10 | Untracked `text.txt` and the two local spec files are in the working tree | Low | Do not commit them |
| F-11 | The old column `withdrawal_request.request_status` is not updated by the sign-off (nor by the earlier steps). It stays `PENDING` on every request, so after an approval or rejection it disagrees with `withdrawal_status`. The audit note A-9 said to decide this before MP-49 (`to-be-discussed.md` item 14) | Medium | Decide: retire the column in a later migration, or keep it in sync. Nothing reads it today, so it does not break behaviour |

No new TECH item was needed.

## 11. Gaps to ask the product owner

1. **G-1. Should the admin need a reason to reject?** The trainer and the registrar do. Options: keep it optional (current, as the ticket says), or require it like the others so the trainee always sees why.
2. **G-2. Should approving a withdrawal also write the trainee's reason into the enrollment's `exit_reason`?** Options: leave it empty (current), or copy the request's reason.
3. **G-3. What should happen to the trainee's account after approval?** (existing, item 9) A: nothing, B: deactivate, C: deactivate only if no other active enrollment.
4. **G-4. Keep or retire the old `request_status` column?** (existing, item 14, now due) Options: retire it in a later migration, or write it in sync with `withdrawal_status` at every step.

## 12. Release steps still open

1. Open the pull request from `feature/MP-49-admin-withdrawal-signoff` into `dev`, review it and merge. It is 0 behind `dev`, and the trial merge is clean.
2. No migration to apply.
3. After the merge, run the browser cases TC-A11 to TC-A15 on `dev`, including one real sign-off, then re-run the read-only Supabase checks (section 2, rows 16 and 17).
4. Decide G-1 to G-4 and F-6 before `main`.
5. Update the Jira status once merged. Add the release to `backlogs/push-log.md` when it is pushed to `dev`.
