# Withdrawal: Full Retest of `dev` (with the security fix)

| Field | Value |
|-------|-------|
| **Date** | 2026-11-04 |
| **Audited** | `dev` at `64e85d7` (PR #75, the security headers and `multer` fix). It holds the schema (#62), the trainee API and pages (#63, #64) and the trainer API and pages (#68, #69, restored in #71) |
| **How** | Every check was run on a clean copy of exactly that commit, not on a working tree, so no uncommitted local edits could affect a result |
| **Ahead of `staging`** | 2 commits: the security fix and its merge. They change 3 files (`package.json`, `package-lock.json`, `src/main.ts`). Everything else on `dev` is already on `staging` |
| **Builds on** | `audit-pre-staging.md`, `audit-staging.md`, `audit-dev-trainer.md` |
| **Not audited** | `staging` and `main`, any deployed site, and the uncommitted edits sitting in a local working tree (they are not part of `dev`) |
| **Tickets** | MP-45, MP-46, MP-48 and the SEC-02 fix |

## Verdict

**`dev` is healthy and ready to go to `staging`.** Every check passed. Two earlier findings are now fixed: **A-1** (security headers, `X-Powered-By`) and **A-3** (`multer`, SEC-02). The backend `npm audit` is clean for the first time (0 vulnerabilities), and the security run is 26 of 26 (it was 25 of 26 in every earlier run). No new findings.

Still open: the pages have not been looked at in a real browser (including a login with the new headers), and a request still cannot finish because the registrar and admin steps are not built.

---

## 1. Code quality and build

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `tsc --noEmit` | PASS, 0 errors |
| 2 | Backend ESLint (whole project, no auto-fix) | PASS, 0 problems |
| 3 | Backend `nest build` | PASS |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `tsc -b` | PASS, 0 errors |
| 6 | Frontend ESLint (whole project) | PASS, 0 problems |
| 7 | Frontend `vite build` | PASS |

## 2. Tests

| # | Check | Result |
|---|-------|--------|
| 8 | Backend unit tests (Jest) | PASS, 101 of 101 (12 suites) |
| 9 | Coverage, `withdrawal.service.ts` | 100% statements, lines and functions, 94.2% branches |
| 10 | Trainee end to end over real HTTP (fresh throwaway PostgreSQL 17, all migrations applied, server built from `dev`) | PASS, 30 of 30 |
| 11 | Trainer end to end over real HTTP (two trainers, scoping, validation rules, mass assignment, races) | PASS, 53 of 53 |
| 12 | Race timing sweep, trainer approve against trainee cancel (24 trials) | PASS. Both outcomes occurred (approve won 22, cancel won 2), all 24 had exactly one winner and a consistent history |
| 13 | Stage logic for the progress view (10 cases) | PASS |
| 14 | Components server-rendered: progress view in 6 states, 6 status badges, trainer side panel | PASS |
| 15 | Pages in a real browser | **NOT DONE.** No browser was available |

## 3. Security

| # | Check | Result |
|---|-------|--------|
| 16 | Security run over real HTTP (forged and tampered tokens, session checks, mass assignment, injection text, oversized and malformed input, deactivated account, rate limiting, headers) | **PASS, 26 of 26.** The `X-Powered-By` check now passes. A 120-request burst got 18 responses of 429 |
| 17 | `X-Powered-By: Express` | Gone |
| 18 | Security headers now sent | `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy`, `Cross-Origin-Resource-Policy: same-origin`, `Cross-Origin-Opener-Policy`, `Referrer-Policy`, and others |
| 19 | CORS still works with the headers on: preflight from the frontend origin and a cross-origin login | PASS. `Access-Control-Allow-Origin` returned, login succeeds |
| 20 | Both withdrawal controllers have the login guard and the role guard. No public routes | PASS |
| 21 | Risky constructs (HTML or SQL injection sinks, `eval`, raw queries, `console.log`, `localStorage`) in the withdrawal code | None found |
| 22 | The backend has no file upload routes | Confirmed. The `helmet` cross-origin resource policy cannot affect any served file, because none are served |

## 4. Leaks and dependencies

| # | Check | Result |
|---|-------|--------|
| 23 | `.env` or key files tracked in git | None |
| 24 | Secret patterns across all tracked source | None. The only hits are placeholder examples inside vendored skill documentation |
| 25 | Backend `npm audit` (production) | **PASS, 0 vulnerabilities.** `multer` is now 2.5.0, outside the advisory range. Was 2 high |
| 26 | Frontend `npm audit` (production) | PASS, 0 vulnerabilities |

## 5. Data on Supabase (read-only)

| # | Check | Result |
|---|-------|--------|
| 27 | `prisma migrate status` | Up to date |
| 28 | Rows | 1 request, 2 history rows |
| 29 | The live request | `TRAINER_VALIDATED`. The trainer `MCCTP-26-017` approved it on 2026-11-04 at 13:13 (Philippine time). That login is the trainer of the trainee's batch. No remarks. The registrar and admin fields are untouched |
| 30 | Orphans, requests without history, status different from the latest history | 0, 0, 0 |
| 31 | More than one open request on an enrollment | 0 |
| 32 | Past the trainer step but missing who or when. Trainer rejections without a reason | 0 and 0 |
| 33 | Registrar or admin fields set (not built) | 0 |
| 34 | Test accounts of mine left on Supabase | 0 (all testing used a throwaway local database) |
| 35 | Public tables with row level security on | 0 of 38, unchanged (finding A-2) |

---

## Findings

| ID | Status | Summary |
|----|--------|---------|
| A-1 | **FIXED** (PR #75) | Security headers added with `helmet`, `X-Powered-By` removed. Verified on real responses, and the security run is now 26 of 26 |
| A-3 | **FIXED** (PR #75) | `multer` pinned to 2.5.0. Backend `npm audit` reports 0 vulnerabilities. See `technical/multer-dos-advisory/acceptance.md` |
| A-2 | Open, to confirm | RLS is off on all 38 tables. API roles hold no read or write grants, but the REST API was not called with the anon key |
| A-4 | Partly improved | Trainer service and DTO have unit tests. Still not in the repo: the controllers, the real-database behaviour, the races, the frontend logic. No frontend test runner |
| A-5 to A-9 | Open | Same-day sort order, the form loads the whole dashboard, no per-trainee cap on submit and cancel, staff names shown to the trainee, the old `request_status` |

New note, not a finding:

- **The live request is now stuck at `TRAINER_VALIDATED`.** The trainer approved it, so it cannot go on (no registrar step) and the trainee can no longer cancel it. This is the expected dead end, and it is a real row on the shared database. It stays this way until MP-47 is built.

## Not covered

- A real browser for any page. Of the new headers, only a real login on the app can show whether the `Content-Security-Policy` interferes with anything the frontend does. The API returns JSON and the frontend is served separately, so this is not expected to matter.
- The deployed sites and their environment variables.
- Load testing beyond the 120-request burst and the race tests.
- Calling the Supabase REST API with the anon key (A-2).
- The registrar and admin sides. They are not built.

## Before this goes to `staging`

1. After the merge, log in on the app once (any role) to confirm the new headers do not break the frontend.
2. Remember a request can no longer finish once the trainer approves it.
