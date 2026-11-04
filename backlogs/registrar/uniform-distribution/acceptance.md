# Uniform Distribution: Registrar Page and Deduct Stock

| Field | Value |
|-------|-------|
| **Jira** | MP-53 |
| **Type** | Feature (Registrar only, its own page) |
| **Status** | NOT STARTED |
| **Assignee** | Rhoddz Gerunda |
| **Depends on** | MP-35 (inventory module, `InventoryService.deductAndLog`) |
| **Related** | MP-35 follow-up F2, MP-16 (enrollment form), MP-59 (restock reminder, split out of this ticket), MP-58 (enrollment bug) |
| **Interface** | Registrar: new page `/registrar/uniform-distribution`. No Admin page |
| **Added** | 2026-11-03, rewritten 2026-11-04, restock reminder split out to MP-59 the same day |

---

## User Story

**As** a registrar,
**I want** a Uniform Distribution page that shows which trainees have received their uniform and which have not,
**so that** I can mark a uniform as handed out and the stock goes down automatically.

## Background

- Today, stock is deducted only at enrollment, and only if "Uniform distributed" is selected on the enrollment form. The default is "not distributed".
- If staff choose "not distributed" and hand the shirt out later, nothing updates. The distribution record (`distribution_checklist`) stays at `uniform_given = false`, and the stock never goes down.
- There is no screen to see who has and has not received a uniform, and no way to change it after the enrollment is saved.
- This is a **Registrar-only feature with its own page**. It is not a shared or reusable module and it has no Admin version. The Admin does not distribute uniforms. The Admin only manages stock on the existing Inventory page (MP-35).
- The "remind the admin to order more uniforms" feature was split out into its own ticket, **MP-59**, because it needs the notification foundation (MP-52) and the Admin bell (MP-54), which are not built yet. MP-53 does not wait for them.
- The deduction logic already exists in one method, `InventoryService.deductAndLog` (MP-35). This feature calls it. It must not be copied.
- The distribution record already has the fields needed: `uniform_given`, `size_issued`, `date_distributed`, `distributed_by`, `inventory_id`.

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Who distributes? | **Answered 2026-11-04:** the Registrar only. Admin, Trainer, Trainee and Encoder get 403 |
| 2 | Can the size handed out differ from the size chosen at enrollment? | **Answered 2026-11-04:** Yes. The registrar picks the size first, then confirms, and stock is deducted directly from the size picked. The enrollment's size is shown as a reference and is not applied automatically. The size handed out is recorded in `size_issued` |
| 3 | Which enrollments can receive a uniform? | **Answered 2026-11-04:** only `ENROLLED` ones. Withdrawn and dropped trainees are **shown greyed out and marked Inactive**, with no action. Completed ones are treated the same way. Pending ones: see gap log |
| 4 | Can a distribution be undone (shirt returned)? | No. Out of scope |


## Scope

### A. The page (`/registrar/uniform-distribution`)

- **List.** One row per enrollment: trainee name and ID card number, program, batch, size, enrollment status, and uniform status (**Not given** or **Given** with size, date and who handed it out).
- **Filters.** Uniform status (all, not given, given), program, batch, and a search by name or ID card number. The list is paged.
- **Inactive rows.** Enrollments that are `WITHDRAWN`, `DROPPED` or `COMPLETED` stay in the list, shown **greyed out** with an **Inactive** badge next to their real status. They have no "Mark as given" action. A filter lets the registrar show Active only (default) or include Inactive.
- **Counts.** A summary at the top: how many are given and how many are still waiting (Inactive rows are not counted as waiting).
- **Sidebar.** A "Uniform Distribution" link in the Registrar sidebar.

### B. Mark as distributed

- On a row with `uniform_given = false` and status `ENROLLED`, the registrar chooses "Mark as given". The dialog works in this order:
  1. The registrar **clicks the size** to hand out (required, no automatic default). The enrollment's size is shown beside it as a reference.
  2. The dialog shows the available quantity for the picked size (uses `GET /inventory/availability`, MP-35 follow-up F1). Sizes with 0 stock are shown as out of stock.
  3. The registrar confirms, and the system deducts one unit directly from the picked size.
- On confirm, the system deducts one unit for that program and the picked size, writes a `DISTRIBUTED` history row linked to the enrollment, and updates the distribution record (`uniform_given`, `size_issued`, `date_distributed`, `distributed_by`, `inventory_id`).
- **One transaction.** The record update, the deduction and the history row happen together. If any step fails, none is saved.
- **Out of stock.** If there is no stock for that program and size, the request is rejected with the same message as at enrollment ("No M uniform is currently in stock for this program.") and nothing is saved. (The "Remind admin to order more" option arrives with MP-59.)
- **No double deduction.** If the uniform is already marked as given, the request is rejected (409). Two people marking the same enrollment at the same moment deduct only once.
- **Visible result.** The row switches to Given without a refresh. The item's History and the Stock Log (MP-35) show the movement with the trainee's name and ID card number.

## Design (not shared)

Everything for this feature sits under the Registrar. There is no shared `DistributionModule` and no role-neutral components.

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Module | `src/users/registrar/uniform-distribution/` | Imports `InventoryModule` and `PrismaModule` |
| Controller | `.../uniform-distribution.controller.ts` | `@Controller('registrar/uniform-distribution')`, `@Roles(Role.REGISTRAR)` |
| Service | `.../uniform-distribution.service.ts` | List with filters and `markDistributed`. Calls `InventoryService.deductAndLog` |
| DTOs | `.../dto/` | Mark-distributed body (`sizeIssued`, `remarks`), list query |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/registrar/uniform-distribution` | List enrollments with uniform status, filters and counts |
| POST | `/api/registrar/uniform-distribution/:enrollmentId/distribute` | Mark as given and deduct stock |

### Frontend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Page | `src/pages/users/registrar/uniform-distribution/RegistrarUniformDistributionPage.tsx` | List, filters, counts, dialogs |
| API | `src/api/registrar/uniformDistribution.api.ts` | The two calls above |
| Route | `/registrar/uniform-distribution` | Guarded for REGISTRAR only |

## Out of Scope

- An Admin version of this page, and any shared or reusable distribution module.
- Returning stock when a uniform is handed back, or when a trainee withdraws or drops (also out of scope in MP-35).
- Distributing the ID card (`id_card_given`) or other items.
- Bulk distribution for a whole batch.
- The restock reminder to the Admin (MP-59).
- Placing the order or tracking a purchase.

---

## Acceptance Criteria

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | The Registrar can open `/registrar/uniform-distribution`. The Registrar sidebar has the link | NOT STARTED | |
| 2 | Admin, trainer, trainee and encoder get 403 from every endpoint and cannot open the page | NOT STARTED | Open question 1 |
| 3 | Every endpoint returns 401 without a token | NOT STARTED | |

### The Page

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | The list shows each enrollment with trainee name, ID card number, program, batch, size, status and uniform status (Not given, or Given with size, date and who handed it out) | NOT STARTED | |
| 5 | The summary shows the count given and the count waiting | NOT STARTED | |
| 6 | The list filters by uniform status, program and batch, searches by name or ID card number, and is paged | NOT STARTED | |
| 7 | Withdrawn, dropped and completed enrollments are shown **greyed out with an Inactive badge** and have no "Mark as given" action | NOT STARTED | Open question 3 |
| 7a | The list shows Active enrollments by default. A filter includes Inactive rows. Inactive rows are not counted as waiting | NOT STARTED | |

### Distribution and Deduction

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 8 | **Given** an enrolled trainee with the uniform not given and Program A size M at 5, **when** the registrar marks it as given, **then** stock becomes 4 | NOT STARTED | |
| 9 | The distribution record is updated: `uniform_given = true`, `size_issued`, `date_distributed`, `distributed_by` (the logged-in registrar) and `inventory_id` | NOT STARTED | |
| 10 | A `DISTRIBUTED` history entry is saved: -1, quantity after 4, linked to the enrollment, performed by the logged-in registrar | NOT STARTED | |
| 11 | The registrar must click a size before confirming. The confirm button stays disabled until a size is picked. Stock is deducted directly from the picked size, even if it differs from the enrollment's size, and `size_issued` records it | NOT STARTED | Open question 2 |
| 12 | The stock change, the history row and the distribution record are saved in one transaction. If any step fails, none is saved | NOT STARTED | |
| 13 | Stock is 0 for that program and size: the request is rejected with an out-of-stock message and nothing is saved | NOT STARTED | Same message as enrollment |
| 14 | The uniform is already marked as given: the request is rejected (409) and stock is not deducted again | NOT STARTED | |
| 15 | Two requests for the same enrollment at the same moment deduct stock only once | NOT STARTED | Conditional update on `uniform_given = false` |
| 16 | Two enrollments handed the last shirt at the same moment: only one succeeds, stock never goes below 0 | NOT STARTED | Row lock in `deductAndLog` |
| 17 | Only `ENROLLED` enrollments can be marked. Others are rejected (400) | NOT STARTED | |
| 18 | An unknown enrollment id returns 404 and a malformed id returns 400 | NOT STARTED | `ParseUUIDPipe` |
| 19 | The dialog shows the available quantity for the chosen size before confirming. The button is disabled while saving, so it cannot be double-submitted | NOT STARTED | Needs MP-35 F1 |
| 20 | After saving, the row shows Given without a refresh, and an error message shows on failure | NOT STARTED | |
| 21 | The item's History and the Stock Log show the movement with the trainee's name and ID card number | NOT STARTED | Already supported by the MP-35 history query |
| 22 | The deduction uses `InventoryService.deductAndLog`. The logic is not copied | NOT STARTED | Also satisfies MP-35 criteria 12 and 23 |

### Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 23 | Backend and frontend lint and build pass. Tests cover success, out of stock, already given, wrong status and concurrency | NOT STARTED | |

---

## Test Cases

### TC-01: Mark a uniform as distributed
- **Precondition:** Enrollment with `uniform_given = false`, status ENROLLED, size M. Program A size M has 5.
- **Steps:**
  1. Log in as Registrar and open `/registrar/uniform-distribution`.
  2. Find the trainee and choose "Mark as given". The dialog shows 5 available for M.
  3. Confirm.
- **Expected:** Success message. Stock for Program A size M is 4. The row shows Given with the size, today's date and the Registrar's name. History shows one `DISTRIBUTED` entry, -1, balance 4. The summary counts update.

### TC-02: Out of stock
- **Precondition:** Same as TC-01, but Program A size M has 0.
- **Steps:** Try to mark the uniform as given.
- **Expected:** Error "No M uniform is currently in stock for this program." The row still shows Not given. Stock is still 0. No history entry.

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

### TC-06: Pick the size, then deduct
- **Precondition:** Enrollment size M. Program A size L has 3 and size M has 5.
- **Steps:** Choose "Mark as given". Confirm is disabled. Click size L. The dialog shows 3 available. Confirm.
- **Expected:** Stock for size L is 2. Size M is still 5. The record shows `size_issued = L`.

### TC-06b: Same size as enrollment
- **Steps:** Click size M (the enrollment's size) and confirm.
- **Expected:** Stock for size M goes down by 1. The size is still a deliberate click, not applied automatically.

### TC-07: Wrong status
- **Precondition:** Enrollment status WITHDRAWN.
- **Steps:** Open the list, then try to mark the uniform as given by API.
- **Expected:** The row is greyed out with an Inactive badge and has no action. The API call returns 400. Nothing changes.

### TC-07b: Active filter
- **Precondition:** One withdrawn and one enrolled trainee.
- **Steps:** Open the page, then include Inactive rows.
- **Expected:** By default only the enrolled trainee shows. With Inactive included, the withdrawn trainee shows greyed out and is not counted as waiting.

### TC-08: Role access
- **Steps:** Call every endpoint as Admin, Trainer, Trainee and Encoder, and without a token.
- **Expected:** 403 for the four roles, 401 without a token. `/admin/uniform-distribution` does not exist.

### TC-09: Rollback
- **Precondition:** Make the history write fail (test with a mocked database).
- **Steps:** Mark the uniform as given.
- **Expected:** Stock, history and the distribution record are all unchanged.

---

## Summary: 0/24 PASS, NOT STARTED
