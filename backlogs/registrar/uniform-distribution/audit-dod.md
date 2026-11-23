# Uniform Distribution (MP-53): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-23 |
| **Audited** | Branch `MP-53-uniform-distribution` at `1cf7c39` ("uniform distribution module"), pushed, same as `origin/MP-53-uniform-distribution`. No uncommitted changes to the branch (the working tree only holds `text.txt` and two untracked withdrawal spec files that belong to another ticket) |
| **Compared with** | `origin/dev` (the branch is 0 commits behind and 2 ahead). 14 files changed, 1,756 lines added, 40 removed. 0 migrations added, 1 applied migration edited (F-1) |
| **Jira status** | In Progress (MP Sprint 4, which ended 2026-11-09). The Jira description lists the scope and points to this folder for the 24 Acceptance Criteria. Jira has no separate "Definition of Done" section |
| **How it was run** | A fresh Postgres 17 in Docker (`mp53_pg`): all 14 migrations applied from nothing, seeded with test users, one program, one batch, 8 enrollments and uniform stock, and the built backend run against it on port 3100. 36 end-to-end checks, a forced-failure test and a query count. The shared database (Supabase) was used for read-only checks only |
| **Not audited** | The pages in a real browser (code reading only). Two people clicking Distribute at once through the UI. A refresh keeping the filters. The extra change to the enrollment form (`EnrollmentFormWizard.tsx`, +212 lines, stock display), beyond a type-check and build. Supabase timing. A real distribution on the shared database |
| **Definition of Done used** | The 24 Acceptance Criteria in `acceptance.md` (23 numbered plus 7a), the Jira scope text, and the project engineering checks. Test cases TC-01 to TC-08 are covered by the end-to-end checks below |

## Verdict

**Not ready to merge.** The feature works. The distribution logic is correct under every case tried, including two people at once. Four things stop the merge:

1. **The branch edits a migration that is already applied (F-1, High).** It removes two `DROP INDEX` lines from `20261022_inventory_unique_program_size/migration.sql`. That reverses `d78af8f` on `dev`, which restored this file on purpose. The edit is unrelated to uniforms and Prisma will see a changed checksum. Revert the file.
2. **AC 7a is only partly met (F-2).** With "include inactive" on, the "waiting" count includes withdrawn, dropped and completed trainees (7 instead of 4 in the test).
3. **AC 23 is not met (F-3, F-4).** Backend lint has 16 errors, all in the new service and DTO. There are no unit tests for the new service, DTO or controller.
4. **Not reviewed or merged (F-9).** Pull request #106 is open. The "code reviewed and merged" item stays NOT DONE.

Everything else passes: 22 of 24 criteria are PASS, 1 PARTIAL, 1 NOT MET. A trial merge into `dev` has no conflicts.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | **FAIL, 16 errors**, all in `uniform-distribution.service.ts` (15 `prettier/prettier`, mostly CRLF line breaks, plus line 323 an unnecessary type assertion `dto.size as size_enum`) and `dto/uniform-distribution-query.dto.ts` (1 prettier). Nothing outside the new files |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend `jest` | PASS, 167 of 167 (14 suites). **None cover the new code** (F-3) |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS |
| 7 | `npm audit`, backend (production) | 3 high, all in the Prisma package chain (`prisma`, `@prisma/config`, `effect`). No `package.json` changed on this branch, so they are existing |
| 8 | `npm audit`, frontend (production) | 0 vulnerabilities |
| 9 | New dependencies | None |
| 10 | Frontend tests | The frontend has no test script |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 1 | Migrations added | 0, as expected (no schema change is needed) |
| 2 | Applied migration edited | **Yes (F-1).** `20261022_inventory_unique_program_size/migration.sql`: the two `DROP INDEX` lines for `idx_enrollments_enrolled_at` and `idx_insurance_coverage_trainee` are removed and the last statement is reformatted. `origin/dev` has the original file (commit `d78af8f`) and the indexes are recreated by `20261103_restore_mp24_indexes` |
| 3 | Fresh database | PASS. All 14 migrations apply to an empty Postgres 17 (the byte-order mark in `0_init` was stripped in memory for the test only, TECH-02) |
| 4 | Schema versus migrations (`prisma migrate diff`) | Same differences as `dev`: 3 enums and 5 trainer columns (TECH-03, existing). No index differences, so the edited migration does not change the final shape. The harm is the checksum, not the result |
| 5 | Foreign keys and delete behaviour | The feature reads and writes `distribution_checklist` (unique per enrollment, cascade with the enrollment), `inventory` and `inventory_transactions` (`enrollment_id` set to null on delete). No change needed |
| 6 | Indexes for the new queries | The list filters on `enrollments` (`batch_id`, `enrollment_status`, indexed) and searches names with `contains`. Fine at the current size |
| 7 | Shared database, `prisma migrate status` | "Database schema is up to date", 14 migrations |
| 8 | Shared database, read-only rows | 5 given checklists, all 5 with a `DISTRIBUTED` history row, 0 given without a size, 0 negative stock rows |
| 9 | Row level security | Off for `distribution_checklist`, `inventory` and `enrollments`, the same as the other tables |

## 3. Evidence from real use

The shared database holds 5 given uniforms, each with its history row and size, from earlier enrollment-time deductions (MP-35). Nothing was distributed through this page there. All distribution evidence comes from the clean test database (section 5b).

## 4. Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Registrar can open the page, sidebar has the link | PASS | List call 200 as Registrar. Route guarded for `REGISTRAR` (`AppRouter.tsx` line 290), sidebar link `Sidebar.tsx` line 477 (code reading) |
| 2 | Admin, trainer, trainee, encoder get 403 | PASS | 403 on GET and POST for all four roles; `/admin/uniform-distribution` returns 404 |
| 3 | 401 without a token | PASS | GET and POST both 401 |
| 4 | List fields | PASS | Row has name, ID card, program, batch, size, status, uniform status, size issued, date and who handed it out |
| 5 | Summary counts given and waiting | PASS | `{given: 1, waiting: 4}` on the seeded data. See AC 7a for the one case that is wrong |
| 6 | Filters, search, paging | PASS | Status, program and batch filters, search by name and by ID card, paging 2 per page over 3 pages. Bad values return 400. A search for `%` matches every row (F-5, existing TECH-06) |
| 7 | Inactive rows greyed out with a badge and no action | PASS | API flags `isInactive` for withdrawn, dropped and completed; distribute returns 400 for all three. Page greys the row, shows the badge and "No action" (code reading, lines 443, 490, 538) |
| 7a | Active by default, filter includes inactive, inactive not counted as waiting | **PARTIAL** | Default shows 5 of 8 rows. With `includeInactive=true` 8 rows show, but `waiting` is 7, not 4 (F-2) |
| 8 | Stock 5 becomes 4 | PASS | HTTP 201, stock M 5 to 4 |
| 9 | Distribution record updated | PASS | `uniform_given`, `size_issued`, `date_distributed`, `distributed_by` (the registrar) and `inventory_id` all set |
| 10 | `DISTRIBUTED` history entry | PASS | `-1`, quantity after 4, linked to the enrollment, performed by the registrar |
| 11 | Size must be picked, deducted from the picked size | PASS | Size L picked for an enrollment of size M: L went 3 to 2, M unchanged, `size_issued = L`. A body without a size returns 400. The confirm button is disabled until a size is picked (`DistributeUniformDialog.tsx` lines 83, 261 to 266, code reading) |
| 12 | One transaction | PASS | A trigger was added to the test database to make the final save fail: HTTP 500, stock stayed 5, 0 history rows, 0 checklist rows. Code: the whole method runs in one `$transaction` |
| 13 | Out of stock | PASS | 400 "No S uniform is currently in stock for this program."; no checklist row, no history row, stock still 0 |
| 14 | Already given returns 409 | PASS | 409, stock unchanged, no history row; a repeat on a just-distributed enrollment is also 409 |
| 15 | Two requests, same enrollment | PASS | Two at once: one 201, one 409, stock down by 1, one history row |
| 16 | Last shirt, two enrollments | PASS | Stock 1, two enrollments at once: one 201, one 400, stock 0, no negative stock anywhere |
| 17 | Only `ENROLLED` can be marked | PASS | WITHDRAWN, DROPPED and COMPLETED each return 400 "Uniforms can only be distributed to enrolled trainees." |
| 18 | Unknown id 404, malformed id 400 | PASS | 404 and 400 |
| 19 | Dialog shows available quantity, no double submit | PASS | Calls `/inventory/availability`, shows units or "Out of stock", confirm disabled while saving or when stock is 0 (code reading) |
| 20 | Row shows Given without refresh, error on failure | PASS | The page reloads its list after a save and shows the error message on failure (code reading) |
| 21 | History and Stock Log show trainee name and ID card | PASS | `/inventory/history` contains the trainee's name and ID card number for the new movement |
| 22 | Uses `InventoryService.deductAndLog` | PASS | Service line 320 calls it; no copy of the deduction exists in the new module |
| 23 | Lint and build pass, tests cover success, out of stock, already given, wrong status and concurrency | **NOT MET** | Build passes, lint has 16 errors, no tests for the new code (F-3, F-4) |

**Totals: 24 criteria. 22 PASS, 1 PARTIAL (7a), 1 NOT MET (23), 0 NOT RUN.**

### Test cases (backlog TC-01 to TC-08)

| TC | Result | Evidence |
|----|--------|----------|
| TC-01 Mark as distributed | PASS | AC 8 to 10 |
| TC-02 Out of stock | PASS | AC 13 |
| TC-03 Already given | PASS | AC 14 |
| TC-04 Same enrollment, two at once | PASS | AC 15 |
| TC-05 Last shirt, two enrollments | PASS | AC 16 |
| TC-06 / 06b Pick the size | PASS | AC 11 (API). The click-first dialog behaviour is from code reading |
| TC-07 / 07b Wrong status, active filter | PASS for the API and default filter. The 7b count with inactive included fails (AC 7a) |
| TC-08 Role access | PASS | AC 2 and 3 |

## 5. Security and integrity (extra checks)

| Check | Result |
|-------|--------|
| No token (401) and every other role (403) on both endpoints | PASS |
| No `password_hash` or email in the list response | PASS (the service selects only name fields and system id) |
| No secrets or `.env` in the diff | PASS (`git ls-files` shows no env file; the diff has no key or password) |
| No tokens or personal data in logs | PASS (no `console` calls in the module) |
| Input validation | PASS: status, UUIDs, search length 100, `limit` max 50, `page` at least 1, `includeInactive` boolean, size must be a real size |
| Double distribution of one enrollment | PASS: row lock (`FOR UPDATE`) plus the checklist check, tested with two requests at once |
| Stock never below 0 | PASS: `deductAndLog` locks and updates only where quantity is above 0; tested with the last unit |
| History append-only | PASS for this module (only inserts); not enforced by the database |
| Query count with page size | PASS: 15 statements for 2 rows and 12 for 50 rows, including the login-session check. It does not grow with rows. Local timing is not Supabase timing |
| Config duplicated in backend and frontend | Page size defaults (20) and the list of sizes are repeated in the frontend. Low |

## 5b. Tests run (full inventory)

| Group | What was run | Result |
|-------|--------------|--------|
| Existing unit tests | `npx jest`, whole backend | 14 suites, 167 tests, all pass. 0 tests for the new service, DTO or controller |
| Break-it check | Not possible, there are no tests for the new code | Not run |
| Engineering | Backend eslint, `tsc`, `nest build`, `prisma validate`, frontend eslint, `tsc -b`, `vite build`, `npm audit` both | See section 1 |
| Migrations | 14 migrations on an empty Postgres 17, then `prisma migrate diff` | PASS, drift is the existing TECH-03 |
| End-to-end script | 36 checks against the real built backend on the clean database | 34 PASS, 2 FAIL (F-2, F-5). A first run showed 6 fails, 4 of them were my script expecting 200 where the endpoint returns 201; corrected and re-run on a re-seeded database |
| Groups in that script | Access control (8), list shape, counts, filters, search, paging, bad query values (12), happy path (3), other size (2), out of stock (1), already given (2), two at once (1), last shirt (2), wrong status (3), bad ids (3), history (1), accounting (1) | |
| Forced failure | A trigger on the test database made the last save fail | PASS (AC 12) |
| Query count | Statement logging on the test database, list with 2 and 50 rows | PASS |
| Shared database, read-only | `prisma migrate status`, counts of given, missing history, null size, negative stock, test users, row level security | PASS, 0 test rows |
| Manual checks by the owner | None recorded | |

**Disclosures.** Before this audit, the module was tried against the shared database: a login as the seeded Registrar (this replaces that account's session row, a write to `sessions`), read-only list calls, error-case POSTs (400 and 404, nothing written), and one script that ran the real service inside a transaction that is always rolled back. That script stopped at the out-of-stock error before any write, so no stock or record changed.

| Where the test data lived | What was cleaned up |
|---------------------------|---------------------|
| Docker container `mp53_pg` (Postgres 17, port 55453): 5 users `AUD-*`, 1 program, 1 batch, 9 trainees, uniform stock, a temporary trigger | Container removed with `docker rm -f -v`; no volumes left from it |
| Backend on port 3100 started from `dist` | Stopped |
| Seed SQL, test scripts and logs | In the scratchpad folder only, not in the repo (`git grep` for the seeded ids and password finds nothing) |
| A temporary script in `backend-nestjs/scripts` | Deleted |
| Shared database | Read-only; 0 `AUD-%` users |
| Docker Desktop | It was not running; it was started for this audit and left running. The `postgres:17-alpine` image already existed and was kept. The servers on ports 3000 (shared database) and 5173 started earlier for manual testing are still running |

## 6. Frontend and UX (code reading)

| Check | Result |
|-------|--------|
| Route and sidebar gated by role | PASS: `ProtectedRoute allowedRoles={['REGISTRAR']}`, sidebar entry for Registrar |
| Filters, sort and page in the URL | **Not done.** Filters, search, page and "include inactive" are `useState`, so a refresh loses them (F-6). Not an acceptance criterion |
| Search debounce | Present (`setTimeout`) |
| Loading, empty and error states | Present ("No distribution records found.", an error box, a loading state) |
| Dialog | Size required, availability shown, out-of-stock shown, confirm disabled while saving, Escape and backdrop disabled while saving |
| Mobile layout | Not checked |
| Seen in a browser | No |

## 7. Branch hygiene and release state

| Check | Result |
|-------|--------|
| Branch pushed | Yes, same commit as `origin/MP-53-uniform-distribution` |
| Pull request | #106 "MP-53: Uniform Distribution module", **open** (2026-11-13) |
| Merged into `dev` | **No** |
| Trial merge into `origin/dev` | Clean, no conflicts. 0 commits behind |
| Stray files | `text.txt` in the project root (not part of this branch). Two untracked withdrawal spec files (another ticket) |
| Jira status | In Progress. The sprint ended 2026-11-09 |

## 8. Definition of Done section

| Item | Status |
|------|--------|
| All Acceptance Criteria met | NOT DONE (22 of 24; 7a partial, 23 not met) |
| Backend and frontend lint, type-check and build pass | NOT DONE (backend lint 16 errors) |
| Unit tests for the new code | NOT DONE |
| No unrelated changes | NOT DONE (applied migration edited, F-1; enrollment form change, F-8) |
| No secrets or test data committed | DONE |
| Role access enforced by the backend | DONE |
| Code reviewed and merged | NOT DONE (PR #106 open) |
| Backlog and Jira up to date | NOT DONE (backlog says NOT STARTED, F-9) |

## 9. Decisions that change the ticket

| # | Decision needed | Notes |
|---|-----------------|-------|
| D-1 | The backlog design says the distribute call takes `sizeIssued` and `remarks`. The code takes `size` only and has no remarks field | Pick one: add remarks, or change the backlog. The endpoint also returns 201 |
| D-2 | The enrollment form now shows stock for the chosen size (+212 lines, `EnrollmentFormWizard.tsx`) | Not in MP-53's criteria. It looks like part of MP-58. Keep it here, or move it to MP-58 |

## 10. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | The branch edits the applied migration `20261022_inventory_unique_program_size`, undoing `dev` commit `d78af8f`. Prisma will see a changed checksum on a database where it is applied | High | Restore the file from `origin/dev` (`git checkout origin/dev -- <file>`) and keep the branch free of migration changes |
| F-2 | With `includeInactive=true` the "waiting" count includes inactive trainees (7 instead of 4). The `waiting` query reuses the filter that includes inactive rows. AC 7a | Medium | Always add `enrollment_status NOT IN (WITHDRAWN, DROPPED, COMPLETED)` to the `waiting` and `given` counts |
| F-3 | No unit tests for the new service, DTO or controller. AC 23 asks for success, out of stock, already given, wrong status and concurrency | Medium | Add specs next to the code (fake database), then run the break-it check |
| F-4 | Backend lint: 16 errors in the two new files, most from CRLF line endings and wrapping, plus an unnecessary type assertion at service line 323 | Medium | Format those two files with the project settings and remove `as size_enum` |
| F-5 | A search for `%` or `_` matches every row (Prisma `contains` does not escape them). Same cause as TECH-06 | Low (existing) | Add this module to TECH-06 and fix them together |
| F-6 | Filters and page are not kept in the URL, unlike the MP-24 list pages | Low | Use `useSearchParams` as in `useServerList` |
| F-7 | Backlog says the API file is `src/api/registrar/uniformDistribution.api.ts`; the code has `src/api/uniform-distribution.api.ts`. Backlog says Jira has 24 criteria and lists the body as `sizeIssued`, `remarks` | Low | Update the backlog to match the code (see D-1) |
| F-8 | The enrollment form change is outside the ticket and was only type-checked and built | Low | See D-2; audit it with MP-58 |
| F-9 | The backlog `acceptance.md` still says NOT STARTED; the code, PR and Jira say otherwise | Low | Update statuses after the fixes |
| F-10 | `npm audit` shows 3 high items in the Prisma package chain. Existing, no `package.json` change on this branch | Low (existing) | Leave for a dependency ticket |
| F-11 | Fresh-database seeding hit TECH-03: the migrations make some trainer columns required while the schema says optional | Low (existing) | Already logged as TECH-03 |

## 11. Gaps to ask the product owner

1. **Remarks on a distribution.** The design mentions a `remarks` field. Do you want a remark saved with each distribution, or is the size, date and registrar enough?
2. **Stock display in the enrollment form.** Keep it in MP-53, or move it to MP-58 so each ticket stays small?

## 12. Release steps still open

1. Restore the applied migration file from `dev` (F-1).
2. Fix AC 7a (F-2) and the lint errors (F-4).
3. Add unit tests for the service, DTO and controller (F-3).
4. Optional: keep filters in the URL (F-6); add this module to TECH-06 (F-5).
5. Re-run backend lint, build and tests, then update PR #106.
6. Review and merge into `dev`. Update the backlog statuses and the Jira ticket.
7. Open a browser check of the page as a Registrar (not done in this audit).
