# Admin Edit Trainee: Info, Batch/Schedule and Program Changes

| Field | Value |
|-------|-------|
| **Jira** | MP-42 |
| **Type** | Feature (Admin edits, Registrar reads the history) |
| **Status** | BUILT and audited (2026-11-09), not merged. The PM applies the migration to Supabase. Jira already says Done |
| **Priority** | Medium |
| **Assignee** | Aubrien Fuentes (per Jira, 2026-11-09) |
| **Audit** | `audit-dod.md`, 2026-11-09: 21 PASS, 1 PARTIAL on the 22 Jira criteria. Open: no unit tests for the new code, migration not on Supabase, merge not done |
| **Depends on** | MP-24 (Student Information module, must be done first), MP-33 (shared `EnrollmentsService`), MP-35 (uniform stock on program change) |
| **Decision log** | `registrar/decisions.md` D-01 (why the change history exists) |
| **Added** | 2026-11-04 (from the Jira ticket) |

---

## User Story

**As an** admin,
**I want** to edit a trainee's information, and change their batch (schedule) or program when they ask,
**so that** trainee records stay correct and every schedule or program change follows the enrollment rules and leaves a history.

## Background

- MP-24 builds the reusable, view-only Student Information module used by Admin (`/admin/trainees`) and Registrar (`/registrar/records`).
- This ticket adds editing for **Admin only** by turning on the module's `canEdit` setting and plugging in an Edit form. The Registrar stays view-only.
- A schedule is not stored on the student. It belongs to the program (`program_schedule`) and the batch, so changing the schedule means moving to another batch.
- Changing batch or program is not a plain field edit. It affects batch capacity, the ID card number, payment, uniform stock and the program rules, so it goes through the shared `EnrollmentsService` checks and is logged.

## Scope

### 1. Edit trainee info (Admin)

One Edit button on the trainee profile opens one form.

| Section | Fields |
|---------|--------|
| Personal details | First / middle / last name, gender, date and place of birth, citizenship, civil status, PWD |
| Contact and address | Contact number, email, street, barangay, municipality, district, province |
| Family | Mother's and father's name |
| Education and employment | Highest education, employment status and type |
| Beneficiary | Name, relationship, contact number, ID number, address |

- Normal validation: required fields, birth date not in the future, contact number length, email format and unique.
- Username (system ID) and password cannot be edited.

### 2. Change batch (same program, a schedule change)

- On each enrollment card, a Batch dropdown lists eligible batches in the same program, with schedule (days and time), dates and remaining slots.
- The existing enrollment moves to the new batch (`enrollments.batch_id` is updated). ID card number, OR / payment, uniform distribution, requirement checklist and attendance are kept.
- The target batch must be `OPEN`, have an end date of today or later, and have active enrollments below `capacity`. It cannot be the batch the trainee is already in.
- For non-accredited programs, the new schedule must not overlap the trainee's other active enrollments.

### 3. Change program

On each enrollment card, a Program dropdown, then an eligible batch in that program. In one transaction:

- The old enrollment becomes `WITHDRAWN` with `exit_reason` = "Shifted to {new program}: {reason}".
- A new enrollment is created in the chosen batch, reusing the existing `trainee` row.
- A new ID card number is generated (it contains the program prefix).
- The requirement checklist is copied to the new enrollment.
- **Payment:** carried over by default (no new OR; the new enrollment's remarks reference the old OR). **Decided 2026-11-04:** this is the default because all programs have the same payment, so there is no fee difference to collect or refund. The admin can still choose to record a new payment instead (see the open gap below).
- **Uniform:** if the new program needs a different uniform, the admin can mark it as given, which deducts stock through the inventory module (MP-35). Out of stock blocks the change.
- The normal enrollment rules apply: one active accredited program, capacity, schedule overlap, no duplicate batch.

### 4. Rules for every save

- Batch and program changes require a reason.
- Only `PENDING` and `ENROLLED` enrollments can change batch or program. `WITHDRAWN`, `DROPPED` and `COMPLETED` are read-only.
- A confirmation step shows a "From → To" summary before saving.
- Everything in one save is a single transaction. If any part fails (for example the batch is full), nothing is saved and the admin sees a clear message.

### 5. Change history (decision D-01, option A)

New table `enrollment_transfers` (one migration): `id`, `type` (`BATCH_CHANGE`, `PROGRAM_CHANGE`), `trainee_id`, `from_enrollment_id`, `to_enrollment_id`, `from_batch_id`, `to_batch_id`, `reason`, `performed_by`, `created_at`.

- Every batch or program change writes one row. Rows are append-only.
- For a `BATCH_CHANGE`, `from_enrollment_id` and `to_enrollment_id` are the **same** enrollment, because the enrollment moves and is not replaced. They differ only for a `PROGRAM_CHANGE`.
- The trainee profile shows a Change History section, newest first: date and time, type, from, to, reason and admin name.
- Visible to Admin and Registrar (Registrar read-only).

## Backend

Added to the admin controller of the MP-24 module. Reuse the shared `EnrollmentsService` validation. Do not copy it.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/admin/trainees/:traineeId` | Update trainee info and beneficiary |
| GET | `/admin/enrollments/:id/change-options` | Eligible batches (same program) and programs/batches for a program change |
| POST | `/admin/enrollments/:id/change-batch` | Move to another batch of the same program |
| POST | `/admin/enrollments/:id/change-program` | Move to a different program |
| GET | `/admin/trainees/:traineeId/change-history` | Change history (Admin) |
| GET | `/registrar/trainees/:traineeId/change-history` | Change history (Registrar, read-only) |

Update, change-batch and change-program endpoints are `ADMIN` only. There are no Registrar update endpoints. Responses never include `password_hash`.

## Frontend

- In the MP-24 module, set `canEdit = true` for Admin only.
- Edit button on the profile header opens the trainee info form.
- Change Batch / Program action on each `PENDING` / `ENROLLED` enrollment card opens a modal with the batch and program dropdowns, reason, payment and uniform options, and the "From → To" confirmation.
- Change History section on the profile (Admin and Registrar).
- Success and error toasts. The profile refreshes after saving.

## Open Gaps

| # | Gap | Current assumption |
|---|-----|--------------------|
| 1 | Who takes MP-42? The ticket has no assignee | **Resolved.** Jira shows Aubrien Fuentes (checked 2026-11-09) |
| 2 | Since all programs have the same payment, is the "record a new payment instead" option still needed? | Kept as an option for now |

## Out of Scope

- The Registrar editing anything.
- Enrollment status changes and the requirement checklist (MP-33).
- Trainees requesting a batch or program change from the student portal.
- Refunds or fee differences between programs beyond carry-over or new payment.
- Moving attendance or grades between programs.

---

## Acceptance Criteria

### Edit Trainee Info

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | An admin on a trainee's profile clicks Edit, changes details and saves. The changes persist after a refresh | PASS | API and browser |
| 2 | Invalid input (future birth date, missing required field, duplicate email) shows a clear error, not a server error | PASS | API and browser. Also added: text too long for its column is a 400, not a server error |
| 3 | The username (system ID) and password cannot be edited | PASS | API and browser. Sent values are ignored; the hash and username stay unchanged |

### Change Batch

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | An `ENROLLED` trainee in Program A, Batch 1 is moved to Batch 2 of Program A with a reason. The same enrollment shows Batch 2 and its schedule. ID card number, OR, uniform and documents are unchanged | PASS | API and browser |
| 5 | Only open, non-full batches of the same program are offered. A full, closed or past batch is rejected with a clear message | PASS | API. A batch ending today is allowed |
| 6 | For non-accredited programs, a batch whose schedule overlaps the trainee's other active enrollments is rejected | PASS | API |

### Change Program

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 7 | An `ENROLLED` trainee in Program A is changed to Program B, Batch 3 with a reason. The Program A enrollment becomes `WITHDRAWN` with an exit reason mentioning the shift, and a new `ENROLLED` enrollment exists in Program B, Batch 3 | PASS | API and browser |
| 8 | The new enrollment gets a new ID card number with Program B's prefix, and the requirement checklist is copied over | PASS | API and browser |
| 9 | Payment carries over by default. Choosing "new payment" records a new OR | PASS | API. The new enrollment remarks reference the old OR, also after a second shift |
| 10 | If a uniform is marked given for the new program, stock goes down by 1 (MP-35). Out of stock blocks the change | PASS | API and browser. Stock history entry written |
| 11 | The one-active-accredited-program, capacity and schedule-overlap rules are enforced | PASS | API |

### Every Save

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 12 | A reason is required for batch and program changes. Saving without one is rejected | PASS | API and browser. A reason of only spaces is also rejected |
| 13 | Only `PENDING` and `ENROLLED` enrollments can change batch or program | PASS | API |
| 14 | If any part of a save fails, nothing is saved: no partial info update, no moved batch, no half-created enrollment | PASS | API. Forced failure at the last step: every table unchanged, including the ID, OR and stock counters |

### Change History

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 15 | Every batch or program change creates a history row with the date and time and the admin's `users.id` | PASS | D-01. API |
| 16 | The profile shows the change history, newest first, for Admin and Registrar | PASS | API and browser |
| 17 | History rows cannot be edited or deleted. For a batch change, from and to enrollment are the same enrollment | PASS | Append-only. API. No update or delete route exists, and the code never updates or deletes rows. No database trigger, same as the other history tables |

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 18 | The Registrar sees no Edit or Change actions, and calling the admin update endpoints returns 403 | PASS | API and browser |
| 19 | Trainee, trainer and encoder get 403 from all these endpoints. Requests without a token get 401 | PASS | API |
| 20 | Responses never include `password_hash` | PASS | API |

### Data and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 21 | Exactly one migration is added, for `enrollment_transfers`. `npx prisma migrate status` says "Database schema is up to date" after applying it | PARTIAL | One migration added, `20261106_trainee_enrollment_transfers`. "Up to date" on a throwaway database (with the TECH-02 byte-order mark removed from a copy of `0_init`), and no drift from `schema.prisma`. The PM runs it on Supabase |
| 22 | No logic is copied from `EnrollmentsService` or the MP-24 module. This ticket extends them | PASS | Shared rules, payment and uniform steps are reused; the last two were moved out of `createEnrollment` into helpers |
| 23 | Backend and frontend type-check, build and lint with 0 problems | PASS | Backend and frontend. Jest 102 of 102, but none of those tests cover the new code (audit F-1). `tsc` needs `prisma generate` first on a fresh checkout |

---

## Test Cases

### TC-01: Edit info
- **Steps:** As Admin, edit a trainee's contact number and beneficiary, save, refresh.
- **Expected:** Changes persist. Username and password fields cannot be edited.

### TC-02: Validation
- **Steps:** Enter a future birth date, then a duplicate email.
- **Expected:** Clear errors. Nothing saved.

### TC-03: Change batch
- **Precondition:** `ENROLLED` in Program A Batch 1. Batch 2 of Program A is open with slots.
- **Steps:** Change to Batch 2 with a reason and confirm.
- **Expected:** Same enrollment now in Batch 2. ID card, OR, uniform, documents unchanged. One `BATCH_CHANGE` history row with the same from and to enrollment.

### TC-04: Full batch
- **Steps:** Try to move to a full batch.
- **Expected:** Clear message ("Batch 2 is full"). Nothing changes, no history row.

### TC-05: Schedule overlap
- **Precondition:** Non-accredited trainee with another active enrollment.
- **Steps:** Choose a batch that overlaps.
- **Expected:** Rejected.

### TC-06: Change program
- **Steps:** Change Program A to Program B, Batch 3, with a reason and a carried-over payment.
- **Expected:** Old enrollment `WITHDRAWN` with the shift reason. New `ENROLLED` enrollment with a new ID card number, checklist copied, no new OR. One `PROGRAM_CHANGE` history row with different from and to enrollments.

### TC-07: Program change with uniform
- **Steps:** Mark the uniform as given for Program B, then repeat with that size at 0 stock.
- **Expected:** First: stock down by 1 with a history entry. Second: blocked, nothing saved.

### TC-08: Rollback
- **Steps:** Make the last step fail (mocked).
- **Expected:** No moved batch, no new enrollment, no history row.

### TC-09: No reason
- **Steps:** Submit a batch change with an empty reason.
- **Expected:** Rejected.

### TC-10: Registrar view
- **Steps:** As Registrar, open the same trainee and call the admin endpoints.
- **Expected:** Change History visible, no Edit or Change actions, 403 from admin endpoints.

---

## How It Was Checked

On a throwaway Postgres 17 outside the repository, which was then shut down. "API" is real requests against the built backend (194 checks, all passed). "Browser" is the real pages in headless Edge as Admin, Registrar and Encoder (30 checks, all passed). Nothing was run against Supabase.

Not exercised: attendance rows on a batch change. The enrollment row keeps its id, and attendance points to that id.

## Decisions Made While Building

These were not in the ticket. Change them if the team disagrees.

| # | Decision | Why |
|---|----------|-----|
| 1 | A `PENDING` enrollment stays `PENDING` after a program change | A shift should not confirm an enrollment |
| 2 | A batch where the trainee already has another enrollment cannot be chosen, even if they left it | The database allows one enrollment per trainee and batch. The audit found the same enrollment can move back to a batch it held earlier, because it is one row |
| 3 | Editing a contact number does not check if another trainee uses it | The ticket lists only the length check |

## Known Gaps

| # | Gap | Effect |
|---|-----|--------|
| 1 | A carried-over payment makes no receipt on the new enrollment, as decided | The withdrawal page (MP-47) reads receipts of the enrollment, so it shows the enrollment fee as unpaid for a shifted trainee. The profile shows no OR number for it either, and does not show the enrollment remarks that hold the carried-over OR |
| 2 | The schedule belongs to the program, not the batch | A batch change within a program changes the dates, trainer and capacity, but the days and times stay the same |
| 3 | The profile does not show `exit_reason` | The shift reason is saved on the withdrawn enrollment and shown in Change History, but not on its card |
| 4 | The ticket does not cover an open withdrawal request | A change is allowed while one is open. After a program change the request stays attached to the withdrawn enrollment |
| 5 | Two saves that clash at commit reach `createEnrollment` and the status update as a server error | Found while building. Those two flows are outside this ticket, so they were left as they were. Batch and program changes return a clear 409 |

---

## Summary: 22 PASS, 1 PARTIAL (the PM runs the migration on Supabase)
