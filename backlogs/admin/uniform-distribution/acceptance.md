# Uniform Distribution: Update a Distribution and Deduct Stock

| Field | Value |
|-------|-------|
| **Jira** | MP-53 |
| **Type** | Feature (reusable module, Admin and Registrar) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira's default at creation, reassign if needed) |
| **Depends on** | MP-35 (inventory module, `InventoryService.deductAndLog`) |
| **Related** | MP-35 follow-up F2, MP-42 (admin edit trainee), MP-33 (admin enrollments) |
| **Planned routes** | Enrollment detail pages for Admin and Registrar |
| **Added** | 2026-11-03 |

---

## User Story

**As** staff who hands out uniforms,
**I want** to mark a uniform as distributed after enrollment,
**so that** the stock goes down automatically and the history shows who received it and who handed it over.

## Background

- Today, stock is deducted only at enrollment, and only if "Uniform distributed" is selected on the enrollment form. The default is "not distributed".
- If staff choose "not distributed" and hand the shirt out later, nothing updates. The distribution record (`distribution_checklist`) stays at `uniform_given = false`, and the stock never goes down.
- There is no endpoint or screen to change a distribution after the enrollment is saved.
- The deduction logic already exists in one shared method, `InventoryService.deductAndLog` (MP-35). This feature reuses it. It must not be copied.
- The feature is built as one reusable module, following the convention used by MP-24 and MP-33: logic once in a shared place, a thin wrapper per role. See "Reusable Module Design".
- The distribution record already has the fields needed: `uniform_given`, `size_issued`, `date_distributed`, `distributed_by`, `inventory_id`.

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Who is the "distributor"? There is no distributor role. The roles are Admin, Registrar, Trainer, Trainee and Encoder | **Answered 2026-11-03:** Admin and Registrar, the same as the inventory module |
| 2 | Can the size handed out differ from the size chosen at enrollment? | Yes. The size defaults to the enrollment's size, and staff can change it. The size actually handed out is recorded in `size_issued` |
| 3 | Which enrollments can receive a uniform? | Only `ENROLLED` ones. Withdrawn, dropped and completed enrollments cannot |
| 4 | Can a distribution be undone (shirt returned)? | No. Out of scope (see below) |

## Scope

- **Mark as distributed.** On an enrollment whose uniform has not been given, staff can mark it as given. The system deducts one unit for that program and size, writes a `DISTRIBUTED` history row linked to the enrollment, and updates the distribution record (`uniform_given`, `size_issued`, `date_distributed`, `distributed_by`, `inventory_id`).
- **One transaction.** The record update, the stock deduction and the history row happen together. If any step fails, none of them is saved.
- **Out of stock.** If there is no stock for that program and size, the request is rejected with the same message as at enrollment ("No M uniform is currently in stock for this program.") and nothing is saved.
- **No double deduction.** If the uniform is already marked as given, the request is rejected (409). Two people marking the same enrollment at the same moment deduct only once.
- **Availability shown first.** The screen shows the available quantity for the chosen size before staff confirm (uses `GET /inventory/availability`, MP-35 follow-up F1).
- **Visible result.** The enrollment detail shows the uniform as given, the size, the date and who handed it out. The item's History and the Stock Log show the movement with the trainee's name and ID card number.

## Reusable Module Design

Build the logic once and wrap it per role, the same way the shared enrollment module works (one `EnrollmentsService`, thin Admin and Registrar controllers, shared components that take their API base from `EnrollmentApiContext`). Do not copy code between role folders.

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| `DistributionModule` | `src/distribution/` (root of `src`, not under a role) | Imports `InventoryModule` and `PrismaModule`. Exports `DistributionService` |
| `DistributionService` | `src/distribution/distribution.service.ts` | `markUniformDistributed(enrollmentId, dto, userId)`: all rules, the transaction, the call to `InventoryService.deductAndLog`, the update of the distribution record. No role logic |
| DTO | `src/distribution/dto/mark-uniform-distributed.dto.ts` | `sizeIssued` (optional size), `remarks` (optional) |
| Admin controller | `src/users/admin/distribution/` | `@Controller('admin/enrollments')`, `@Roles(Role.ADMIN)`. Thin: passes the request to the service |
| Registrar controller | `src/users/registrar/distribution/` | `@Controller('registrar/enrollments')`, `@Roles(Role.REGISTRAR)`. Thin: passes the request to the service |

Endpoints (one per role, same body and response):

| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/admin/enrollments/:id/distribution/uniform` | Admin |
| POST | `/api/registrar/enrollments/:id/distribution/uniform` | Registrar |

Body: `sizeIssued` (optional, defaults to the enrollment's size), `remarks` (optional).

### Frontend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| `distribution.api.ts` | `src/api/distribution.api.ts` | `markUniformDistributed(basePath, enrollmentId, payload)`. The base path (`/api/admin` or `/api/registrar`) comes from the role's API context, as in `EnrollmentApiContext` |
| `useUniformDistribution` | `src/hooks/useUniformDistribution.ts` | Loads availability for the chosen size, submits, handles saving and error state, prevents a double submit |
| `UniformDistributionDialog` | `src/components/distribution/` | Size picker, available quantity, remarks, confirm. No role logic |
| `UniformDistributionStatus` | `src/components/distribution/` | Shows not given, or given with size, date and who handed it out. Includes the "Mark as given" button when allowed |
| Use in the pages | `EnrollmentDetail` (already shared by Admin and Registrar) | Renders `UniformDistributionStatus` with the enrollment, `canDistribute` and an `onChanged` callback. The Admin and Registrar pages stay thin wrappers |

The status and dialog components take only the enrollment, `canDistribute` and callbacks as props, so other screens can reuse them later (for example MP-42 when a trainee's program changes, or a batch trainee list).

## Out of Scope

- Returning stock when a uniform is handed back, or when a trainee withdraws or drops (separate ticket, also out of scope in MP-35).
- Distributing the ID card (`id_card_given`) or other items.
- Bulk distribution for a whole batch.

---

## Acceptance Criteria

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Admin and Registrar can mark a uniform as distributed from the enrollment detail page | NOT STARTED | |
| 2 | Trainee, trainer and encoder get 403 from the endpoint | NOT STARTED | Depends on open question 1 |
| 3 | The endpoint returns 401 without a token | NOT STARTED | |

### Distribution and Deduction

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | **Given** an enrolled trainee with the uniform not given and Program A size M at 5, **when** staff mark it as distributed, **then** stock becomes 4 | NOT STARTED | |
| 5 | The distribution record is updated: `uniform_given = true`, `size_issued`, `date_distributed`, `distributed_by` (the logged-in user) and `inventory_id` | NOT STARTED | |
| 6 | A `DISTRIBUTED` history entry is saved: -1, quantity after 4, linked to the enrollment, performed by the logged-in user | NOT STARTED | |
| 7 | The size can be changed at handout. Stock is deducted from the size handed out, and `size_issued` records it | NOT STARTED | Open question 2 |
| 8 | The stock change, the history row and the distribution record are saved in one transaction. If any step fails, none is saved | NOT STARTED | |
| 9 | Stock is 0 for that program and size: the request is rejected with an out-of-stock message and nothing is saved | NOT STARTED | Same message as enrollment |
| 10 | The uniform is already marked as given: the request is rejected (409) and stock is not deducted again | NOT STARTED | |
| 11 | Two requests for the same enrollment at the same moment deduct stock only once | NOT STARTED | Conditional update on `uniform_given = false` |
| 12 | Two enrollments handed the last shirt at the same moment: only one succeeds, stock never goes below 0 | NOT STARTED | Row lock in `deductAndLog` |
| 13 | Only `ENROLLED` enrollments can be updated. Withdrawn, dropped and completed ones are rejected (400) | NOT STARTED | Open question 3 |
| 14 | An unknown enrollment id returns 404 and a malformed id returns 400 | NOT STARTED | `ParseUUIDPipe` |

### Screen

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 15 | The enrollment detail shows the uniform status: not given, or given with size, date and who handed it out | NOT STARTED | |
| 16 | Before confirming, the screen shows the available quantity for the chosen size | NOT STARTED | Needs MP-35 F1 |
| 17 | Staff confirm in a dialog. The button is disabled while saving, so it cannot be double-submitted | NOT STARTED | |
| 18 | After saving, the screen shows the new status without a refresh, and shows an error message on failure | NOT STARTED | |

### Reusable Module

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 22 | One `DistributionService` holds all the logic. The Admin and Registrar controllers only pass requests through, with no logic of their own | NOT STARTED | Module convention from MP-24 |
| 23 | The module lives at `src/distribution/`, not inside a role folder, and `DistributionModule` is imported by the app module | NOT STARTED | |
| 24 | One shared set of frontend components (`UniformDistributionDialog`, `UniformDistributionStatus`) and one hook serve both roles. The role only sets the API base path and `canDistribute` | NOT STARTED | Like `EnrollmentApiContext` |
| 25 | The Admin and Registrar enrollment detail pages show identical behavior, with no duplicated component code | NOT STARTED | |

### History and Reuse

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 19 | The item's History and the Stock Log show the movement with the trainee's name and ID card number | NOT STARTED | Already supported by the MP-35 history query |
| 20 | The deduction uses `InventoryService.deductAndLog`. The logic is not copied | NOT STARTED | Also satisfies MP-35 criterion 12 and 23 |
| 21 | Backend and frontend lint and build pass. Tests cover success, out of stock, already given, wrong status and concurrency | NOT STARTED | |

---

## Test Cases

### TC-01: Mark a uniform as distributed
- **Precondition:** Enrollment with `uniform_given = false`, status ENROLLED, size M. Program A size M has 5.
- **Steps:**
  1. Log in as Registrar and open the enrollment detail.
  2. Choose "Mark uniform as given". The screen shows 5 available for M.
  3. Confirm.
- **Expected:** Success message. Stock for Program A size M is 4. The enrollment shows the uniform as given with the size, today's date and the Registrar's name. History shows one `DISTRIBUTED` entry, -1, balance 4.

### TC-02: Out of stock
- **Precondition:** Same as TC-01, but Program A size M has 0.
- **Steps:** Try to mark the uniform as given.
- **Expected:** Error "No M uniform is currently in stock for this program." The enrollment still shows not given. Stock is still 0. No history entry.

### TC-03: Already given
- **Precondition:** Enrollment with `uniform_given = true`.
- **Steps:** Send the request again (for example from a second browser tab).
- **Expected:** 409. Stock is not deducted again. No second history entry.

### TC-04: Same enrollment, two requests at once
- **Precondition:** Enrollment not given, stock 5.
- **Steps:** Send two requests for the same enrollment at the same time.
- **Expected:** One succeeds and one gets 409. Stock is 4. One history entry.

### TC-05: Last shirt, two enrollments at once
- **Precondition:** Program A size M has 1. Two different enrollments not given.
- **Steps:** Mark both as given at the same time.
- **Expected:** One succeeds. The other gets the out-of-stock error. Stock is 0, never negative.

### TC-06: Different size at handout
- **Precondition:** Enrollment size M. Program A size L has 3.
- **Steps:** Choose size L when marking as given.
- **Expected:** Stock for size L is 2. Size M is unchanged. The record shows `size_issued = L`.

### TC-07: Wrong status
- **Precondition:** Enrollment status WITHDRAWN.
- **Steps:** Try to mark the uniform as given.
- **Expected:** 400. Nothing changes.

### TC-08: Role access
- **Steps:** Call the endpoint as Trainee, Trainer and Encoder, and without a token.
- **Expected:** 403 for the three roles, 401 without a token.

### TC-09: Rollback
- **Precondition:** Make the history write fail (test with a mocked database).
- **Steps:** Mark the uniform as given.
- **Expected:** Stock, history and the distribution record are all unchanged.

### TC-10: Same component for both roles
- **Precondition:** Enrollment not given, stock available.
- **Steps:** Mark a uniform as given as Admin, then another enrollment as Registrar.
- **Expected:** Same dialog, same result, same history entry. Each entry shows the role of the person who did it. Both go through `DistributionService`.

---

## Summary: 0/25 PASS, NOT STARTED
