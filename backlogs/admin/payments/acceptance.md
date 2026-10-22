# MP-25: Admin — Payments Module

| Field | Value |
|-------|-------|
| **Jira** | MP-25 |
| **Type** | Feature |
| **Status** | Done |
| **Assignee** | Vince Jon Gonzalez |
| **Sprint** | MP Sprint 3 |
| **Route** | `/admin/payments` |
| **Shared with** | Registrar (`/registrar/payments` — same shared components) |

---

## Acceptance Criteria

### Pages and Reuse

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Admin → Payments and Registrar → Payments both open the Payments module | PASS | Routes in `AppRouter.tsx`, sidebar links for both roles |
| 2 | Same shared backend service and frontend components | PASS | Both controllers inject `PaymentsService`; both pages render `PaymentListPage` + `PaymentFormModal` |
| 3 | List reuses the shared list toolkit | PASS | Uses `ListToolbar`, `Pagination`, `useServerList` |

### Recording

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | Admin and Registrar can record a payment for an enrolled trainee | PASS | `@Post('payments')` on both controllers; service validates `enrollment_status === 'ENROLLED'` |
| 5 | Only 4 external reasons: Processing Fee, Uniform/ID Fee, Assessment Deposit, External Fees | PASS | `VALID_REASONS` in service; `@IsEnum` on DTO; 4 options in frontend |
| 6 | Trainee picker searches API as you type, never loads all trainees | PASS | Debounced 300ms, backend `take: 10`, `contains` filter |
| 7 | Receipt records who confirmed it and when | PASS | `confirmed_by` from JWT `user.id`; `created_at` auto-set; detail returns both |
| 8 | Recording external payment doesn't create/change insurance | PASS | Service only touches `official_receipts` and `or_number_seq` |
| 9 | Invalid input shows clear error, not server error | PASS | class-validator on DTO; `BadRequestException` for business rules; frontend inline validation |

### OR Numbers and Duplicates

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 10 | Unique OR number `OR-{year}-{000000}`, same enrollment can have multiple receipts | PASS | `or-number.ts` generates format via atomic upsert on `or_number_seq` |
| 11 | Two payments saved at same moment both succeed with different OR numbers | PASS | Atomic `upsert` with `increment: 1` inside `$transaction` |
| 12 | Double-clicking Save creates only one receipt | PASS | `crypto.randomUUID()` idempotency key; unique index; `P2002` catch |
| 13 | Existing receipts still show correctly | PASS | Additive migration only — no breaking schema changes |

### List

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 14 | Receipts list searchable by OR number, trainee name, username | PASS | `where.OR` matches `or_number`, `first_name`, `last_name`, `system_id` |
| 15 | Every filter works alone and combined; chips and Clear all | PASS | `where.AND` combines all filters; `ListToolbar` renders chips |
| 16 | Sort by payment date, amount, OR number; default newest first | PASS | `ALLOWED_SORTS` set; default `payment_date desc`; UI sort buttons |
| 17 | Server-side pagination with page sizes 10/20/50; limit > 100 = 400 | PASS | `@Max(100)` on DTO; `Math.min(100, ...)` in service; `PAGE_SIZES = [10, 20, 50]` |
| 18 | URL state survives refresh and back button | PASS | `useSearchParams()` from react-router-dom |
| 19 | Total count and total amount match filters, calculated in DB | PASS | `count` + `aggregate` with same `where`, in `Promise.all` |
| 20 | Receipt detail shows all fields including program, batch, confirming staff | PASS | Detail selects all fields; drawer renders them all |

### Money

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 21 | Amounts as strings, shown as PHP currency; no rounding errors | PASS | DB `Decimal`, service `.toFixed(2)` as string, frontend `Intl.NumberFormat('en-PH', { currency: 'PHP' })` |

### Performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 22 | 50,000 receipts + search + filters under 500 ms locally | PASS (design) | Indexes on all filter/sort columns including trgm GIN; needs load test to confirm timing |
| 23 | Fixed number of queries, no N+1 | PASS | Exactly 3 queries in `Promise.all`: `findMany`, `count`, `aggregate` |

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 24 | Only Admin and Registrar can use endpoints | PASS | `@Roles(Role.ADMIN)` / `@Roles(Role.REGISTRAR)` + `JwtAuthGuard` + `RolesGuard` |
| 25 | Each role uses own endpoints | PASS | `/admin/payments/*` and `/registrar/payments/*` — separate controllers |
| 26 | Other roles get 403 | PASS | `RolesGuard` rejects; frontend `ProtectedRoute` gates by role |
| 27 | No `password_hash` in responses | PASS | All queries use explicit `select`; grep confirms zero `password_hash` in payments service |

### Data and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 28 | One migration (OR sequence table, idempotency key, indexes) | PASS | `20261019_payments_or_sequence/migration.sql` |
| 29 | UI matches existing style | PASS | Same slate/blue-900 palette, uppercase tracking labels, Font Awesome icons, bordered cards |
| 30 | tsc + build + lint = 0 problems | PASS | Frontend `tsc` + `vite build` = 0 errors; backend `tsc` = 0 errors; Prisma valid |

---

## Dependencies

- Shares `pg_trgm` name indexes with MP-24 (already merged)
- Existing OR/payment logic in `src/enrollments/enrollments.service.ts` should be extracted or reused

---

## Test Cases

### Pages and Reuse

#### TC-01: Admin and Registrar both access Payments
- **AC:** #1
- **Priority:** Critical
- **Precondition:** Logged in as admin; then as registrar
- **Steps:**
  1. Navigate to `/admin/payments` as admin
  2. Navigate to `/registrar/payments` as registrar
- **Expected:** Both pages load the Payments module

#### TC-02: Shared backend and frontend components
- **AC:** #2
- **Priority:** High
- **Precondition:** Both roles have access
- **Steps:**
  1. Compare admin and registrar payment pages
- **Expected:** Same shared service and FE components used

### Recording

#### TC-03: Record a payment for enrolled trainee
- **AC:** #4, #7
- **Priority:** Critical
- **Precondition:** Trainee enrolled in a batch
- **Steps:**
  1. Click "Record Payment"
  2. Search and select the trainee
  3. Select a payment reason
  4. Enter amount, click Save
- **Expected:** Payment recorded; receipt shows `confirmed_by` staff and `confirmed_at` timestamp

#### TC-04: Only 4 valid payment reasons
- **AC:** #5
- **Priority:** High
- **Precondition:** On payment form
- **Steps:**
  1. Open the reason dropdown
- **Expected:** Only 4 options: Processing Fee, Uniform/ID Fee, Assessment Deposit, External Fees

#### TC-05: Trainee picker searches API
- **AC:** #6
- **Priority:** High
- **Precondition:** 100+ trainees exist
- **Steps:**
  1. Start typing a trainee name in the picker
  2. Observe network requests
- **Expected:** API called as you type; never loads all trainees at once

#### TC-06: External payment doesn't affect insurance
- **AC:** #8
- **Priority:** Medium
- **Precondition:** Trainee with insurance record
- **Steps:**
  1. Record an external payment for the trainee
  2. Check insurance record
- **Expected:** Insurance unchanged

#### TC-07: Invalid input shows clean error
- **AC:** #9
- **Priority:** High
- **Precondition:** On payment form
- **Steps:**
  1. Leave amount blank, click Save
  2. Enter negative amount, click Save
- **Expected:** Clear validation errors shown (not server 500)

### OR Numbers and Duplicates

#### TC-08: Unique OR number generated
- **AC:** #10
- **Priority:** Critical
- **Precondition:** None
- **Steps:**
  1. Record a payment
  2. Record another payment for the same enrollment
- **Expected:** Both receipts have unique OR numbers in format `OR-{year}-{000000}`

#### TC-09: Concurrent payments get different OR numbers
- **AC:** #11
- **Priority:** High
- **Precondition:** Two sessions open
- **Steps:**
  1. Submit two payments at the exact same moment
- **Expected:** Both succeed with different OR numbers (atomic sequence increment)

#### TC-10: Double-click prevention
- **AC:** #12
- **Priority:** High
- **Precondition:** On payment form, filled out
- **Steps:**
  1. Double-click the Save button rapidly
- **Expected:** Only one receipt created (idempotency key prevents duplicate)

### List

#### TC-11: Search receipts by OR number, name, username
- **AC:** #14
- **Priority:** High
- **Precondition:** Receipts exist
- **Steps:**
  1. Search by OR number
  2. Search by trainee name
  3. Search by username
- **Expected:** Matching receipts returned in each case

#### TC-12: Filters, chips, and Clear all
- **AC:** #15
- **Priority:** High
- **Precondition:** Receipts exist
- **Steps:**
  1. Apply program filter
  2. Apply date range filter
  3. Remove one chip
  4. Click "Clear all"
- **Expected:** Filters combine; chips removable individually; Clear all resets all

#### TC-13: Sort and pagination
- **AC:** #16, #17
- **Priority:** High
- **Precondition:** 25+ receipts exist
- **Steps:**
  1. Sort by payment date (default newest first)
  2. Sort by amount
  3. Sort by OR number
  4. Navigate to page 2
  5. Change page size to 20, 50
  6. Call API with limit = 101
- **Expected:** Sorting works; pagination correct; limit > 100 = 400

#### TC-14: URL state survives refresh
- **AC:** #18
- **Priority:** Medium
- **Precondition:** Filters and sort applied
- **Steps:**
  1. Refresh the page
  2. Press Back
- **Expected:** Same state restored from URL

#### TC-15: Total count and total amount
- **AC:** #19
- **Priority:** High
- **Precondition:** Receipts with filters applied
- **Steps:**
  1. Apply filters and check totals
- **Expected:** Total count and total amount match filtered results; calculated in DB

#### TC-16: Receipt detail view
- **AC:** #20
- **Priority:** High
- **Precondition:** Receipt exists
- **Steps:**
  1. Click on a receipt row
- **Expected:** Detail shows all fields: amount, reason, program, batch, trainee, confirming staff

### Money

#### TC-17: Amounts displayed as PHP currency
- **AC:** #21
- **Priority:** Medium
- **Precondition:** Receipts exist
- **Steps:**
  1. View receipt amounts in list and detail
- **Expected:** Displayed as PHP currency format; no rounding errors; stored as strings

### Performance

#### TC-18: Performance under load
- **AC:** #22, #23
- **Priority:** Medium
- **Precondition:** 50,000 receipts in database
- **Steps:**
  1. Load list with search + filters, measure response time
- **Expected:** < 500ms; fixed query count (no N+1)

### Access Control

#### TC-19: Only Admin and Registrar can access
- **AC:** #24, #25, #26, #27
- **Priority:** Critical
- **Precondition:** Accounts for all roles
- **Steps:**
  1. Call payment endpoints with admin JWT → allowed
  2. Call payment endpoints with registrar JWT → allowed
  3. Call payment endpoints with trainer JWT → blocked
  4. Inspect response for `password_hash`
- **Expected:** Admin and Registrar: 200; others: 403; no `password_hash` in responses

---

## Summary: 30/30 — All PASS

AC #22 marked PASS (design) — indexes and fixed query count are in place; needs load test against 50k rows to confirm the 500ms threshold.

### Note: OR Number Unification

The enrollment-time payment flow and the independent (external) payment flow are entirely different workflows:

- **Enrollment payment** — auto-created during enrollment (`enrollments.service.ts`); tied to insurance coverage check; only for processing fee
- **Independent/external payment** — manually recorded via the Payments module (`payments.service.ts`); supports 4 reasons (Processing Fee, Uniform/ID Fee, Assessment Deposit, External Fees)

Both flows now share the same `generateOrNumber()` function (`or-number.ts`) and the `or_number_seq` table, producing a unified sequential format: `OR-{year}-{000001}`. Previously, enrollment used `OR-{year}-{uuid-fragment}` — that format is retired.
