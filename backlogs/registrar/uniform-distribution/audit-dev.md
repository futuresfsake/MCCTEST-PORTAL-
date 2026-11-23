# Uniform Distribution (MP-53): Audit of `dev` after the merge

| Field | Value |
|-------|-------|
| **Date** | 2026-11-23 |
| **Audited** | `dev` at `fd67953`, the merge of PR #106 (`MP-53-uniform-distribution` into `dev`, 2026-11-23 14:17). PR #105 (`MP-35-uniform-inventory`, the stock display on the enrollment form) was marked merged by GitHub at the same moment, because its one commit `d351964` is part of PR #106. Both projects installed and built from the checked-out `dev` |
| **Compared with** | The branch tip audited before the merge (`2f7bad5`): **0 backend and 0 frontend files differ**, so the merge brought in exactly what was audited. `dev` before the merge was `83e097b` (docs only) |
| **Jira status** | MP-53 is **In Progress**, assigned to Rhoddz Gerunda (checked 2026-11-23) |
| **How it was run** | A new throwaway Postgres 17 in Docker with statement logging, built from the 14 migrations of `dev`. The real backend built from `dev` was started against it. The same 36-check end-to-end script as the first audit, plus a direct check of the waiting count, the stock display endpoint and the query counts. The shared Supabase database was only asked for the migration status (read only) |
| **Not audited** | The pages in a real browser (no browser could be driven). The deployed `dev` site. Two people clicking Distribute at once through the screens (done through the API only). Supabase timing (the timing below is local). The enrollment form stock display on screen (the API behind it was checked, the screen was read in code) |
| **Definition of Done used** | The 24 criteria in `acceptance.md`, the Jira scope text and the project engineering checks. The first audit and its re-check are in `audit-dod.md` |

## Verdict

**`dev` is in good shape for this ticket, with one gap.** The feature works on the merged code and nothing regressed: 35 of 36 end-to-end checks pass (the one failure is an old known issue), all engineering checks pass, the migrations are intact and the shared database is up to date. 23 of 24 criteria are PASS and 1 is PARTIAL.

1. **No unit tests for the new code on `dev` (F-3, AC 23 PARTIAL).** The tests were written and run locally (62 tests, 13 of 13 deliberate bugs caught) but were kept out of the repository by decision. Until they are added, the new service, DTOs and controller are covered only by the end-to-end script, which is not part of the repository either.
2. **Not seen in a browser.** The page and the enrollment form stock display were checked through the API and by reading the code only.
3. **Jira and release.** MP-53 is still In Progress. The code is on `dev` only (not on `staging` or `main` at the time of the audit).

Everything else passes. Three of the four blockers from the first audit are closed on `dev`: F-1 (applied migration edited), F-2 (waiting count) and F-4 (lint). The fourth, F-3 (unit tests), is the gap above.

## 1. Engineering checks (on `dev`)

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | **PASS, 0 errors** (the first audit had 16) |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend `prisma validate` | PASS |
| 4 | Backend `jest` | PASS, 12 suites, 102 tests. **None cover the new code** (F-3) |
| 5 | Frontend `eslint`, `tsc -b`, `vite build` | PASS. The build prints the usual chunk size warning |
| 6 | `npm audit` backend | 3 high items, all in the Prisma package chain. Existing (F-10), no `package.json` change in this merge |
| 7 | `npm audit` frontend | 0 vulnerabilities |

## 2. Merge integrity

| Check | Result |
|-------|--------|
| Code on `dev` against the audited branch tip | 0 files differ in `backend-nestjs` and `frontend` |
| Files in PR #106 | 15: 13 code files and the two backlog files. No spec file, no test data, no migration |
| Applied migration `20261022_inventory_unique_program_size` | **Identical to the version before this work.** `git diff` of `backend-nestjs/prisma` between `dev` before and after the merge is empty |
| GitGuardian on PR #106 | Passed |
| PR #105 | Marked merged by GitHub through PR #106. Nothing was merged separately |

## 3. Migration and database

| # | Check | Result |
|---|-------|--------|
| 1 | Migrations added by this merge | **0** |
| 2 | Fresh database: all 14 migrations applied from nothing (byte-order mark of `0_init` stripped in memory, TECH-02) | PASS, 14 of 14, 40 tables |
| 3 | `prisma migrate diff` of that database against `schema.prisma` | Only the known TECH-03 drift (3 enums, the trainer columns). **No index differences** |
| 4 | The two trainee-list indexes and the inventory unique index exist | Yes: `idx_enrollments_enrolled_at`, `idx_insurance_coverage_trainee`, `uq_inventory_program_size` |
| 5 | Shared database (read only): `prisma migrate status` | **"Database schema is up to date"**, 14 migrations found. A modified applied migration would have been reported, none was |
| 6 | Foreign keys and delete behaviour | No change. `distribution_checklist` rows follow their enrollment |

## 4. Acceptance Criteria on `dev`

"Run" = checked against the real backend on the fresh database. "Code" = checked by reading the code (same code as the first audit, 0 files differ). No criterion was seen in a browser.

| # | Criterion (short) | Status | Evidence |
|---|---|---|---|
| 1 | Registrar can open the page, sidebar link | PASS | Run: registrar list 200. Code: route and sidebar |
| 2 | Other roles get 403 | PASS | Run: admin, trainer, encoder, trainee get 403 on GET and POST |
| 3 | 401 without a token | PASS | Run: 401 on GET and POST |
| 4 | List rows and fields | PASS | Run: all fields present |
| 5 | Counts given and waiting | PASS | Run: `{given: 1, waiting: 4}` on the seed |
| 6 | Filters, search, paging | PASS | Run: status, program and batch filters, name and ID card search, paging. The literal `%` search still matches every row (F-5, existing) |
| 7 | Inactive rows greyed with a badge, no action | PASS | Run: `isInactive` is true for the 3 inactive rows. Code: badge and no button |
| 7a | Active by default, inactive only on request, not counted as waiting | **PASS** | Run: default 6 rows, waiting 1. With `includeInactive=true` 9 rows (3 inactive) and waiting still 1. Fixed since the first audit (F-2) |
| 8 | Mark as given deducts stock | PASS | Run: stock 5 to 4, HTTP 201 |
| 9 | Distribution record updated | PASS | Run: given, size, date and registrar saved |
| 10 | History entry | PASS | Run: `DISTRIBUTED`, -1, after 4, linked to the enrollment and the registrar |
| 11 | Size clicked first, deducted from that size | PASS | Run: size L picked, L 3 to 2, M untouched. A body with no size returns 400. Code: button disabled until a size is picked |
| 12 | One transaction | PASS | Run: out of stock leaves no checklist and no history row. Given rows equal DISTRIBUTED history rows |
| 13 | Out of stock rejected, nothing saved | PASS | Run: 400 with the out-of-stock message, nothing saved |
| 14 | Already given returns 409, no second deduction | PASS | Run: 409, stock unchanged |
| 15 | Same enrollment twice at once: one deduction | PASS | Run: codes 201 and 409, stock 4 to 3, one history row |
| 16 | Last shirt, two enrollments at once | PASS | Run: codes 201 and 400, stock 0, no negative stock anywhere |
| 17 | Only `ENROLLED` can be marked | PASS | Run: WITHDRAWN, DROPPED and COMPLETED return 400 |
| 18 | Unknown id 404, malformed id 400 | PASS | Run: 404 and 400 |
| 19 | Dialog shows available quantity, button disabled while saving | PASS | Code. The quantity comes from the stock endpoint, checked in section 5 |
| 20 | Row shows Given without refresh, error on failure | PASS | Code |
| 21 | Item history and Stock Log show trainee name and ID card | PASS | Run: the inventory history contains the ID card number and the name |
| 22 | Uses `InventoryService.deductAndLog` | PASS | Code. No copy of the deduction logic |
| 23 | Lint and build pass, tests cover the cases | **PARTIAL** | Lint 0 errors, build and tsc pass. No unit tests on `dev` (F-3). Concurrency is proven by checks 15 and 16 |

Totals: **23 PASS, 1 PARTIAL, 0 NOT MET** (24 criteria, counting 7 and 7a).

## 5. Security, integrity and performance

| Check | Result |
|-------|--------|
| No token, and every other role, on every endpoint | PASS (401 and 403) |
| No `password_hash` or email in the list response | PASS (the list JSON was scanned) |
| Input validated: bad status, program id, batch id, page and limit values, bad or missing size | PASS (400) |
| No secrets or `.env` committed, no test data in the repository | PASS. A search of the repository outside `backlogs/` finds none of the seeded names, ids or passwords |
| Stock display endpoint for the enrollment form (`GET /api/inventory/availability`, from PR #105) | PASS. Registrar and Admin get 200 with the available quantity (3, 0, 0 for sizes M, XS and XXXL on the seed). Trainer, Encoder and Trainee get 403, no token 401, a bad program id or a bad size 400 |
| History rows are append-only | By convention only: the application has no update or delete for inventory history |
| Query count against rows | **12 statements** for a list request with 9 rows and with 279 rows (30 extra batches, 240 extra enrollments). The count does not grow with the rows. Local timing was 13 ms for both and is **not** Supabase timing |
| Constants duplicated in backend and frontend | The size list and the status filter values exist on both sides, as in the first audit |

## 6. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-3 | No unit tests for the new service, DTOs and controller on `dev` (AC 23 PARTIAL). Written and run locally, kept out of the repository by decision | Medium | Add the three spec files when the project leader agrees. 62 tests, 13 of 13 deliberate bugs caught |
| F-5 | A search for `%` or `_` matches every row (Prisma `contains` does not escape them). Same cause as TECH-06 | Low (existing) | Fix with TECH-06 |
| F-6 | Filters and page are not kept in the URL, unlike the MP-24 list pages | Low | Use `useSearchParams` as in `useServerList` |
| F-7 | The backlog names the API file `src/api/registrar/uniformDistribution.api.ts`. The code has `src/api/uniform-distribution.api.ts`. The Jira text says 24 criteria and a `remarks` field in the body | Low | Update the backlog to match the code (see D-1 in `audit-dod.md`) |
| F-8 | The enrollment form stock display (+212 lines, `EnrollmentFormWizard.tsx`) is outside MP-53's criteria. It is on `dev` now and was only type-checked, built and read, and its API checked | Low | Check it in a browser. Decide whether it belongs to MP-58 (D-2) |
| F-10 | `npm audit` shows 3 high items in the Prisma package chain | Low (existing) | Leave for a dependency ticket |
| F-11 | The migrations make some trainer columns required while the schema says optional (TECH-03) | Low (existing) | Already logged |

F-1 (applied migration edited), F-2 (waiting count), F-4 (lint) and F-9 (backlog statuses) from the first audit are **closed**.

## 7. Where the test data lives and what was cleaned up

All test data lived in a throwaway Postgres container `mp53_pg` (port 55433). It was removed with its volume (`docker rm -f -v`). The test backend ran on port 3100 against that container only (a login of a seeded user that exists only there proved it) and was stopped. The only thing asked of the shared Supabase database was `prisma migrate status`, which is read only. The seed script, test passwords and test scripts stay in the scratchpad folder, not in the repository. The local unit test files were kept outside the working tree during this audit so that `dev` was tested as it is.

## 8. Release state

| Item | State |
|------|-------|
| PR #106 into `dev` | Merged 2026-11-23 14:17, merge commit `fd67953` |
| PR #105 into `dev` | Marked merged 2026-11-23 14:17 (same commit content) |
| `staging` and `main` | Not yet, at the time of this audit. The changes are code in `backend-nestjs` and `frontend`, no migration, nothing to apply on deploy |
| Jira MP-53 | In Progress. Should move to Done after the browser check |
| Browser check | Not done |

## 9. Questions for the owner

1. Add the unit tests to the repository now, or accept the gap (F-3)?
2. Keep the stock display on the enrollment form with MP-53, or move it to MP-58 (F-8, D-2)?

## 10. Release steps still open

1. Browser check of the Uniform Distribution page as a Registrar, and of the stock display on the enrollment form.
2. Decide on the unit tests (F-3).
3. Optional: keep the filters in the URL (F-6), fix the `%` search with TECH-06 (F-5), update the backlog names (F-7).
4. Move MP-53 to Done in Jira after the browser check.
