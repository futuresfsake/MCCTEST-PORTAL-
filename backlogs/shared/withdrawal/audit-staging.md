# Withdrawal (trainee side): Staging Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-04 |
| **Audited** | The `staging` branch at `c5097c2` (merge of PR #66). It contains everything from `dev` up to `8d26d18` (PRs #62, #63, #64, #65) plus the audit and gap-log documents from PRs #65 and #66 |
| **Builds on** | `audit-pre-staging.md`, the audit of the same code before the merge |
| **Not audited** | The deployed staging site. No staging URL is recorded in the repo, so the running site, its environment variables and its deploy were not checked |
| **Tickets** | MP-45, MP-46 (trainee half of the withdrawal pipeline) |

## Verdict

**`staging` is healthy.** The code on `staging` is byte-for-byte the code that was audited on `dev`: the only files that differ between `staging` and `dev` are four backlog documents. Every check was run again on the `staging` checkout and gave the same results. No new findings. The findings in `audit-pre-staging.md` (A-1 to A-9) are unchanged and still open.

---

## 1. The merge

| # | Check | Result |
|---|-------|--------|
| 1 | `staging` contains the withdrawal work (`dev` at `8d26d18` is an ancestor) | PASS |
| 2 | Non-backlog files that differ between `staging` and `dev` | None. Only `push-log.md`, `to-be-discussed.md`, `acceptance.md` and `audit-pre-staging.md` differ |
| 3 | Working tree after checkout | Clean (only the untracked scratch file `text.txt`, which is not committed) |

How it got there: PR #66 (`docs/withdrawal-pre-staging-audit`) was merged into `staging`. That branch was cut from `dev` at `8d26d18`, so the merge carried all of `dev`'s withdrawal commits with it.

## 2. Code quality and build (run on the `staging` checkout)

| # | Check | Result |
|---|-------|--------|
| 4 | Backend `tsc --noEmit` | PASS, 0 errors |
| 5 | Backend ESLint (whole project, no auto-fix) | PASS, 0 problems |
| 6 | Backend `nest build` | PASS |
| 7 | `prisma validate` | PASS |
| 8 | Frontend `tsc -b` | PASS, 0 errors |
| 9 | Frontend ESLint (whole project) | PASS, 0 problems |
| 10 | Frontend `vite build` | PASS |

## 3. Tests

| # | Check | Result |
|---|-------|--------|
| 11 | Backend unit tests (Jest) | PASS, 72 of 72 (10 suites) |
| 12 | Functional run over real HTTP, `staging` code built and run against a fresh throwaway PostgreSQL 17 with all migrations applied | PASS, 30 of 30 on a clean run |

## 4. Security and leaks

| # | Check | Result |
|---|-------|--------|
| 13 | Security run over real HTTP (forged and tampered tokens, session checks, mass assignment, injection text, oversized and malformed input, deactivated account, rate limiting) | 25 of 26 PASS. The one failure is `X-Powered-By: Express` (finding A-1, existing and app-wide) |
| 14 | Rate limiting | PASS. A 120-request burst got 17 responses of 429 |
| 15 | Dependencies, `npm audit` (production) | Frontend: 0 vulnerabilities. Backend: 2 high, the already-logged `multer` advisory (SEC-02, finding A-3) |
| 16 | Secrets, tracked key files, risky code constructs | Not repeated: the code is identical to what was scanned in `audit-pre-staging.md` (rows 26, 27, 30 to 34), all PASS |

## 5. Data on Supabase (read-only, after the merge)

`staging` and `dev` share one Supabase database, so this is the same data as before the merge.

| # | Check | Result |
|---|-------|--------|
| 17 | `prisma migrate status` | Up to date |
| 18 | Rows | 1 request, 1 history row (`tes.trainee_mcctest`, `PENDING_VALIDATION`, 2026-11-04) |
| 19 | Orphan requests, orphan history rows | 0, 0 |
| 20 | Requests without a history row. Status different from the latest history status | 0 and 0 |
| 21 | Enrollments with more than one open request | 0 |
| 22 | Validator or sign-off already set (the trainer step does not exist yet) | 0 |
| 23 | Test accounts left on Supabase | 0 |
| 24 | Public tables with row level security on | 0 of 38. Unchanged, finding A-2 |

## 6. Findings

No new findings. Open from `audit-pre-staging.md` and logged as gaps 10 to 14 in `to-be-discussed.md`:

| ID | Severity | Summary |
|----|----------|---------|
| A-2 | Medium, to confirm | RLS is off on all 38 tables. API roles hold no read or write grants, but the REST API was not called with the anon key |
| A-3 | High, known | `multer` advisories (SEC-02), deferred. No upload route in this feature |
| A-1 | Low | `X-Powered-By: Express` and no security headers |
| A-4 | Low | No repo tests for the controller, DTOs, real database or frontend logic |
| A-5 to A-9 | Low to Info | Same-day sort order, form loads the whole dashboard, no per-trainee cap on submit and cancel, staff names shown to the trainee, the old `request_status` |

## 7. Still to do on `staging`

1. **Look at the deployed staging site.** Confirm the deploy finished and `/trainee/withdrawal` loads for a trainee, then run the browser checklist in `acceptance.md`. Needs the staging URL.
2. **Do not promote to `main` yet.** A trainee can submit a request, but no one can validate it (trainer, registrar and admin steps are not built). On `main` that would be a dead end in the production menu.
3. **Sync `dev`.** `staging` has four backlog documents that `dev` does not. Merge them back into `dev` so the two stay level.
