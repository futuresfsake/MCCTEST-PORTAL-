# Withdrawal (trainee side): Pre-Staging Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-04 |
| **Audited** | `dev` at `8d26d18` (PRs #62 schema, #63 trainee API, #64 trainee pages, #65 audit docs). This is exactly what the `dev` to `staging` merge will bring: 25 files, +2,280 lines |
| **Not audited** | `staging` itself. It is still at `4a738fb` and does not contain this work yet. Run the short post-merge check at the end once it is merged |
| **Tickets** | MP-45, MP-46 (trainee half of the withdrawal pipeline) |
| **Scope** | Code quality, tests, security, leaks, dependencies, data on Supabase |

## Verdict

**No blocking issues for promoting to `staging`.** Everything that was checked passes. Four items are worth fixing or deciding before `main` (A-1, A-2, A-3 and A-9 below). None of them was introduced by the withdrawal schema. The two that are new in this work (A-5, A-6) are low severity.

---

## 1. Code quality and build

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `tsc --noEmit` | PASS, 0 errors |
| 2 | Backend ESLint (whole project, no auto-fix) | PASS, 0 problems |
| 3 | Backend `nest build` | PASS |
| 4 | Frontend `tsc -b` | PASS, 0 errors |
| 5 | Frontend ESLint (whole project) | PASS, 0 problems |
| 6 | Frontend `vite build` | PASS |
| 7 | Trial merge of `dev` into `staging` | Clean, no conflicts |

## 2. Tests

| # | Check | Result |
|---|-------|--------|
| 8 | Backend unit tests (Jest) | PASS, 72 of 72 (10 suites). 20 of them cover the withdrawal service |
| 9 | Coverage, `withdrawal.service.ts` | 100% statements, 100% lines, 100% functions, 94.6% branches (uncovered branches at lines 94 and 287) |
| 10 | Coverage, controller, DTOs, modules | 0% from unit tests. These are exercised by the HTTP run (row 11) but not by anything in the repo |
| 11 | Functional run over real HTTP on a throwaway PostgreSQL 17 with the migration applied | PASS, 30 of 30 on a clean run. Covers login, every endpoint, roles, validation, scoping between trainees, cancel rules, a simultaneous double submit |
| 12 | Race test: 60 simultaneous double-submits (earlier run, same service code) | PASS, 60 of 60: one winner and a clean 409 |
| 13 | Pipeline stage logic (10 cases) and server-rendered components (6 states) | PASS |
| 14 | Pages in a real browser | **NOT DONE.** No browser was available. A real trainee did submit a request through the page and it reached Supabase correctly (see `acceptance.md`) |

## 3. Security

| # | Check | Result |
|---|-------|--------|
| 15 | Every new endpoint has the login guard and the trainee-role guard. No public routes | PASS |
| 16 | Trainee identity comes only from the token. No trainee or user id in any DTO, route or query | PASS |
| 17 | Tampered JWT, `alg: none` forged JWT, garbage bearer | PASS, all 401 |
| 18 | Valid JWT with no session token, or a wrong one | PASS, both 401 |
| 19 | A deactivated trainee's still-valid token | PASS, 401 at once, and 200 again after reactivation |
| 20 | Mass assignment: client sends `withdrawal_status: APPROVED`, `trainer_validated`, validator ids, `request_status`, `enrollment_status`, a fake date | PASS. Fields ignored. Row stays `PENDING_VALIDATION`, no validator set, enrollment untouched |
| 21 | SQL, HTML and template text in the reason (`'); DROP TABLE ...`, `<script>`, `${7*7}`) | PASS. Stored and returned unchanged as plain JSON text. Table intact |
| 22 | 1 MB reason, invalid JSON, array body, object where text is expected, negative page, SQL in the query string | PASS, all rejected (400/413) |
| 23 | Another trainee reading or cancelling a request: 404. Foreign or missing enrollment on submit: 403 (same answer for both) | PASS. Does not reveal whether someone else's data exists |
| 24 | Error bodies | PASS. No stack traces, no Prisma or SQL text |
| 25 | Rate limiting (global 120 per minute per IP) | PASS. A 120-request burst got 429s |
| 26 | No SQL injection sinks, HTML injection sinks, `eval`, raw queries, `console.log` or `localStorage` use in the new code | PASS, none found |
| 27 | New backend code never selects `password_hash` or any token field | PASS. Responses select named fields only, and a unit test and the HTTP run assert no `password` text in a response |
| 28 | `X-Powered-By` header and other standard security headers | **FINDING A-1** |
| 29 | Supabase row level security on the new tables | **FINDING A-2** |

## 4. Leaks and secrets

| # | Check | Result |
|---|-------|--------|
| 30 | `.env`, key or certificate files tracked in git | PASS, none. `.env` and the generated Prisma client are git-ignored |
| 31 | Secret patterns (cloud keys, JWTs, private keys, credentialed database URLs) in the 20 code files going to staging | PASS, none |
| 32 | Same patterns across all tracked files | PASS. The only hits are placeholder examples (`user:password@host`) inside vendored skill documentation |
| 33 | `text.txt` (untracked scratch file) | Not tracked, not committed. Not read |
| 34 | My test accounts or sessions on Supabase | PASS, 0. All testing used throwaway local databases |

## 5. Dependencies

| # | Check | Result |
|---|-------|--------|
| 35 | Frontend `npm audit` (production) | PASS, 0 vulnerabilities |
| 36 | Backend `npm audit` (production) | 2 high, both the already-logged `multer` advisory (GHSA-q7qp-rjg7-q26m, SEC-02). **FINDING A-3** |

## 6. Data on Supabase (read-only, after the live test)

| # | Check | Result |
|---|-------|--------|
| 37 | Migration `20261104_withdrawal_pipeline_schema` | Applied, finished, not rolled back. `migrate status` up to date |
| 38 | Rows | 1 request, 1 history row (the live test by `tes.trainee_mcctest`) |
| 39 | Orphans: request without enrollment, history without request, history without actor | 0, 0, 0 |
| 40 | Request without a history row. Request status different from its latest history status | 0 and 0 |
| 41 | More than one open request on an enrollment. Open request on a non-ENROLLED enrollment. APPROVED request on a non-WITHDRAWN enrollment | 0, 0, 0 |
| 42 | Validator or sign-off fields set before the trainer step exists. History written by a non-trainee | 0 and 0 |
| 43 | Indexes, reason length over the 1000-character API limit | All 3 indexes present. 0 long reasons |

---

## Findings

| ID | Severity | New in this work? | Finding | Recommendation |
|----|----------|-------------------|---------|----------------|
| A-1 | Low | No (app-wide) | The server replies `X-Powered-By: Express` and sends none of the usual security headers (no `helmet`: no `X-Content-Type-Options`, frame protection or HSTS) | `app.disable('x-powered-by')` and add `helmet` in `main.ts`. Check the frontend still works behind it |
| A-2 | Medium (to decide) | No (all 38 tables) | **Row level security is off on every table in `public`, including `users`.** The new tables match the existing ones, so nothing got worse. In the check, the Supabase API roles (`anon`, `authenticated`) hold only `REFERENCES`, `TRIGGER` and `TRUNCATE` on these tables, and no `SELECT`, `INSERT`, `UPDATE` or `DELETE`, so the Supabase REST API should not be able to read or write them. **This was checked from the grants, not by calling the API with the anon key**, so confirm it | Enable RLS on all tables with no policies (the backend connects as the database owner and keeps working), then confirm with the anon key that the REST API returns nothing. Also look at why `anon` and `authenticated` hold `TRUNCATE` |
| A-3 | High (known, deferred) | No | `multer` denial-of-service advisory, 2 high in `@nestjs/platform-express` (SEC-02). The withdrawal feature has no upload route, so it does not add exposure | Already logged as deferred. Do it before any new upload route (MP-41 photo upload) |
| A-4 | Low | Yes | No automated test covers the controller, DTO validation or the real database. The 30-check HTTP run, the 60-race test and the security run were temporary scripts and are not in the repo, so a later change could break them without CI noticing. The frontend has no test runner, so the stage logic (10 cases) is also unprotected | Add an opt-in integration spec (needs a Postgres server) and add Vitest for `withdrawal-pipeline.ts` |
| A-5 | Low | Yes | The list sorts by `date_requested`, which has no time, and `withdrawal_request` has no `created_at`. Two requests made on the same day (a submit, cancel, then resubmit) sort in an arbitrary order | Sort by the first history row's time, or add a `created_at` column in a later migration |
| A-6 | Low | Yes | The new-request form loads the whole trainee dashboard (attendance, competencies, schedules) only to list `ENROLLED` enrollments, and it still offers an enrollment that already has an open request (the trainee then gets a 409 message). The detail page also tells a missing request from other errors by matching the text "not found" in the message | A small endpoint for withdrawable enrollments, and have the API client carry the HTTP status instead of matching text |
| A-7 | Low | Yes | A trainee can cycle submit and cancel. Each cycle adds a closed row. The global limit (120 per minute per IP) bounds it, but there is no cap per trainee or enrollment | Optional: cap requests per enrollment per day |
| A-8 | Info | Yes | The trainee sees the names of the trainer, registrar and admin who acted, and the remarks written on a status change | Confirm this is intended. If not, show the role only |
| A-9 | Info | Partly | `request_status` (old) stays `PENDING` for new requests, so it can disagree with `withdrawal_status`. Access tokens live in `localStorage` (existing app-wide pattern; the new code has no HTML injection sinks, which limits the risk) | Decide whether to retire `request_status` before the admin sign-off ticket |

## What this audit did not cover

- Real browser: layout, visual stepper, phone width, keyboard and screen reader use. Use the checklist in `acceptance.md`.
- The deployed `staging` site (not yet merged), its environment variables and the staging build.
- Load and stress testing beyond the double-submit race and a 120-request burst.
- Calling the Supabase REST API with the anon key (see A-2).
- The trainer, registrar and admin sides. They are not built.

## After the merge to `staging`: short repeat

1. `staging` contains `8d26d18`: `git merge-base --is-ancestor 8d26d18 origin/staging`.
2. The staging build and deploy finished, and `/trainee/withdrawal` loads for a trainee.
3. `prisma migrate status` still up to date. Rows still consistent (rows 38 to 42).
4. One submit and one cancel through the page on staging, then read the rows back.
