# Requirements Tracking Page (Check and Update Trainee Documents)

| Field | Value |
|-------|-------|
| **Jira** | MP-43 |
| **Type** | Feature (Registrar only) |
| **Status** | IN REVIEW. Audited 2026-11-06 and re-checked on `staging` before `main`, see `audit-dod.md`. On `dev` (PR #88), `staging` (PR #89) and `main` (PR #90, 2026-11-06 11:34) |
| **Priority** | Medium |
| **Assignee** | Chelsea Cllj |
| **Depends on** | MP-33 (Admin Enrollments, shared checklist editor), MP-24 (shared list toolkit and Scalability Guide) |
| **Related** | MP-53 (also Registrar only) |
| **Route** | `/registrar/requirements` |
| **Added** | 2026-11-04 (from the Jira ticket), made Registrar-only the same day |

---

## User Story

**As a** registrar,
**I want** a separate Requirements page where I can see which trainees still have missing documents and update their checklist at any time,
**so that** when a trainee submits a document days or weeks after enrolling, I can record it right away without going through the enrollment record, and I can follow up on everyone who is still incomplete.

## Background

- Each enrollment has one `requirement_checklist` row with 7 items: `bc_nso_psa_copy`, `diploma_tor`, `brgy_clearance`, `one_by_one_pic`, `two_by_two_pic`, `passport_size`, `commitment_fee`, plus `remarks`, `checked_by`, `checked_at`.
- Today the checklist is edited only at enrollment or in the enrollment detail (`PATCH /admin/enrollments/:id/requirements` and `PATCH /registrar/enrollments/:id/requirements`).
- There is no page to see all incomplete trainees at once.
- **Gaps in the current code:**
  - `updateRequirementChecklist` in `enrollments.service.ts` does not save `commitment_fee`.
  - `checked_by` and `checked_at` are overwritten on every save, so there is no history.
  - Two staff editing the same checklist overwrite each other (last save wins).

## Scope

### Where it appears
Registrar → Requirements (`/registrar/requirements`), with a sidebar link. **Registrar only**, consistent with MP-53. There is no Admin page. If Admin needs it later, widening access is a small change.

The Admin enrollment detail (MP-33) keeps its own checklist editing through the existing `PATCH /admin/enrollments/:id/requirements` endpoint. That endpoint and the Registrar one call the same service method, so the checklist rules live in one place.

### List
- One row per enrollment. Columns: trainee name, ID card number, program, batch, enrollment status, progress ("5 / 7 submitted"), missing documents as badges, last checked by and date.
- Search by trainee name (any order, partial), username, ID card number.
- Filters: completion (default Incomplete), missing document (multi-select of the 7), program, batch (limited to the program), enrollment status (default `ENROLLED`, because trainees are accepted and enrolled right away; `PENDING` can be added to the filter), last checked date range.
- Sorting: most missing first (default), name, batch start date, last checked.
- Server-side pagination, URL state, debounced search and filter chips, using the shared list toolkit.

### Update a checklist
- Clicking a row opens a side panel with the 7 checkboxes, remarks, and who last checked and when. Saving updates the row without leaving the list.
- One shared component, `RequirementChecklistEditor`, used by this page and the enrollment detail.

### Bulk update
- Select several rows and mark one document as received for all.
- **Cap:** at most 100 rows per request. The cap is a configuration constant, not a number written into the code in several places. Beyond the cap the API returns 400 with a clear message: "Maximum 100 rows per request". A longer list is sent by the frontend in chunks of 100.
- **All or nothing:** the whole bulk update is one transaction. If any row fails, no row changes and nothing is logged. Each changed row is logged in history.
- **No per-row queries:** the update is one set-based write inside the transaction, not a loop with one query per row.

### History
- New table `requirement_checklist_history`: `id`, `requirement_checklist_id`, `enrollment_id`, `document`, `old_value`, `new_value`, `changed_by`, `changed_at`, `remarks`.
- One row per document that changed, on every save (single or bulk), in the same transaction. Append-only.
- The side panel shows the history.

### Safe concurrent editing
- Each save sends the `checked_at` it loaded. If someone else saved in between, the API returns 409 ("This checklist was updated by someone else. Reload to see the latest.").
- Bulk updates only change the selected document.

## Backend

One service and one Registrar controller (`src/users/registrar/requirements/`). Fix and reuse `updateRequirementChecklist`. Do not write a second version.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/registrar/requirements` | List with search, filters, sorting, pagination, counts |
| GET | `/registrar/requirements/:enrollmentId` | Checklist with history (cursor-paginated) |
| PATCH | `/registrar/requirements/:enrollmentId` | Update one checklist (with concurrency check) |
| POST | `/registrar/requirements/bulk` | Mark one document as received for up to 100 enrollments (all or nothing) |
| GET | `/registrar/requirements/filter-options` | Programs, batches and enum values |

The existing `PATCH /admin/enrollments/:id/requirements` and `PATCH /registrar/enrollments/:id/requirements` endpoints call the same service method.

Performance: missing/incomplete filters run in the database. The list selects only displayed columns. The progress count comes from the row, not extra queries. The bulk update uses no per-row queries. Index `requirement_checklist_history (requirement_checklist_id, changed_at DESC)`.

## Out of Scope

- Uploading scanned document files.
- Sending reminders to trainees about missing documents.
- Trainees seeing their own missing documents (possible follow-up for the student portal).
- Changing which documents are required per program.

---

## Acceptance Criteria

### Pages and Reuse

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | The Registrar can open `/registrar/requirements` from the sidebar. There is no Admin Requirements page | NOT MET (decision) | Registrar only. Admin page added on purpose (D-1). Registrar part works |
| 2 | The checklist editor is one shared component used by this page and the enrollment detail | NOT MET (decision) | Panel shared by the Admin and Registrar pages. Enrollment detail keeps its own editor (D-1) |
| 3 | The Requirements page and both enrollment-detail endpoints (Admin and Registrar) call the same backend service method | PASS | Enrollment endpoints and Requirements controllers all use `saveChecklist` |

### List

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | The list opens on Incomplete, status `ENROLLED`, most missing first. The status filter can add `PENDING` and other statuses | PASS | Decided 2026-11-04: ENROLLED by default |
| 5 | Each row shows "N / 7 submitted" and badges for the missing documents | PASS |  |
| 6 | Filtering by a missing document shows only enrollments missing it | PASS |  |
| 7 | Search, every filter, sorting and server-side pagination work together and survive a refresh | PARTIAL | Works together through the API. Refresh not seen in a browser |
| 8 | The complete and incomplete counts match the current filters | PASS |  |

### Updating

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 9 | Ticking a missing document and saving updates the row's progress and removes it from the missing badges | PASS | Seen live |
| 10 | All 7 items can be updated, including `commitment_fee` | NOT MET (decision) | Fixes the current gap. Commitment fee is a payment, not a requirement. Removed from this feature, so the checklist is 6 documents (D-4) |
| 11 | `checked_by` and `checked_at` update to the staff member and time of the save | PASS |  |
| 12 | Changes appear in the enrollment detail, and the other way round | PASS | Both directions through the API |

### Bulk

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 13 | Marking one document received for several rows updates all in one save. It is all or nothing: if one row fails, none change and nothing is logged | PASS |  |
| 14 | More than 100 rows in one bulk request is rejected with 400 and the message "Maximum 100 rows per request" | PASS |  |
| 14a | The cap of 100 is one configuration constant, not repeated in several places | PARTIAL | One backend constant, a second copy in the frontend |
| 14b | A bulk update of 100 rows completes in under 500 ms server-side, with no per-row queries | PASS | Guards against a loop with one query per row. 17 to 18 ms for 100 rows locally, 7 statements |

### History

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 15 | Every changed document creates a history row with old value, new value, staff member and date and time | PASS | Seen live |
| 16 | The side panel shows the history newest first. History rows cannot be edited or deleted | PARTIAL | Newest first. No database rule stops edits |

### Concurrency

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 17 | Two staff open the same checklist and both save: the second gets a 409 message and nothing is overwritten | PASS |  |

### Access Control and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 18 | Only the Registrar can open the page or use the `/registrar/requirements` endpoints. Admin, trainee, trainer and encoder get 403 | NOT MET (decision) | Admin is allowed on purpose (D-1) |
| 19 | Responses never include `password_hash` or other sensitive account fields | PASS |  |
| 20 | The list uses a fixed number of queries per request, however many rows it returns | PASS | Replaces the old 10,000-row target, which could not be tested through a 100-row cap. 10 statements for 10 and for 100 rows |
| 21 | Exactly one migration is added (history table and index), reviewed before being applied to the shared database | PARTIAL | One migration, applied on the owner instruction without a separate reviewer |
| 22 | Backend and frontend type-check, build and lint with 0 problems | PASS |  |

---

## Test Cases

Results of the 2026-11-06 audit are in `audit-dod.md` section 4b: TC-01, 03, 04, 05, 07, 09 PASS. TC-06 PARTIAL (refresh not seen in a browser). TC-02 and TC-08 NOT MET by decision (commitment fee removed from the feature, Admin allowed).

### TC-01: Late document
- **Precondition:** Enrollment without a Barangay Clearance.
- **Steps:** As Registrar, open the row, tick Barangay Clearance, save.
- **Expected:** Progress goes up by one. The badge disappears. A history row "Missing → Submitted" exists.

### TC-02: Commitment fee
- **Steps:** Tick `commitment_fee` on an existing enrollment and save, then reload.
- **Expected:** It stays ticked.

### TC-03: Bulk
- **Steps:** Select 20 rows, mark "2x2 picture" as received.
- **Expected:** All 20 update and 20 history rows exist. With one invalid row, none change and no history rows are written.

### TC-04: Bulk limit
- **Steps:** Send a bulk request with 101 enrollments, then with exactly 100.
- **Expected:** 101 gets 400 "Maximum 100 rows per request" and nothing changes. 100 succeeds.

### TC-05: Concurrent edit
- **Steps:** Open the same checklist in two browsers. Save in the first, then save in the second.
- **Expected:** The second gets 409. The first save is intact.

### TC-06: Filters and URL state
- **Steps:** Filter by missing "Diploma/TOR", program and batch, then refresh.
- **Expected:** Same results after the refresh.

### TC-07: Admin enrollment detail
- **Steps:** As Admin, tick a document in the enrollment detail and save.
- **Expected:** It works through the same service. The Registrar's Requirements page shows the change and the history row names the Admin.

### TC-08: Role access
- **Steps:** Call the `/registrar/requirements` endpoints as Admin, Trainee, Trainer and Encoder, and without a token. Open `/admin/requirements`.
- **Expected:** 403 for the four roles, 401 without a token, and no such Admin page.

### TC-09: Performance
- **Precondition:** 100 incomplete enrollments.
- **Steps:** Bulk-mark one document for all 100 and time the request.
- **Expected:** Under 500 ms server-side. The query log shows no per-row queries.
- **Also:** load the list with 10 rows and with 100 rows. The number of queries is the same.

---

## Summary: 16/24 PASS, 4 PARTIAL, 4 NOT MET by decision. IN REVIEW
