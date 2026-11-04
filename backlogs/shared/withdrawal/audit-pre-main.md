# Withdrawal (MP-45, MP-46, MP-48): Definition of Done Audit before `main`

| Field | Value |
|-------|-------|
| **Date** | 2026-11-04 |
| **Audited** | `staging` at `f85630e` (merge of PR #78, 14:22). Its code is identical to `dev` at `9b206b3` (no file differs). Checked out and run locally |
| **Compared with `main`** | `staging` is 34 commits ahead of `origin/main`. `main` has 1 commit that `staging` lacks (`7f2c2cf`, PR #61, an earlier staging into main merge with no file changes). A trial merge of `main` into `staging` is clean, no conflicts |
| **Tickets** | MP-45 (schema), MP-46 (trainee), MP-48 (trainer, including the Request history and the security follow-up) |
| **Builds on** | `audit-pre-staging.md`, `audit-staging.md`, `audit-dev-trainer.md`, `audit-trainer-history.md` |
| **Not audited** | The deployed staging site (no URL recorded in the repo), its environment variables, and a real browser |
| **Definition of Done used** | The three Jira tickets have no section titled "Definition of Done". The Acceptance Criteria in each ticket are used as the Definition of Done, plus the release steps (merged to `main`, migration applied, tested as each role) |

## Verdict

**The code is ready for `main` as a per-task release of MP-45, MP-46 and MP-48.** Every engineering check passes and the database is clean. One thing is still open:

1. **No browser check exists** for any withdrawal page (trainee list, form and pipeline; trainer list, panel, Request history). Every UI criterion is "PASS by build and server render", not by use.

Releases are per task, so MP-47 (Registrar) and MP-49 (Admin) ship in their own releases. Until then a request stops at `TRAINER_VALIDATED` (A-12, informational).

## 1. Engineering checks (run on the `staging` checkout)

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend unit tests | PASS, 102 of 102 (12 suites) |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS. Bundle is 625 kB, over the 500 kB warning limit (not from this work) |
| 7 | `helmet@8.3.0` and `multer@2.5.0` installed (override applied) | PASS |
| 8 | Working tree | Clean, except the untracked scratch file `text.txt` (not committed) |

## 2. Database (Supabase, shared, read-only queries)

| # | Check | Result |
|---|-------|--------|
| 9 | `prisma migrate status` | PASS. 12 migrations, database schema is up to date |
| 10 | `withdrawal_status_enum` values | PASS. Exactly `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `PENDING_ADMIN_SIGNOFF`, `APPROVED`, `REJECTED`, `CANCELLED` |
| 11 | Indexes on `withdrawal_status` and on history `(withdrawal_request_id, changed_at DESC)` | PASS (2 found) |
| 12 | `withdrawal_request` has 23 columns, and no `id_surrendered` column | PASS |
| 13 | Rows | 1 request, 2 history rows (the live test request) |
| 14 | Orphan history rows, requests without history, status different from the latest history | 0, 0, 0 |
| 15 | Rejections by a trainer without a reason | 0 |
| 16 | Row level security | 0 of 39 `public` tables. Unchanged from finding A-2 |

The migration `20261104_withdrawal_pipeline_schema` was applied on 2026-11-04 and is the only new migration going to `main`. **Nothing to apply on deploy.**

## 3. Definition of Done per ticket

### MP-45: Schema and migration

| # | Criterion (from the ticket) | Status | Evidence |
|---|-----------------------------|--------|----------|
| 1 | Migration runs cleanly on a database with existing rows | MET | Throwaway PostgreSQL 17 run, then Supabase (`migration.md`) |
| 2 | `prisma generate` has no errors | MET | Build passes |
| 3 | New enums and tables available in the Prisma client | MET | Backend compiles and the service uses them |
| 4 | Existing rows keep their data | MET | Additive migration, backfill checked |
| 5 | Both indexes exist | MET | Item 11 |
| 6 | Enum has exactly the six values | MET | Item 10 |
| 7 | `surrendered_id` reused, no `id_surrendered` | MET | Item 12 |
| | Applied to the shared database | MET | Item 9 |
| | Merged into `main` | NOT MET | On `dev` and `staging` only |

### MP-46: Trainee submit and pipeline view

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 to 4 | Submit for own ENROLLED enrollment, 400/403 otherwise, 409 duplicate, list with context | MET (API) | 30 of 30 checks over real HTTP, 20 unit tests |
| 5 | Pipeline view shows the stages in order | PARTIAL | Stage logic (10 cases) and server-rendered states (6). **Not seen in a browser** |
| 6, 7 | Cancel only while `PENDING_VALIDATION`, else 400 | MET (API) | Checked over HTTP, plus races |
| 8, 9 | No `password_hash`, non-trainee roles get 403 | MET (API) | Checked over HTTP |
| 10 | Pages type-check, build and lint with 0 problems | MET | Items 1 to 6 |
| | Merged into `main` | NOT MET | |

### MP-48: Trainer validation and Request history

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1, 2 | Only own batches, 403 on others | MET (API) | Checked over HTTP |
| 3 | Default view is `PENDING_VALIDATION` | MET (API) | |
| 4 to 8 | Approve, reject with a required reason, 400 outside `PENDING_VALIDATION`, correct statuses, history row per action | MET (API) | 60 simultaneous race trials, exactly one winner each time |
| 9 | Panel shows the full timeline | PARTIAL | **Not seen in a browser** |
| 10, 11 | No `password_hash`, non-trainer roles get 403 | MET (API) | |
| 12 | Pages type-check, build and lint with 0 problems | MET | Items 1 to 6 |
| 13 | Request history table (decided requests only, newest first) | PARTIAL | API and 3 new unit tests pass. **Not seen in a browser** |
| 14 | History has its own search with the empty state | PARTIAL | API checked (name, last name, system ID, two words, no match). Search box **not seen in a browser** |
| | Test cases 6, 7 and 9 of the history (UI search box, URL state, panel without Approve/Reject) | NOT RUN | Need a browser |
| | Merged into `main` | NOT MET | |

**Totals:** all backend and API criteria are met. 4 UI criteria are only partly met (MP-46 5, MP-48 9, 13, 14) and the 3 browser test cases are not run, all for the same reason: no browser check. "Merged into `main`" is the one remaining release step for all three tickets.

## 4. Open findings

| # | Severity | Status | Note |
|---|----------|--------|------|
| A-1 | Low | **Fixed** | `helmet` added (PR #75) |
| A-3 | High | **Fixed** | `multer` pinned to 2.5.0 (PR #75) |
| A-2 | Medium (to decide) | Open | Row level security off on all 39 public tables. App-wide, not from this work |
| A-4 to A-9 | Low / Info | Open | As in `audit-pre-staging.md` |
| A-10 | Low | Open | `DECIDED` means "a trainer decided", not "this trainer". If a batch is reassigned, the new trainer sees the old trainer's decisions in the history. Probably what is wanted, but to confirm |
| A-11 | Low | Open | The history table's page size is fixed at 10. The page-size selector in the shared pagination does nothing there |
| A-12 (new) | Info | Expected | Until MP-47 and MP-49 are released, every approved request stops at `TRAINER_VALIDATED`. Not a blocker: releases are per task |

## 5. Before merging `staging` into `main`

1. **Do the browser check on staging** (about 10 minutes): as a trainee, submit and view the pipeline; as the trainer, approve and reject (with a reason), then check the Request history table, its search box, the URL state after reload, and "View" opening the panel with no Approve or Reject buttons. Record the result in `acceptance.md`.
2. Merge `main` into `staging` first, or let the PR do it. A trial merge shows no conflicts, and `main`'s extra commit changes no files.
3. After the merge to `main`, update the push log Release Status row for MP-45, MP-46 and MP-48.
