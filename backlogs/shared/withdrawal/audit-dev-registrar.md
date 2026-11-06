# Withdrawal, Registrar Validation (MP-47): Audit of `dev` after the merge

| Field | Value |
|-------|-------|
| **Date** | 2026-11-06 |
| **Audited** | `dev` at `11ad2c9`, the merge of PR #94 (`feature/MP-47-registrar-withdrawal` into `dev`, 2026-11-06 16:22). A clean copy of that commit, installed with `npm ci` in both projects |
| **Compared with** | The previous `dev` at `999ad78`: 23 files changed, 0 migrations, 0 package files, 0 test files. Compared with the branch audited before the merge (`80267d7`): **0 files differ**, so the merge brought in exactly what was audited |
| **Jira status** | MP-47 is still **To Do** (checked 2026-11-06). It should move to In Review |
| **How it was run** | A new throwaway Postgres 17 built from the 13 migrations of `dev`, the real backend started from `dev`'s code, 109 requests for the registrar step and 18 for the whole three-role pipeline. Statement logging for the query counts. The shared Supabase database was read with read-only queries only. The throwaway database and server were removed afterwards |
| **Not audited** | The pages in a real browser by me (TC-R12 to TC-R17). Two people saving at once through the screens. The deployed `dev` site. Supabase timing |
| **Definition of Done used** | Same as the audit before the merge (`audit-mp47-registrar.md`): the 15 Jira criteria, the backlog rows R-1 to R-11 and the test cases TC-R1 to TC-R17 |

## Verdict

**`dev` is healthy with MP-47 merged. It can go to `staging`. It is not ready for `main` until the browser cases are run there.**

1. **Every check gives the same result as before the merge.** Lint, type-check, build and the 102 existing tests are clean on a clean install of `dev`. 109 of 109 registrar requests pass, the tracker wording passes 11 of 11, and the query counts are the same.
2. **The merge is exactly what was audited.** 0 files differ from the branch. No migration, no package change, no test file.
3. **The whole pipeline works across three roles.** A trainee submits, the trainer approves, the registrar approves, and each role sees the right thing. 17 of 18 checks passed. The 18th is a new finding (F-13), not a failure of the registrar step.
4. **Nothing changed on Supabase.** All 13 migrations are applied and the one real request is still untouched.
5. **Open items:** the six browser cases, unit tests (left out by decision D-11), the stuck-at-admin limit until MP-49, and Jira still on To Do.

## 1. Engineering checks (clean install of `dev`)

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS, 0 errors |
| 3 | Backend `jest` | PASS, 102 of 102 (12 suites). None cover the registrar step (D-11) |
| 4 | `prisma validate` | PASS |
| 5 | `npm audit`, backend production | 0 vulnerabilities |
| 6 | Frontend `tsc -b`, `eslint .`, `vite build` | PASS, 0 problems. Same chunk-size warning (existing) |
| 7 | `npm audit`, frontend | 10 moderate, existing |

## 2. Merge integrity

| # | Check | Result |
|---|-------|--------|
| 8 | Merge commit | `11ad2c9`, parents `999ad78` (old `dev`) and `80267d7` (the audited branch) |
| 9 | Files that differ between the audited branch and `dev` | 0 |
| 10 | Files changed on `dev` by the merge | 23. Migrations 0, package files 0, test files 0, Docker or seed files 0 |
| 11 | The old `dev` was unchanged underneath | Yes, the merge was a clean two-parent merge with nothing else in between |

## 3. Behaviour on `dev`

| # | Check | Result |
|---|-------|--------|
| 12 | Registrar API script, 109 requests | **109 of 109 pass.** Logins (5), access control for every role and endpoint (17), list, filters, search and paging (27), detail, fee status and payment history (20), rules, blocked statuses, the race and the reject path (34), the ID rule (3), what the trainer and trainee see afterwards (12) |
| 13 | Tracker wording (pure function), every status and both audiences | 11 of 11 pass |
| 14 | Query counts | PASS. A list is 11 statements for 1, 2 or 7 rows. A detail is 15 for 1 or 2 payments. Fixed, no loops |
| 15 | Whole pipeline across three roles | 17 of 18 pass (below) |

The pipeline script checked, on `dev`: a trainee whose earlier request was rejected submits a new one (a rejection is final for that request, the trainee may submit again). It starts at `PENDING_VALIDATION`. The registrar is refused before the trainer has acted (400) and does not see it in the list. The trainer approves. The request then appears in the registrar's default list with the trainer's remarks. The trainee can no longer cancel (400). The registrar approves with both checks. The trainee, the trainer and the registrar each see `PENDING_ADMIN_SIGNOFF` with who acted at each stage. The timeline has the three entries in order. A second request for the same enrollment is refused while one is open. The admin endpoint does not exist yet (404), which is the known limit until MP-49.

The one check that failed is finding F-13.

## 4. Migration and database

| # | Check | Result |
|---|-------|--------|
| 16 | Migrations added by the merge | 0. `dev` has the same 13 as before |
| 17 | All 13 applied to an empty database from `dev`'s own folder | PASS, 0 errors (the byte-order mark removed in memory, TECH-02) |
| 18 | Supabase: `migrate status` | PASS. "Database schema is up to date" |
| 19 | Supabase: data written by the registrar step | 0 requests with a registrar, 0 history rows by a registrar role. The one real request is untouched (`TRAINER_VALIDATED`, all flags false) |
| 20 | Supabase: orphan history rows, statuses that disagree with the trainer flag | 0, 0 |
| 21 | Row level security on the three tables | Off, the same as every other table (finding A-2, existing) |

## 5. Acceptance Criteria on `dev`

Unchanged by the merge: **10 PASS, 5 PARTIAL, 0 NOT MET** of the 15 Jira criteria (see `audit-mp47-registrar.md` for the evidence for each). The five partial ones are criteria 1, 8, 14 and 15 (the screens, not seen in a browser by me) and criterion 12 (unit tests exist locally but are not in the repository, D-11).

Test cases: TC-R1 to TC-R11 pass again on `dev` (**11 PASS**). TC-R12 to TC-R17 are browser cases and are **NOT RUN** (6). That is 17.

## 6. Security and integrity

| # | Check | Result |
|---|-------|--------|
| 1 | No token gives 401, every other role gives 403 on all four endpoints | PASS |
| 2 | The registrar cannot set `surrendered_id`, even when it is sent | PASS |
| 3 | Two registrars acting at once | PASS. One winner, one 400, one history row |
| 4 | The trainee never receives the registrar's checks, the remarks column or a password | PASS |
| 5 | The note typed when approving is visible to the trainee | **Finding F-13** |
| 6 | Secrets, tokens or passwords in the backend log | None |

## 7. Findings

New:

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-13 | The optional note a staff member types when **approving** is saved on the timeline entry, and the trainee sees it. The registrar's note ("Both confirmed" in the test) and the trainer's note both appear in the trainee's history. The code comment says private remarks are not returned and only a rejection reason travels to the trainee. The remark boxes do not tell staff that the trainee can read them. The trainer part comes from the earlier ticket (MP-48), the registrar part is new with MP-47 | Medium | Decide the rule. Either show the trainee only rejection reasons, or label the box "Visible to the trainee" for staff. Fix the code comment to match |

Carried from the audit before the merge (unchanged): F-1 the six browser cases not run (Medium), F-2 no unit tests in the repository by decision D-11 (Medium), F-3 Jira criterion 12 and the To Do status (Low), F-4 requests wait at the admin step until MP-49 (Medium, known), F-5 settings defined in both backend and frontend (Low), F-6 "fee paid" reads the first 50 receipts (Info), F-7 the registrar page imports `ApiError` from the trainer's file (Low), F-8 the 12 old test-looking trainee accounts on Supabase (Info, existing), F-10 trainee employment values differ between a migrated database and Supabase (Medium, existing, TECH-03), F-11 frontend `npm audit` shows 10 moderate (Low, existing), F-12 the base fee of 500 against 450 (Medium, existing, TECH-04).

## 8. Where the test data lives and what was cleaned up

| Item | Where | Status |
|------|-------|--------|
| Throwaway database for this audit | A Docker container on port 5442 | Removed, with its volume |
| Backend started for this audit | Port 3400, from a scratch copy of `dev` | Stopped |
| The owner's own sandbox (database on 5441 and the servers on 3100, 5273, 3200, 5373) | Started earlier at the owner's request | Still running. Not part of this audit |
| Seed data, the API scripts, the pipeline script, the copy of `dev` | The session's temporary folder, outside the repository | Never committed |
| Anything in Supabase | Nothing written. Only read-only queries | The earlier session rows from logins expire by themselves |

## 9. Release state

| # | Check | Result |
|---|-------|--------|
| 1 | On `dev` | Yes, PR #94, 2026-11-06 16:22 |
| 2 | On `staging` | No |
| 3 | On `main` | No |
| 4 | Jira | To Do. Move to In Review now, Done after `main` |
| 5 | Push log | The MP-47 rows for the merge and the `dev` release are added with this audit |

## 10. Questions for the owner

1. **Should the trainee see the note staff type when approving?** If yes, the remark boxes should say so. If no, only rejection reasons should reach the trainee.
2. **Who runs the six browser cases (TC-R12 to TC-R17), and on which site, `staging`?**

## 11. Release steps still open

1. Move the Jira ticket to In Review and reword criterion 12 to match decision D-11.
2. Decide F-13 and fix the code, or the labels.
3. Promote `dev` to `staging` with a pull request.
4. Run TC-R12 to TC-R17 on `staging` and record the result in `acceptance.md`.
5. Build MP-49 so an approved request can finish. Until then, requests wait at the admin step.
6. After `staging` and `main`, add the matching cells in the push log's Release Status by Task.
7. Nothing to apply on deploy for the database. No migration.
