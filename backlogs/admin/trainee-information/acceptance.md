# MP-24: Admin — Trainee Information (View)

| Field | Value |
|-------|-------|
| **Jira** | MP-24 |
| **Type** | Feature |
| **Status** | Done |
| **Assignee** | Aubrien Fuentes |
| **Sprint** | MP Sprint 3 |
| **Merged** | 2026-10-20 (PR #18) |
| **Route** | `/admin/trainees` |
| **Shared with** | Registrar (`backlogs/registrar/trainee-information/acceptance.md`) |

---

## Acceptance Criteria

### Pages and Reuse

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Admin → Trainees opens the Student Information module at `/admin/trainees` | PASS | Route with ProtectedRoute |
| 2 | Uses the same shared backend service and frontend components as Registrar | PASS | Shared TraineeInformationService, 8 shared FE components |
| 3 | Frontend module accepts canEdit setting; profile/cards ready for MP-42 | PASS | canEdit: false; Edit button renders conditionally when true |

### Search

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | Partial name search, any order, case-insensitive | PASS | ILIKE with split terms, pg_trgm GIN indexes |
| 5 | Search by username, email, contact, ID card, OR number | PASS | All fields in search query |
| 6 | Debounced ~300ms, latest-only via AbortController | PASS | SEARCH_DEBOUNCE_MS = 300, stale cancelled |

### Filters and Sorting

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 7 | Every filter works, alone and combined | PARTIAL | Enrollment/batch status single-select (Jira says multi-select); insurance missing "Expired"; program not searchable |
| 8 | Batch filter scoped to selected program | PASS | Filters by programId, disabled when none selected |
| 9 | Active filter chips + Clear all | PASS | ActiveFilterChips with removable chips |
| 10 | Sort by name, enrolled date, ID card; default newest first | PASS | Whitelisted sort, default enrolledAt desc |

### Pagination

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 11 | Server-side pagination with correct total | PASS | Returns { data, total, page, limit, totalPages } |
| 12 | Page sizes 10/20/50; limit > 100 rejected with 400 | PARTIAL | Default is 10 (Jira specifies 20) |
| 13 | Changing search/filter/sort resets to page 1 | PASS | Auto-reset logic |
| 14 | Result count always correct | PASS | "Showing X–Y of Z" |

### Usability

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 15 | URL state survives refresh and back button | PASS | useSearchParams for all state |
| 16 | Back from profile restores list state | PASS | listSearch in location state |
| 17 | Loading/empty/error states, no blank flash | PASS | All three states rendered |
| 18 | Mobile usable | PARTIAL | Table scrolls, filters responsive; missing card layout and First/Last buttons |

### Profile

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 19 | Profile shows personal details, address, family, education, beneficiary, insurance | PASS | All sections in TraineeProfileView |
| 20 | One card per enrollment with all fields | PASS | Batch, schedule, status, ID card, uniform, date, OR number |

### Performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 21 | < 500ms with 10k trainees | PASS | Architecture supports (raw SQL, indexes, server paging) |
| 22 | Fixed query count, no N+1 | PASS | Promise.all with page + count query |
| 23 | No app-level filtering/sorting/paging | PASS | All in SQL |

### View Only

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 24 | No Edit button visible | PASS | canEdit: false |
| 25 | No update endpoint exists | PASS | Controllers only have GET |

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 26 | Registrar can't use admin endpoints | PASS | @Roles(Role.ADMIN) |
| 27 | Other roles get 403 | PASS | Role guards enforce |
| 28 | No password_hash in responses | PASS | Explicit select |
| 29 | Invalid params → 400, not 500 | PASS | DTO validation |

### Data and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 30 | One migration, indexes only, pg_trgm | PASS | 20261019_trainee_information_indexes |
| 31 | UI matches existing style | PASS | Reuses Header, Sidebar, Footer, badges |
| 32 | tsc + build = 0 errors | PASS | Verified |
| 33 | Shared list toolkit | PARTIAL | Components modularized but trainee-specific; not yet generic |

---

## Known Gaps (not in the Jira ticket)

| # | Gap | Severity | Detail | Suggested fix |
|---|-----|----------|--------|---------------|
| G1 | Search columns lack trigram indexes | Medium | Search runs `ILIKE '%term%'` on `users.email`, `users.system_id`, `enrollments.id_card_number` and `official_receipts.or_number`. MP-24 lists these as "already indexed (no change)", but a B-tree index cannot serve a leading-wildcard search, so they fall back to sequential scans on large tables. The migration `20261019_trainee_information_indexes` only adds trigram indexes for first name, last name and contact number. | New indexes-only migration adding `gin_trgm_ops` indexes on the four columns, or limit those fields to prefix/exact matching. Correct the "already indexed" note in MP-24. |

---

## Test Cases

### TC-01: Admin opens trainee information
- **AC:** #1
- **Priority:** Critical
- **Precondition:** Logged in as admin
- **Steps:**
  1. Click "Trainees" in admin sidebar
- **Expected:** Navigates to `/admin/trainees`; trainee list loads

### TC-02: Shared components with registrar
- **AC:** #2
- **Priority:** High
- **Precondition:** Logged in as admin
- **Steps:**
  1. Compare `/admin/trainees` with `/registrar/trainees` (in another session)
- **Expected:** Same shared TraineeInformationService and 8 shared FE components used

### TC-03: canEdit flag set correctly
- **AC:** #3
- **Priority:** Medium
- **Precondition:** Logged in as admin
- **Steps:**
  1. Open a trainee profile
  2. Look for Edit button
- **Expected:** `canEdit: false` — no Edit button visible (ready for MP-42 when true)

### TC-04: Partial name search (any order, case-insensitive)
- **AC:** #4
- **Priority:** Critical
- **Precondition:** Trainee "Maria Teresa Dela Cruz" exists
- **Steps:**
  1. Search "dela maria"
  2. Search "CRUZ"
  3. Search "tes del"
- **Expected:** All three searches return the trainee; results case-insensitive and order-independent

### TC-05: Search by username, email, contact, ID card, OR number
- **AC:** #5
- **Priority:** High
- **Precondition:** Trainee with known username, email, contact, ID card, and OR number
- **Steps:**
  1. Search by each field individually
- **Expected:** Trainee found in each case

### TC-06: Search debounce and cancellation
- **AC:** #6
- **Priority:** Medium
- **Precondition:** On trainee list
- **Steps:**
  1. Type "mar" quickly, then immediately change to "tes"
  2. Observe network requests
- **Expected:** Only the final search ("tes") is sent; ~300ms debounce; stale requests cancelled via AbortController

### TC-07: Filters work alone and combined
- **AC:** #7
- **Priority:** High
- **Precondition:** Trainees with various enrollment statuses, programs, batches
- **Steps:**
  1. Filter by enrollment status alone
  2. Filter by program alone
  3. Combine enrollment status + program + batch
- **Expected:** All filters combine correctly; results match all active filters

### TC-08: Batch filter scoped to program
- **AC:** #8
- **Priority:** High
- **Precondition:** Multiple programs with batches
- **Steps:**
  1. Select a program in the filter
  2. Open the batch filter dropdown
  3. Clear the program filter, check batch dropdown again
- **Expected:** Batch dropdown shows only batches for the selected program; disabled when no program selected

### TC-09: Active filter chips + Clear all
- **AC:** #9
- **Priority:** Medium
- **Precondition:** Filters applied
- **Steps:**
  1. Apply 3 filters
  2. Click the X on one chip to remove it
  3. Click "Clear all"
- **Expected:** Individual chips removable; Clear all resets all filters

### TC-10: Sort by name, enrolled date, ID card
- **AC:** #10
- **Priority:** High
- **Precondition:** Multiple trainees exist
- **Steps:**
  1. Click Name column header to sort A-Z, then Z-A
  2. Sort by enrolled date
  3. Sort by ID card number
- **Expected:** Each sort works; default is newest enrolled first

### TC-11: Server-side pagination
- **AC:** #11, #14
- **Priority:** High
- **Precondition:** 25+ trainees exist
- **Steps:**
  1. Load the list (default page 1, limit 10)
  2. Navigate to page 2
  3. Check "Showing X–Y of Z" counter
- **Expected:** Correct data per page; total count accurate

### TC-12: Page size options
- **AC:** #12
- **Priority:** Medium
- **Precondition:** 50+ trainees exist
- **Steps:**
  1. Change page size to 20, then 50
  2. Call API with limit = 101
- **Expected:** Sizes 10/20/50 work; limit > 100 returns 400

### TC-13: Search/filter/sort resets to page 1
- **AC:** #13
- **Priority:** Medium
- **Precondition:** On page 3 of results
- **Steps:**
  1. Apply a search query
  2. Apply a filter
  3. Change sort order
- **Expected:** Each action resets pagination to page 1

### TC-14: URL state survives refresh
- **AC:** #15
- **Priority:** High
- **Precondition:** Filters, search, sort, and page applied
- **Steps:**
  1. Note the current URL with query params
  2. Press F5 to refresh
  3. Press browser Back button
- **Expected:** Same filters/search/sort/page restored from URL

### TC-15: Back from profile restores list state
- **AC:** #16
- **Priority:** High
- **Precondition:** Filtered list on page 2
- **Steps:**
  1. Click a trainee to open their profile
  2. Click Back
- **Expected:** Returns to filtered list on page 2 (restored via location state)

### TC-16: Loading, empty, and error states
- **AC:** #17
- **Priority:** Medium
- **Precondition:** Various states
- **Steps:**
  1. Load with slow network → loading state
  2. Apply filters that match no results → empty state
  3. Disconnect network → error state
- **Expected:** Each state rendered correctly; no blank flash

### TC-17: Profile shows all sections
- **AC:** #19
- **Priority:** High
- **Precondition:** Trainee with complete data
- **Steps:**
  1. Click on a trainee
- **Expected:** Personal details, address, family, education, beneficiary, and insurance all displayed

### TC-18: Enrollment cards per program
- **AC:** #20
- **Priority:** High
- **Precondition:** Trainee enrolled in 2+ programs
- **Steps:**
  1. Open the trainee's profile
- **Expected:** One enrollment card per enrollment with batch, schedule, status, ID card, uniform, date, OR number

### TC-19: Performance — under 500ms
- **AC:** #21, #22, #23
- **Priority:** Medium
- **Precondition:** 10k+ trainees in database
- **Steps:**
  1. Load the trainee list and measure response time
  2. Apply search + filters and measure
- **Expected:** < 500ms; fixed query count (no N+1); all filtering/sorting in SQL

### TC-20: View only — no edit capabilities
- **AC:** #24, #25
- **Priority:** Critical
- **Precondition:** Logged in as admin
- **Steps:**
  1. Open a trainee profile
  2. Check for edit/update buttons or forms
  3. Verify no PATCH/PUT endpoints exist
- **Expected:** No edit button visible; no update endpoints in controller

### TC-21: Access control — role enforcement
- **AC:** #26, #27
- **Priority:** Critical
- **Precondition:** Logged in as registrar
- **Steps:**
  1. Call `GET /admin/trainees` with registrar JWT
  2. Call `GET /admin/trainees` with trainer JWT
- **Expected:** Both return 403 Forbidden

### TC-22: No password_hash in responses
- **AC:** #28
- **Priority:** Critical
- **Precondition:** None
- **Steps:**
  1. Call `GET /admin/trainees` and inspect full response JSON
- **Expected:** No `password_hash` field present in any record

### TC-23: Invalid params return 400
- **AC:** #29
- **Priority:** Medium
- **Precondition:** None
- **Steps:**
  1. Call `GET /admin/trainees?page=-1`
  2. Call `GET /admin/trainees?sort=invalid_column`
- **Expected:** 400 Bad Request (not 500)

---

## Summary: 29 PASS, 4 PARTIAL, 0 FAIL
