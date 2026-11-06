# Requirements Tracking Page (MP-43): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-06 |
| **Audited** | Branch `feature/MP-43-requirements-tracking` at `d693054`, plus one uncommitted change (the "Last checked from / to" date fields removed from the page) |
| **Compared with** | `origin/dev`: 13 files changed, 1 migration added |
| **How it was run** | A fresh Postgres 17 in Docker (`mp43_verify`): all 13 migrations applied from nothing, seeded, then the backend run against it and an end-to-end script of 47 checks. Statement logging was switched on for the query counts. Supabase was read with read-only queries |
| **Not audited** | The pages in a real browser by me (the Registrar did use the live page, see section 3), the deployed staging site, a second user editing at the same time through the UI |
| **Definition of Done used** | The "Definition of Done" section and the 23 Acceptance Criteria in the Jira ticket |

## Verdict

**The code and the database are ready. The ticket is not finished, because three criteria are not met by decision and nothing is merged.**

1. **AC 2, 3 and 12 are not met.** They assume the Requirements page shares a checklist editor and a backend method with the enrollment detail. It was decided that the page is its own screen and the enrollment detail is not touched. See "Decisions that change the ticket".
2. **Not on `main`.** The branch is not pushed and has no pull request.
3. **No unit tests** exist for the new service. The 102 tests that pass are the project's existing ones.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no `--fix`) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend unit tests | PASS, 102 of 102 (12 suites). None cover the new service |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS |
| 7 | Working tree | One uncommitted change (date fields removed) and the untracked scratch file `text.txt` |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 8 | All 13 migrations applied to an empty database, in order | PASS, 0 errors |
| 9 | New migration `20261106_requirement_checklist_history` against `schema.prisma` | PASS, no differences for the table |
| 10 | Foreign keys | PASS. Deleting an enrollment removes its checklist and history. Deleting a user who has history is blocked |
| 11 | Exactly one migration added compared with `origin/dev` | PASS |
| 12 | Supabase: migration recorded as applied | PASS. `migrate status` says up to date |
| 13 | Supabase: history table has 9 columns, 3 foreign keys, 2 indexes (primary key and the newest-first index) | PASS |
| 14 | Supabase: orphan history rows, rows with old equal to new, checklists newer than their history | 0, 0, 0 |
| 15 | Supabase: enrollments without a checklist | 0 of 13 |
| 16 | Row level security on the history table | Off. The same as every other table (finding A-2). Not new |

## 3. Evidence from real use

Supabase holds 7 history rows from 2026-11-06 09:20 and 09:21. All 7 were saved by the Registrar account through the live page, covering all 7 documents with the remarks "The student has submitted 2x2 Picture" and "Student has completed". So saving, `commitment_fee`, history and remarks have worked end to end on the shared database in a browser.

What real use does not show: bulk update from the page, two people saving at once through the page, the date-grouped history, and the list filters in the browser.

## 4. Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Registrar opens `/registrar/requirements` from the sidebar. No Admin page | PASS | Sidebar link and route in the code. No `/admin/requirements` exists. The Registrar used the page live |
| 2 | The checklist editor is one shared component, used by this page and the enrollment detail | NOT MET (decision) | The editor is only in the new page. `EnrollmentDetail.tsx` is untouched |
| 3 | This page and both enrollment-detail endpoints call the same backend method | NOT MET (decision) | The page uses its own service. The existing enrollment endpoints still use `EnrollmentsService` |
| 4 | Opens on Incomplete, ENROLLED, most missing first. Status filter can add PENDING | PASS | End-to-end: defaults checked, PENDING returns only PENDING |
| 5 | Each row shows "N / 7 submitted" and missing badges | PASS | End-to-end checks every row. Shown in the code |
| 6 | Filtering by a missing document shows only enrollments missing it | PASS | End-to-end, single and two documents (a row must miss all ticked) |
| 7 | Search, filters, sorting and pagination work together and survive a refresh | PARTIAL | Each tested through the API (name in any order, username, ID card, program, status, name sort, two pages with no overlap). URL state comes from the shared `useServerList` hook but I did not check a refresh in a browser |
| 8 | Complete and incomplete counts match the current filters | PASS | End-to-end: counts add up (10 complete, 115 incomplete, 125 with the default status). Counts use the same filters as the list except completion |
| 9 | Late Barangay Clearance: tick, save, progress goes up, no longer missing | PASS | End-to-end and live |
| 10 | All 7 items can be updated, including `commitment_fee` | PASS | End-to-end and live (all 7 appear in the live history) |
| 11 | `checked_by` and `checked_at` update to the staff member and the save time | PASS | End-to-end (checked by "System Registrar") |
| 12 | Changes appear in the enrollment detail, and vice versa | PARTIAL | Both read the same `requirement_checklist` table, so edits here show there. Not checked in a browser. Edits made in the enrollment detail do not write history, do not save `commitment_fee` and do not check for conflicts |
| 13 | Bulk updates all in one save, all or nothing | PASS | End-to-end: 100 updated. A request with one unknown id returns 404 and nothing changes |
| 14 | More than 100 rows returns 400 "Maximum 100 rows per request". The cap is one configuration constant | PARTIAL | 101 rows returns 400 with that exact message. The backend uses one constant (`BULK_MAX_ROWS`). The frontend has its own copy (`BULK_CHUNK_SIZE = 100`), so it is two places in the project |
| 15 | Bulk of 100 under 500 ms, no per-row queries | PASS | 22 to 27 ms for 100 rows on a local database. 7 statements for 10 rows and 7 for 50 rows |
| 16 | Every changed document creates a history row with old, new, staff and date and time | PASS | End-to-end and live. Unchanged documents write no row. A repeat bulk writes nothing |
| 17 | History newest first. Rows cannot be edited or deleted | PARTIAL | Newest first through the API. No endpoint edits or deletes history. There is no database rule or trigger stopping it, so a direct SQL change would work |
| 18 | Second save of the same checklist gets 409 and nothing is overwritten | PASS | End-to-end: a stale save returns 409 with the message and changes nothing. Two simultaneous saves give one 200 and one 409 |
| 19 | Only the Registrar can use the page. Admin, trainee, trainer, encoder get 403 | PASS | All five endpoints return 403 for admin, trainer, trainee and encoder. 401 with no token |
| 20 | Responses never include `password_hash` or other sensitive account fields | PASS | The queries select first and last name only. No `password` text in any response |
| 21 | The list uses a fixed number of queries whatever the row count | PASS | 10 statements for 10 rows and 10 for 100 rows. This includes the login-check queries |
| 22 | Exactly one migration, reviewed before being applied to the shared database | PARTIAL | One migration. It was applied to Supabase 2026-11-06 on the owner's instruction. There was no separate reviewer |
| 23 | Backend and frontend type-check, build and lint with 0 problems | PASS | Section 1 |

Totals: 16 PASS, 5 PARTIAL (AC 7, 12, 14, 17, 22), 2 NOT MET by decision (AC 2, 3). That is 23. AC 12 is PARTIAL because it depends on the same decision as AC 2 and 3.

## 5. Definition of Done section

| Item | Status |
|------|--------|
| Code reviewed and merged into `main` | NOT DONE. Branch is local, not pushed, no pull request |
| Tested as Registrar: list, filters, single update, bulk update, history, concurrent edit | PARTIAL. All pass through the API. The Registrar saved and saw history on the live page. Bulk, simultaneous editing and filters were not seen in a browser |
| Tested as Admin in the enrollment detail | NOT DONE. Out of scope by decision |
| Verified the enrollment detail uses the shared component and service | NOT MET (decision) |
| Verified `commitment_fee` can be updated | PASS |

## 6. Decisions that change the ticket

| # | Decision | Effect on the ticket |
|---|----------|----------------------|
| D-1 | The Requirements page is its own screen. The enrollment detail and `EnrollmentsService` are not changed | AC 2, 3, 12 and the two enrollment-detail DoD items are not met as written |
| D-2 | The "Last checked from / to" date filter was removed from the page | The ticket lists a last-checked date range. The backend still supports it |
| D-3 | The remark box is add-only. It starts empty and an empty save keeps the saved remark | The old box could edit or clear the saved remark. It can no longer be cleared |

## 7. Findings

| # | Finding | Severity | Suggested action |
|---|---------|----------|------------------|
| F-1 | Edits made in the existing enrollment detail overwrite `checked_by` and `checked_at`, skip `commitment_fee`, and write no history. History will have gaps for those edits | Medium | Ask the product owner whether the enrollment detail should use the new service (see questions) |
| F-2 | A save that changes only the remark writes no history row, so the remark does not appear under any date | Low | Decide whether remark-only saves should be logged |
| F-3 | A bulk selection over 100 rows is sent in groups, one transaction each. If a later group fails, earlier groups stay saved. The page tells the user how many were updated | Low | Accept, or cap the selection at 100 |
| F-4 | The bulk cap of 100 is defined twice, in the backend and in the frontend | Low | Fetch the cap from the API or accept the copy |
| F-5 | No unit tests for `RequirementsService` | Medium | Add tests for the stale-save, no-op save, and bulk cap paths |
| F-6 | History is append-only only by convention (no database rule) | Low | Add a trigger in a later migration if auditors need it |
| F-7 | `0_init/migration.sql` starts with a byte-order mark, so `prisma migrate deploy` fails on a new database. The mark is deliberate (commit `b13fe19`, it matches the checksum Supabase stored), so deleting it would break Supabase. Worked around by stripping it in memory for testing only | Medium, existing | Logged as TECH-02 in `technical/migration-bom-fresh-database` |
| F-8 | A database built from the migrations differs from `schema.prisma` and from Supabase on 3 enums (`employment_status`, `employment_type`, `highest_education`) and 5 `trainer` columns. Supabase already matches the schema | Medium, existing | Logged as TECH-03 in `technical/migration-schema-drift` |
| F-9 | Bulk timing (22 to 27 ms) was measured on a small local database. Supabase over the network will be slower. The 500 ms target is not yet shown there | Low | Measure on Supabase when convenient |

## 8. Release steps still open

1. Commit the date-field removal.
2. Push the branch and open a pull request into `dev`.
3. Nothing to apply on deploy for the database. The migration is already on Supabase.
4. Update `acceptance.md` and `push-log.md`.
