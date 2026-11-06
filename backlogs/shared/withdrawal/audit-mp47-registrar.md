# Withdrawal, Registrar Validation (MP-47): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-06 |
| **Audited** | Branch `feature/MP-47-registrar-withdrawal`, cut from `dev` at `999ad78` (PR #91). **Nothing is committed yet.** The audit ran on the working tree: 16 code files and 5 backlog files changed or added. The 3 unit test files are not in the working tree (kept in a local git stash, decision D-11) |
| **Compared with** | `origin/dev` at `999ad78`. The branch is 0 commits behind and 0 ahead, so a merge into `dev` cannot conflict. 0 migrations added, 0 package files changed |
| **Jira status** | To Do (checked 2026-11-06). The description was rewritten the same day to match decisions D-08, D-09 and D-10 and has 15 acceptance criteria |
| **How it was run** | A throwaway Postgres 17 container built from all 13 migrations and filled with fake data, the real backend started against it, and 109 requests sent to it. Break-it check on the code. Statement logging for the query counts. The shared Supabase database was read with read-only queries only. The owner also used the screens in the throwaway setup and said they worked (not seen by me) |
| **Not audited** | The pages in a real browser by me (every browser test case, TC-R12 to TC-R17). Two people saving at once through the screens. The deployed `dev` or `staging` sites. Supabase timing |
| **Definition of Done used** | The Jira "Definition of Done" section (6 items) and its 15 acceptance criteria, plus the backlog rows R-1 to R-11 in `acceptance.md` (17 rows) and test cases TC-R1 to TC-R17 |

## Verdict

**The code and the database are ready to be committed, pushed to the branch and merged into `dev`. The ticket is not ready for `main` yet.**

Reasons it can go to `dev`:
1. Every engineering check passes (lint, type-check, build, schema validation, the 102 existing tests, `npm audit` for production).
2. 109 of 109 requests behave as specified on a database built from the migrations: access control, rules, the race, the fee status and payment history, and the ID rule.
3. All 16 deliberate breaks of the code were caught by the tests.
4. No migration, no schema change, no new dependency. Nothing to apply on deploy. Supabase has 0 rows written by this feature.
5. The branch is level with `dev`, so the merge is clean.

Reasons it is **not** ready for `main` yet (none block `dev`):
1. **No browser check.** The screens (list, panel, fee box, payment pop-up, the trainee's "surrender your ID" line) have been seen only by the owner in the throwaway setup. Do TC-R12 to TC-R17 on `dev` or `staging` and record the result.
2. **Unit tests are not in the repository** (decision D-11, as for MP-43). The Jira criterion 12 asks for them, so it is PARTIAL. The tests exist in a local stash, 64 tests, and caught 16 of 16 breaks.
3. **A request waits at `PENDING_ADMIN_SIGNOFF` until MP-49 is built.** The trainee cannot cancel it and nobody can finish it (audit finding A-12 of the withdrawal work, known). The owner chose to release MP-47 on its own.
4. **Jira is still "To Do"** and criterion 12 does not match decision D-11.

Before committing: the deletion of `APP_HEALTH_LOG.md` is in the working folder. The owner confirmed it is intended. It is unrelated to MP-47, so it should be its own commit.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend `jest` | PASS, 102 of 102 (12 suites) in the working tree. With the 3 local spec files: 166 of 166 (15 suites), so 64 new tests |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS. Same chunk-size warning as before (existing) |
| 7 | `npm audit`, backend production | 0 vulnerabilities |
| 8 | `npm audit`, frontend | 10 moderate. No `package.json` changed, so they are existing |
| 9 | New dependencies | None |
| 10 | Frontend tests | The frontend has no test script. The one pure function that changed was checked with a script (11 checks) |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 11 | Migrations added compared with `origin/dev` | PASS. 0. `git status` shows nothing under `prisma/` |
| 12 | All 13 migrations applied to an empty database | PASS, 0 errors (byte-order mark removed in memory, TECH-02) |
| 13 | Database from migrations compared with `schema.prisma` | PASS for every table MP-47 uses (`withdrawal_request`, `withdrawal_status_history`, `official_receipts`: 0 differences). Only the trainee employment enums differ (existing, TECH-03) |
| 14 | Columns the registrar writes | PASS. All came from the MP-45 migration, already on Supabase: `finances_cleared`, `documents_submitted`, `registrar_remarks`, `registrar_validated_by`, `registrar_validated_at` |
| 15 | Indexes for the new queries | PASS. `idx_official_receipts_enrollment`, `idx_withdrawal_status`, `idx_withdrawal_enrollment`, `idx_withdrawal_history_request_changed` exist on Supabase |
| 16 | Supabase: `migrate status` | PASS. "Database schema is up to date" |
| 17 | Supabase: data written by the registrar step | 0 requests with a registrar, 0 history rows by a registrar role. The one real request is untouched (`TRAINER_VALIDATED`, all three flags false) |
| 18 | Supabase: orphan history rows, statuses that disagree with the trainer flag | 0, 0 |
| 19 | A feature or column removed during the work | The registrar no longer writes `surrendered_id`. Checked what is left behind: 0 rows on Supabase have it set, so nothing is stranded |
| 20 | Row level security on the three tables | Off, the same as every other table (finding A-2, existing) |

## 3. Evidence from real use

- **Supabase:** the registrar step has never run on the shared database. One real request exists, waiting for the registrar. The trainee on it has no enrollment-fee receipt, so the panel would say "Not paid". Supabase holds 8 enrollment receipts, 1 processing fee and 1 external fee.
- **Throwaway setup:** the owner clicked through the registrar page and the panel and reported that it worked. I did not see it. This is the only use by a person so far.

## 4. Acceptance Criteria

Numbered as in Jira (15). The backlog has more rows (R-1 to R-11 with sub-rows, 17), because it splits some criteria. The mapping is in the last column.

| # | Criterion | Status | Evidence | Backlog rows |
|---|-----------|--------|----------|--------------|
| 1 | Registrar sees requests with filters and search | PARTIAL | API: list, status, program and batch filters, search by name, system ID and SQL-looking text, pagination, bad values give 400 (TC-R2). The page itself was not seen by me | R-1 |
| 2 | Default view shows only actionable requests | PASS | Default returns only `TRAINER_VALIDATED`. `status=ALL` and each status work | R-1 |
| 3 | Act only when `TRAINER_VALIDATED`, otherwise 400 | PASS | Approve and reject on every other status give 400, unknown id 404 (TC-R4) | R-2 |
| 4 | Approve only when both checks are ticked | PASS | Each missing check, and neither, give 400 and change nothing (TC-R5). The break "approve without ticks" was caught | R-3 |
| 5 | Reject needs a reason, saves the checks as is, final | PASS | No reason, blank and over 1000 characters give 400. A reject saves the reason trimmed. A second attempt gives 400 (TC-R5, TC-R7) | R-3a, R-4 |
| 6 | After approval the status is `PENDING_ADMIN_SIGNOFF` | PASS | TC-R6. The break "goes straight to APPROVED" was caught | R-4 |
| 7 | One history row per action, in one transaction, one winner in a race | PASS | Two approvals at once: one 200, one 400, one history row (TC-R6) | R-6 |
| 8 | The panel shows trainer validation, fee status, documents N / 6 and the timeline; none of it ticks or blocks | PARTIAL | API data is correct and the fee status never changes the checks (TC-R3, TC-R9). Not seen in a browser | R-3b, R-5, R-5a |
| 9 | Responses exclude `password_hash` | PASS | No password or commitment fee text in any response (TC-R3). The payment data has exactly 5 fields | R-7 |
| 10 | Other roles get 403, the registrar sees all, unknown id 404, malformed id 400 | PASS | Admin, trainer, trainee, encoder: 403 on all four endpoints. No token: 401 (TC-R1) | R-7, R-7a |
| 11 | Pages type-check, build and lint with 0 problems | PASS | Section 1 | R-8 |
| 12 | Unit tests cover the service, DTO and controller | PARTIAL | 64 tests exist and pass, and caught 16 of 16 breaks, but they are **not in the repository** (D-11) | R-9 |
| 13 | The registrar does not set `surrendered_id` | PASS | Sent as true while approving: not saved. Unset after a rejection. The break "registrar sets it" was caught (TC-R8) | R-3 |
| 14 | After the registrar approves, the trainee's tracker shows "surrender your ID" and not at other statuses | PARTIAL | Logic: 11 of 11 checks, including every status. The rendering was not seen in a browser | R-11 |
| 15 | A pop-up lists the whole payment history, read only, only an enrollment receipt counts as paid | PARTIAL | API data: oldest first, 5 fields, a non-enrollment receipt does not count (TC-R9). The pop-up itself (open, close, Escape) was not seen by me | R-3c |

Totals: **10 PASS, 5 PARTIAL (1, 8, 12, 14, 15), 0 NOT MET.** That is 15.

### Test cases (TC-R1 to TC-R17)

| Group | Result |
|-------|--------|
| TC-R1 to TC-R10 (API, 109 checks) | 10 PASS |
| TC-R11 (tracker wording, 11 checks) | PASS |
| TC-R12 to TC-R17 (browser) | 6 NOT RUN |

Totals: **11 PASS, 6 NOT RUN.** That is 17. All six unrun cases are screen checks.

## 5. Security and integrity

| # | Check | Result |
|---|-------|--------|
| 1 | No token gives 401, every other role gives 403, on all four endpoints | PASS |
| 2 | The logged-in user is the registrar. Nothing in the body can name another | PASS. The controller passes the token's user. Unknown body fields are dropped |
| 3 | Input validation: bad status, ids, page, limit, search over 100, reason over 1000, ticks as text, bad action | PASS, all 400 |
| 4 | SQL-looking search | PASS. 200 with 0 rows (bound parameters) |
| 5 | Stale or simultaneous saves | PASS. The update is conditional on `TRAINER_VALIDATED`: one winner, one 400, one history row |
| 6 | Secrets or `.env` in what would be committed | PASS. None tracked, none in the diff |
| 7 | Tokens or passwords in the backend log | PASS. 0 matches, 0 errors |
| 8 | Test accounts, passwords or seed data in the code or docs | PASS. None (checked by search) |
| 9 | AI or tool wording in what would be committed | PASS. None |
| 10 | Reference notes (decision and ticket numbers) in code comments | PASS. Removed from the code, kept in the backlog |
| 11 | History is append-only | By convention, as before (existing) |

## 6. Performance and configuration

| # | Check | Result |
|---|-------|--------|
| 1 | Query count as rows grow | PASS. The list makes 11 statements for 1, 2 or 7 rows. The detail makes 15 for 1 or 2 payments. These include 4 for the login checks. Local timing, not Supabase |
| 2 | Result sizes | The payment history is capped at 50 receipts. The list page size is capped at 50 |
| 3 | Settings defined twice | Reason length 1000 (backend DTO and the panel), search length 100 (backend and page) and the page-size choices 10, 20 and 50 (the page, against the backend cap of 50). Same pattern as before, no mismatch today (finding F-5) |

## 7. Tests run (full inventory)

| Group | What | Result |
|-------|------|--------|
| Unit tests (local stash, 64 tests, 3 files) | `withdrawal.registrar.service.spec.ts`: list, filters, search, paging, filter options, detail, fee status and payments, the approve and reject rules, wrong statuses, unknown id, lost race, no `surrendered_id` write. `validate-withdrawal-registrar.dto.spec.ts`: actions, both ticks, reason rules and length, extra fields dropped. `registrar-withdrawal.controller.spec.ts`: path, role and guards, the user from the token, route order and method | Pass, 166 of 166 with the existing 102 |
| Break-it check | 16 deliberate breaks of the service, DTO and controller, one at a time, files restored and compared by hash | **16 of 16 caught**, 0 weak tests. The breaks: approve without ticks, status guard removed, 404 removed, registrar writes `surrendered_id`, wrong old status in history, wrong default status, any receipt counts as paid, no receipt cap, newest-first history, remarks not saved, straight to APPROVED, wrong document count, search filter emptied, reason not required, reason length removed, extra role allowed |
| Engineering checks | Section 1 | All clean |
| End-to-end script (not in the repo) | 109 requests: logins and access for every role and endpoint, list and filters, detail, blocked statuses, rule checks, the race, the reject path, the ID rule, fee status, payment history, and what the trainer and trainee see afterwards | 109 of 109 |
| Tracker check (not in the repo) | The wording function for every status and both audiences | 11 of 11 |
| Migration and database | Section 2 | All as stated |
| Security | Section 5 | All as stated |
| Manual checks by the owner | The registrar page and panel in the throwaway setup | Reported working, not seen by me |

### Where the test data lives and what was cleaned up

| Item | Where | Status |
|------|-------|--------|
| Unit test files (fake names and ids inside the tests) | A local git stash named "MP-47 unit tests (kept local, not committed)" | Not in the working tree or the commit. They can be restored with `git stash pop` |
| Throwaway database, fake accounts and receipts | A Docker container `mp47_pg` on port 5441 | Still running because the owner is testing with it. Remove with `docker rm -f mp47_pg` |
| Backend and frontend started for the audit | Ports 3100 and 5273 | Still running for the same reason. Stop them when finished |
| Seed SQL, end-to-end script, break-it script, helper scripts | The session's temporary folder, outside the repository | Never committed |
| Anything in Supabase | Nothing written by this audit | Only read-only queries were run. Logging in for earlier checks created session rows, which expire by themselves |
| The 12 old test-looking trainee accounts on Supabase | Supabase | From earlier team testing, not from this ticket (existing, F-8) |

## 8. Frontend and UX (code reading)

| # | Check | Result |
|---|-------|--------|
| 1 | Route is role-gated | PASS. `/registrar/withdrawal-requests` allows only REGISTRAR |
| 2 | Sidebar link | PASS. One link for the registrar, visible (decision D-08 #6) |
| 3 | URL state | PASS in code (status, program, batch, search, page and the open request are in the URL). Not seen on a reload |
| 4 | Loading, empty and error states | PASS. All three exist on the list and the panel, with a retry |
| 5 | Panel behaviour | PASS in code. Approve is disabled until both are ticked, reject needs a reason, there is a confirm step, a failed save reloads the real state |
| 6 | Pop-up behaviour | PASS in code. Escape closes the pop-up first and the panel second. Amounts always show centavos |
| 7 | The shared progress view | The trainer and trainee screens now use it with new wording. They need a re-check in a browser (TC-R15, TC-R17) |

## 9. Branch hygiene and release state

| # | Check | Result |
|---|-------|--------|
| 1 | Uncommitted work | Everything. 16 code files, 5 backlog files, plus the deleted `APP_HEALTH_LOG.md` and the untracked `text.txt` (both to stay out of the MP-47 commit) |
| 2 | Branch pushed | No. No remote branch exists |
| 3 | Pull request | None |
| 4 | Merged | No |
| 5 | Behind `dev` | 0. A merge into `dev` has nothing to conflict with |
| 6 | Stray files | `text.txt` (personal notes, existing). No Docker, seed, env or test files |

## 10. Definition of Done section (Jira)

| Item | Status |
|------|--------|
| Code reviewed and merged into `main`, released on its own | NOT DONE |
| Tested as registrar: list, filters, approve, reject with a reason, and the blocked cases | PARTIAL. All pass through the API. The screens were not seen by me |
| Verified the fee status shows paid and not paid correctly, and the payment pop-up lists every payment | PARTIAL. API data verified. The pop-up was not seen by me |
| Verified the request reaches `PENDING_ADMIN_SIGNOFF` only after the trainer and then the registrar | PASS (TC-R4, TC-R6) |
| Verified the trainee sees the "surrender your ID" step after the registrar approves, and not before | PARTIAL. Logic checked for every status. Rendering not seen |
| Definition of Done audit recorded in `backlogs/shared/withdrawal/` | DONE (this file) |

## 11. Decisions that change the ticket

| # | Decision | Effect |
|---|----------|--------|
| D-08 | Manual ticks, a reason to reject, a rejection final for that request, the registrar sees all requests, no history table, released on its own | Narrows the original ticket (remarks were optional, and the original release plan was MP-47 with MP-49) |
| D-09 | The registrar has two checks. ID surrendered moves to the Admin sign-off. The registrar sees whether the enrollment fee is paid. The trainee's tracker shows the last step | The original ticket had three registrar checks. MP-49 gains the ID tick |
| D-10 | A read-only payment history pop-up in the Enrollment fee box | Added scope |
| D-11 | Only the functional code is committed: no unit tests, test data or reference notes | The Jira criterion on unit tests is only PARTIAL |

## 12. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | No browser check of the registrar page, the panel, the payment pop-up or the trainee's new tracker line (TC-R12 to TC-R17) | Medium | Do the six browser cases on `dev` or `staging` before `main` |
| F-2 | No unit tests for the registrar step in the repository (D-11). They exist locally (64 tests) and caught 16 of 16 breaks | Medium | Add them later from the stash, or accept it as for MP-43 |
| F-3 | Jira criterion 12 asks for unit tests, which D-11 keeps out. Jira is still "To Do" | Low | Reword the criterion or the decision, and move the ticket to In Review when it is pushed |
| F-4 | Until MP-49 exists, an approved request is stuck at `PENDING_ADMIN_SIGNOFF` and the trainee cannot cancel it | Medium, known | Build MP-49 soon after. The trainee's tracker now explains the last step |
| F-5 | Some settings are defined in both backend and frontend: reason length 1000, search length 100, page sizes | Low | Accept, or share the values later |
| F-6 | "Enrollment fee paid" reads the first 50 receipts, oldest first. An enrollment with more than 50 earlier receipts and a late enrollment receipt would show "Not paid". Not realistic | Info | Accept |
| F-7 | The registrar page imports `ApiError` from the trainer's API file | Low | Move it to a shared file when convenient |
| F-8 | Supabase holds 12 old test-looking trainee accounts from earlier team testing | Info, existing | Decide on a reviewed clean-up. Not part of MP-47 |
| F-9 | `APP_HEALTH_LOG.md` is deleted in the working folder (owner confirmed) | Info | Commit the deletion on its own, not with MP-47 |
| F-10 | A database built from the migrations differs from Supabase on the trainee employment values, so some trainee screens can fail there | Medium, existing | TECH-03, not part of MP-47. The seed avoids those values |
| F-11 | Frontend `npm audit` shows 10 moderate vulnerabilities | Low, existing | Log as a technical item when convenient |
| F-12 | The enrollment base fee is 500 in one case but the owner says it is always 450 | Medium, existing | TECH-04, not part of MP-47 |

## 13. Questions for the owner

1. Should Jira criterion 12 (unit tests) be reworded to match D-11, or should the tests go into the repository?
2. After the merge into `dev`, who does the six browser cases (TC-R12 to TC-R17), and on which site, `dev` or `staging`?

## 14. Release steps still open

1. Commit the MP-47 work on the feature branch: the 16 code files and the 5 backlog files, without `text.txt` and without `APP_HEALTH_LOG.md`.
2. Commit the deletion of `APP_HEALTH_LOG.md` separately.
3. Push the branch and open a pull request into `dev`.
4. After the merge, run TC-R12 to TC-R17 on `dev` and record the result in `acceptance.md`.
5. Move the Jira ticket to In Review, then Done after `main`.
6. Nothing to apply on deploy for the database. The migration for the columns is already on Supabase.
7. Remove the throwaway container when testing is finished: `docker rm -f mp47_pg`.
