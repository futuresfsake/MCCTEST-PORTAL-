# Requirements Tracking Page (MP-43): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-06 |
| **Audited** | Branch `feature/MP-43-requirements-tracking`. The audit ran on the working tree, which was then committed in batches (docs, shared backend, enrollment endpoints, Registrar screen, Admin screen) with no code change in between. Final re-check before committing: backend and frontend lint, type-check and build clean, 102 of 102 tests pass |
| **Final re-run** | 2026-11-06, after removing the commitment fee from the feature: backend and frontend lint, type-check and build clean, 102 of 102 tests, 76 of 76 end-to-end checks on a clean database, `npm audit` unchanged, no secrets in the diff, Supabase read-only checks unchanged. No new findings |
| **Compared with** | `origin/dev`. Committed: 17 files changed, 1 migration added. Branch is not pushed and has no pull request |
| **Jira status** | In Review (checked 2026-11-06). The Jira description still says Registrar only, no Admin page, and a shared editor with the enrollment detail. It does not match what was built (see D-1) |
| **How it was run** | A fresh Postgres 17 in Docker (`mp43_verify`): all 13 migrations applied from nothing, seeded (135 enrollments, 110 checklists, 10 complete), and the restructured backend run against it. 76 end-to-end checks plus statement logging for the query counts. Supabase was read with read-only queries only. The throwaway database was removed afterwards |
| **Not audited** | The pages in a real browser by me. Two people saving at once through the UI. A refresh keeping the URL filters. The deployed staging site. Bulk update from the page. Supabase timing |
| **Definition of Done used** | The Jira "Definition of Done" section and its 23 Acceptance Criteria, the backlog `acceptance.md` (24 rows) and its test cases TC-01 to TC-09 |

## Verdict

**The code and the database are ready for review. The ticket is not finished as written, because four criteria were changed by decision and the work is not committed, pushed or merged.**

1. **Four criteria no longer match the ticket (D-1, D-4):** AC 1 and 19 (Registrar only, no Admin page), AC 2 (shared editor with the enrollment detail screen) and AC 10 (7 items including the commitment fee, now 6 documents). The Jira description needs updating or the criteria will keep failing audits.
2. **The work was restructured** into a shared module (`src/requirements/`) with an Admin and a Registrar controller, and the existing enrollment endpoints now use the same service. It is committed on the branch in batches but not pushed.
3. **No unit tests** exist for the new service. The 102 passing tests are the project's existing ones.
4. **Not merged.** The "reviewed and merged into `main`" item is NOT DONE.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend `jest` | PASS, 102 of 102 (12 suites). **None cover the new code** |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` (whole project) | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS. Main bundle 626 kB, over the 500 kB warning (existing, not from this work) |
| 7 | `npm audit`, backend (production) | 0 vulnerabilities |
| 8 | `npm audit`, frontend | 10 moderate. No `package.json` changed on this branch, so they are existing |
| 9 | New dependencies | None |
| 10 | Frontend tests | The frontend has no test script |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 11 | All 13 migrations applied to an empty database, in order | PASS, 0 errors (with the byte-order mark stripped in memory, TECH-02) |
| 12 | Database from migrations compared with `schema.prisma` | PASS for the new table (0 differences). The 3 enum and trainer-column differences are existing (TECH-03) |
| 13 | Foreign keys | PASS. 3 keys. Deleting an enrollment removes its checklist and history. Deleting a user who has history is blocked |
| 14 | Index for the new query | PASS. `idx_requirement_history_checklist` on `(requirement_checklist_id, changed_at DESC, id DESC)` |
| 15 | Migrations added compared with `origin/dev` | PASS. Exactly 1 |
| 16 | Supabase: migration applied | PASS. `migrate status` up to date, recorded as finished |
| 17 | Supabase: table shape | PASS. 9 columns, 3 foreign keys, 2 indexes |
| 18 | Supabase: orphan history rows, rows with old equal to new, enrollments without a checklist | 0, 0, 0 of 13 |
| 19 | Row level security on the history table | Off, the same as every other table (finding A-2). Not new |
| 20 | A database built from the migrations breaks the enrollment detail screen | FAIL, existing. See finding F-7 |

## 3. Evidence from real use

On 2026-11-06 (09:20 and 09:21) Supabase received 7 history rows from the Registrar account through the live page, covering the 7 checklist items as they were then (the commitment fee has since been removed from the checklist), with remarks. So saving, history and remarks have worked in a browser on the shared database. Bulk update from the page, simultaneous saves through the UI, the date-grouped history and refresh of the URL filters were not seen in a browser.

## 4. Acceptance Criteria

Numbered as in Jira (23). The backlog `acceptance.md` has 24 rows because it splits Jira AC 14 and 15 into 14, 14a and 14b, so its numbers from 15 on are one lower than Jira's. The mapping is in section 4a.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Registrar opens `/registrar/requirements` from the sidebar. There is no Admin Requirements page | NOT MET (decision D-1) | The Registrar part works (sidebar link and route in code, used live). An Admin page now exists at `/admin/requirements` |
| 2 | The checklist editor is one shared component, used by this page and the enrollment detail | NOT MET (decision D-1) | One panel is shared by the Admin and Registrar Requirements pages. The enrollment detail screen keeps its own checkbox editor |
| 3 | The Requirements page and both enrollment-detail endpoints call the same backend service method | PASS | Both enrollment endpoints and both Requirements controllers end in `saveChecklist`. Proven by history rows written from the enrollment endpoints (TC-07) |
| 4 | Opens on Incomplete, ENROLLED, most missing first. PENDING can be added | PASS | 76-check run: defaults, order and PENDING |
| 5 | Each row shows "N / 7 submitted" and missing badges | PASS | Shown as "N / 6" because the commitment fee is not a requirement (D-4). Every row checked in the API. Rendering by code reading |
| 6 | Filtering by a missing document shows only enrollments missing it | PASS | One and two documents |
| 7 | Search, every filter, sorting and pagination work together and survive a refresh | PARTIAL | Combined search + program + missing + sort + page works through the API. All 3 other sorts work. The refresh uses the shared `useServerList` hook but was not seen in a browser |
| 8 | Complete and incomplete counts match the current filters | PASS | Counts add up with no filter and follow the program filter |
| 9 | Ticking a missing Barangay Clearance updates progress and removes the badge | PASS | End-to-end and live. An enrollment with no checklist gets one on first save |
| 10 | All 7 items can be updated, including `commitment_fee` | NOT MET (decision D-4) | The requirements are the 6 physical documents. The commitment fee is a payment and was removed from the Requirements feature entirely: not shown, not counted, not filterable. A value sent for it is ignored and bulk refuses it |
| 11 | `checked_by` and `checked_at` update to the staff member and time | PASS | "System Registrar" after a Registrar save |
| 12 | Changes appear in the enrollment detail, and the other way round | PASS | A save on the Requirements page shows in the Admin and Registrar enrollment details (200, flag true). A save from the Admin and Registrar enrollment endpoints shows in the Requirements page with the right name. API only, not seen in a browser |
| 13 | Bulk updates all in one save, all or nothing | PASS | 20 rows all updated. One unknown id gives 404, nothing changes and no history is written |
| 14 | More than 100 rows gives 400 "Maximum 100 rows per request". The cap is one configuration constant | PARTIAL | 101 rows gives the exact message. The backend has one constant. The frontend has its own copy (`BULK_CHUNK_SIZE`), so 100 is defined twice in the project |
| 15 | Bulk of 100 under 500 ms with no per-row queries | PASS | 17 to 18 ms for 100 rows, and 7 statements for 10 rows and 7 for 50 rows. Local database, not Supabase |
| 16 | Every changed document creates a history row with old, new, staff and date and time | PASS | End-to-end and live. A save that changes nothing writes no row |
| 17 | History newest first. Rows cannot be edited or deleted | PARTIAL | Newest first through the API. No endpoint edits or deletes (PUT and DELETE give 404). There is no database rule, so a direct SQL change would work |
| 18 | The second of two saves gets 409 and nothing is overwritten | PASS | A stale save gives 409 with the message and leaves the first save intact. Two simultaneous saves give one 200 and one 409. Two browsers not tried |
| 19 | Only the Registrar can use the page. Admin, trainee, trainer, encoder get 403 | NOT MET (decision D-1) | Trainer, trainee and encoder get 403 on all 5 endpoints under both prefixes, and no token gives 401. Admin and Registrar each reach only their own prefix. Admin is allowed on purpose |
| 20 | Responses never include `password_hash` or other sensitive account fields | PASS | Queries select first and last name only. No `password` text in list or detail responses |
| 21 | The list uses a fixed number of queries whatever the row count | PASS | 10 statements for 10 rows and 10 for 100 rows (includes the login-check queries) |
| 22 | Exactly one migration, reviewed before being applied to the shared database | PARTIAL | One migration. It was applied to Supabase on the owner's instruction, with no separate reviewer |
| 23 | Backend and frontend type-check, build and lint with 0 problems | PASS | Section 1 |

Totals: **15 PASS, 4 PARTIAL (AC 7, 14, 17, 22), 4 NOT MET by decision (AC 1, 2, 10, 19)**. That is 23.

### 4a. Backlog `acceptance.md` rows (24)

| Backlog row | Jira AC | Status |
|-------------|---------|--------|
| 1 | 1 | NOT MET (decision) |
| 2 | 2 | NOT MET (decision) |
| 3 | 3 | PASS |
| 4, 5, 6 | 4, 5, 6 | PASS |
| 7 | 7 | PARTIAL |
| 8 | 8 | PASS |
| 9 | 9 | PASS |
| 10 | 10 | NOT MET (decision) |
| 11 | 11 | PASS |
| 12 | 12 | PASS |
| 13 | 13 | PASS |
| 14 | 14 | PASS (400 and the exact message) |
| 14a | 14 | PARTIAL (one backend constant, a second copy in the frontend) |
| 14b | 15 | PASS |
| 15 | 16 | PASS |
| 16 | 17 | PARTIAL |
| 17 | 18 | PASS |
| 18 | 19 | NOT MET (decision) |
| 19 | 20 | PASS |
| 20 | 21 | PASS |
| 21 | 22 | PARTIAL |
| 22 | 23 | PASS |

Totals: **16 PASS, 4 PARTIAL, 4 NOT MET by decision**. That is 24.

## 4b. Test cases (backlog TC-01 to TC-09)

| TC | Status | Evidence |
|----|--------|----------|
| TC-01 Late document | PASS | Progress goes up by one, the badge disappears, a "Missing → Submitted" history row exists |
| TC-02 Commitment fee | NOT MET (decision D-4) | The expected result (a ticked commitment fee stays ticked) no longer applies: it was removed. Verified instead that it is absent from the list, detail and filter options, refused as a filter and in bulk (400), and ignored in a save without writing history |
| TC-03 Bulk | PASS | 20 rows all update, with history. One invalid row: none change, no history written |
| TC-04 Bulk limit | PASS | 101 gives 400 with the exact message and nothing changes. Exactly 100 succeeds |
| TC-05 Concurrent edit | PASS | Second save gets 409, the first is intact. Done through the API, not two browsers |
| TC-06 Filters and URL state | PARTIAL | Program, missing document, search, sort and page work together through the API. The refresh was not seen in a browser |
| TC-07 Admin enrollment detail | PASS | The Admin and Registrar enrollment endpoints write history through the shared service. The Requirements page shows the change and the history row names the Admin. The screen itself was not tried in a browser |
| TC-08 Role access | NOT MET (decision D-1) | The four other roles get 403 and no token gets 401. But Admin is allowed on purpose and `/admin/requirements` now exists |
| TC-09 Performance | PASS | 100 rows in 17 to 18 ms. 10 statements for 10 and for 100 rows. Local database only |

Totals: 6 PASS, 1 PARTIAL, 2 NOT MET by decision. That is 9.

## 5. Security and integrity (extra checks)

| # | Check | Result |
|---|-------|--------|
| 1 | No token gives 401 on all 5 endpoints under both prefixes | PASS |
| 2 | Trainer, trainee and encoder get 403 on all 5 endpoints under both prefixes | PASS |
| 3 | Registrar cannot use `/admin/requirements` and Admin cannot use `/registrar/requirements` | PASS |
| 4 | Oversized remark (5,000 characters), wrong types, `take=100000`, `skip=-1`, a made-up document column name | PASS, all 400 |
| 5 | SQL-looking search text | PASS, 200 with 0 rows (parameters are bound, column names come from a fixed list) |
| 6 | `.env` or secrets committed | PASS, none tracked, none in the diff |
| 7 | Tokens or passwords in the server log | PASS, none (a match was only a route name) |
| 8 | History is append-only | Convention only (finding F-6) |

## 6. Frontend and UX (code reading)

| # | Check | Result |
|---|-------|--------|
| 1 | Routes are role-gated | PASS. `/admin/requirements` allows ADMIN, `/registrar/requirements` allows REGISTRAR |
| 2 | Sidebar links | PASS. One per role |
| 3 | URL state through the shared hook | PASS in code. Not seen on refresh |
| 4 | Loading, empty and error states | PASS. All three exist on the list and the panel |
| 5 | The panel and list show only the 6 documents, no commitment fee | PASS in code and through the API |

## 7. Branch hygiene and release state

| # | Check | Result |
|---|-------|--------|
| 1 | Uncommitted work | None after the batch commits, except the existing untracked `text.txt` |
| 2 | Stray files | `text.txt` (untracked, existing) |
| 3 | Branch pushed | Yes, pushed to `origin` after this audit (not force pushed) |
| 4 | Pull request | None yet. A trial merge into `origin/dev` is clean: 0 commits behind, 19 ahead, no files changed on both sides |
| 5 | Merged | No |

## 8. Definition of Done section

| Item | Status |
|------|--------|
| Code reviewed and merged into `main` | NOT DONE |
| Tested as Registrar: list, filters, single update, bulk update, history, concurrent edit | PARTIAL. All pass through the API. Single update and history were seen live. Bulk and simultaneous editing were not seen in a browser |
| Tested as Admin in the enrollment detail | PARTIAL. The Admin enrollment endpoint is tested through the API. The screen was not tried |
| Verified the enrollment detail uses the shared component and service | PARTIAL. The service is shared (PASS). The component is not (NOT MET, D-1) |
| Verified `commitment_fee` can be updated | NOT MET (decision D-4). Removed from the Requirements feature |

## 9. Decisions that change the ticket

| # | Decision | Effect on the ticket |
|---|----------|----------------------|
| D-1 | The backend is shared. Admin and Registrar each have a thin controller (`/admin/requirements`, `/registrar/requirements`) over one service. The existing enrollment endpoints call it too. Admin has a Requirements page. The enrollment detail screen is not changed | AC 1, 2 and 19 and TC-08 no longer match. "An Admin Requirements page" is no longer out of scope |
| D-2 | The "Last checked from / to" date filter was removed from the page | The ticket lists a last-checked date range. The backend still supports it |
| D-3 | The remark box is add-only. It starts empty. An empty save keeps the saved remark | The old box could edit or clear the remark |
| D-4 | The commitment fee is a payment, not a requirement. The requirements are the physical copies of the documents. It was removed from the Requirements feature entirely (not shown, not counted, not filterable, not saved). The checklist is 6 documents and shows "N / 6" | AC 5 reads "N / 6". AC 10, TC-02 and the DoD item no longer apply |
| D-5 | Only Admin and Registrar can see the history | Matches the roles allowed on the endpoints |
| D-6 | Enrollments with no checklist show as missing all 6 | No change |
| D-7 | (Superseded by D-4) The commitment fee stays out of the Requirements feature, so there is nothing to derive from payments | Gap G-1 is closed |

## 10. Findings

| # | Finding | Severity | Suggested action |
|---|---------|----------|------------------|
| F-1 | (Closed 2026-11-06, D-4) The commitment fee flag was set once at enrollment and never updated by Payments. It no longer matters here: the commitment fee was removed from the Requirements feature | None | No action |
| F-2 | The Jira description does not match the build (Registrar only, no Admin page, shared editor) | Medium | Update the ticket after the product owner answers |
| F-3 | The enrollment detail screen has its own checkbox editor. It shows no history, and it sends no `checked_at`, so it does not get the 409 protection | Low | Reuse the shared panel there, or leave as is by decision |
| F-4 | A save that changes only the remark writes no history row, so it never appears under a date | Low | Decide whether remark-only saves should be logged |
| F-5 | A bulk selection over 100 is sent in groups, one transaction each. A later group failing leaves the earlier ones saved. The cap of 100 is defined in the backend and again in the frontend | Low | Accept, or cap the selection and share the constant |
| F-6 | History is append-only only by convention. No database rule | Low | Add a trigger in a later migration if auditors need it |
| F-7 | A database built from the migrations stores `FULL_TIME` (and other underscore values) while the app expects `FULL TIME`. Reading such a trainee makes the enrollment detail endpoint return 500. Seen on the Docker test database. Supabase is not affected | Medium, existing | TECH-03 (`technical/migration-schema-drift`) now records this failure |
| F-8 | `0_init/migration.sql` begins with a byte-order mark that must be kept (matches the checksum on Supabase), so a new database cannot be built with `migrate deploy` | Medium, existing | TECH-02 (`technical/migration-bom-fresh-database`) |
| F-9 | No unit tests for `RequirementsService` (stale save, no-op save, cap, unknown id) | Medium | Add tests before merging |
| F-10 | Frontend `npm audit` shows 10 moderate vulnerabilities | Low, existing | Log as a technical item when convenient |
| F-11 | Bulk timing (17 to 18 ms) was measured on a small local database. Supabase over the network will be slower | Low | Measure on Supabase when convenient |
| F-12 | No browser check by me of the pages (bulk, two users at once, date-grouped history, URL refresh) | Medium | Do a manual pass with the Registrar and Admin logins before merging |
| F-13 | (Withdrawn 2026-11-06) Raised in error. The owner first said the commitment fee was a separate payment, then corrected it: the only payment is the 450 base fee, so the commitment fee and the enrollment fee are the same payment. The enrollment code (`commitment_fee = payment.processPayment`) is therefore correct and existing flags are not wrong | None | No action |
| F-14 | The enrollment form charges a base fee of 500 when the trainee has no active insurance coverage (`enrollments.service.ts` line 789). The owner says the fee is always 450. 7 of 9 receipts on Supabase carry 500. The chatbot already says 450 | Medium, existing | Logged as TECH-04 (`technical/enrollment-base-fee-500`). See gap G-2 in section 11. Not fixed in MP-43 |

## 11. Gaps to ask the product owner

### G-1: The commitment fee has no reliable source of truth

**Status: CLOSED (2026-11-06).** The commitment fee is not a requirement, so it was removed from the Requirements feature entirely (D-4). This gap no longer applies and is kept for the record.

| Item | Detail |
|------|--------|
| **What happens today** | The checklist keeps `commitment_fee` as a stored yes/no. It is set once, at enrollment, from the "process payment" box on the enrollment form (`enrollments.service.ts`, `commitment_fee: payment.processPayment`). Nothing changes it afterwards |
| **What was decided** | The commitment fee is a payment, so the Requirements page shows it as read-only and sends people to the Payments screen (D-4) |
| **The gap** | Recording a payment in Payments does **not** update the stored value. So a trainee who pays the commitment fee after enrollment still shows as **missing** on the Requirements page, and counts as "6 / 7" instead of "7 / 7", until someone edits the database. The page tells people to go to Payments, but doing so changes nothing here |
| **Smaller than first thought** | Because the commitment fee is the same payment as the enrollment fee, the gap only affects a trainee who did **not** pay at enrollment and pays later. Anyone who paid at enrollment is already correct |
| **Why it cannot be derived yet** | The enrollment payment is saved with the reason `ENROLLMENT`. The Payments screen only offers `PROCESSING_FEE`, `UNIFORM_ID_FEE`, `ASSESSMENT_DEPOSIT` and `EXTERNAL_FEES`. There is no reason that means "commitment fee", so a later payment cannot be recognised as one |
| **Conflict with the ticket** | AC 10 and the Definition of Done say the commitment fee can be updated in the checklist. The read-only decision overrides that |
| **Effect on completeness** | The commitment fee counts in "N / 7". A trainee who has paid can never reach "Complete" if the payment was made after enrollment, so the Complete filter and the counts can be wrong |

**Questions for the product owner**
1. Is the commitment fee the same payment as the enrollment fee (reason `ENROLLMENT`), or a separate payment? **Answered by the owner on 2026-11-06: it is the same payment. The only payment is the 450 base fee.**
2. When a trainee who did not pay at enrollment pays the fee later, which payment reason should the Payments screen record? Payments does not offer `ENROLLMENT`, which is the reason the enrollment form uses for this same payment.
3. Should the Requirements page then **calculate** paid or unpaid from the payments (so it is always correct), or should recording that payment **update the stored flag**?
4. Should the commitment fee count toward "Complete" (7 of 7), or should completeness be based on the 6 documents only, with the fee shown separately?
5. Until this is settled, is it acceptable that a late payment still shows as missing on the Requirements page?

**Options**

| # | Option | Effect |
|---|--------|--------|
| A | Leave as is (stored value, read-only) | Simple. Wrong after a late payment |
| B | Derive paid or unpaid from the receipts for the enrollment | Always correct. Needs the payment reason from question 2 |
| C | Update the stored flag when Payments records the commitment fee | Keeps one stored value. Changes the Payments code |
| D | Go back to an editable checkbox, as the ticket says | Matches AC 10. Two places can now change the same fact |

### G-2: The enrollment fee is 500 in the code, but it is really 450

**Status: RULE CONFIRMED BY THE OWNER (2026-11-06): the enrollment fee is 450.** The code still charges 500 in one case. Logged as TECH-04. Not fixed in MP-43.

| Item | Detail |
|------|--------|
| **What the code does** | `enrollments.service.ts` line 789: `const baseFee = activeCoverage ? 450 : 500;`. A trainee with no active insurance coverage gets a base fee of **500** |
| **What the owner says** | The enrollment fee is always **450** |
| **Why it matters here** | The commitment fee and the enrollment fee are the same payment (G-1). So the 450 is also the amount behind the stored `commitment_fee` flag, which is no longer shown on the Requirements page |
| **Real data** | On Supabase, 7 of 9 receipts carry a base fee of 500 and 2 carry 450 |
| **Also inconsistent** | The chatbot already tells users "Enrollment fee: PHP 450" |

**Questions for the product owner**
1. Should the 500 be removed so the fee is always 450?
2. What happens to the 7 receipts already issued at 500: leave them, or correct them with a reviewed data change?
3. Should a first payment still create the insurance coverage record, since the amount no longer depends on coverage?
4. Was 500 ever meant for something (for example a trainee with no insurance), or is it simply a mistake?

## 12. Release steps still open

1. Folder structure checked against the Payments pattern. Committed in batches.
2. Get the product owner's answers on F-1, F-2 and F-4, and update the Jira description.
3. Add unit tests for the new service (F-9).
4. Do the manual browser pass (F-12).
5. Open a pull request into `dev` (the branch is already pushed).
6. Nothing to apply on deploy for the database. The migration is already on Supabase.
