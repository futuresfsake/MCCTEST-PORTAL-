# Registrar Decision Log

A structured record of decisions that affect the Registrar, with the reason for each, so the team can check later why something was built the way it was.

**How to add an entry:** copy the entry template at the bottom, give it the next ID (D-04, D-05, ...), add a row to the index, and never delete an old entry. If a decision changes, set the old one to `SUPERSEDED` and name the new ID.

**Status values:** `DECIDED` (final), `OPEN` (rationale recorded, choice still to be made), `SUPERSEDED` (replaced by a later entry).

---

## Index

| ID | Date | Ticket | Decision | Status |
|----|------|--------|----------|--------|
| D-01 | 2026-11-04 | MP-42 | Batch and program changes write a history row (`enrollment_transfers`), option A as written in the ticket. Registrar reads it, read-only | DECIDED |
| D-02 | 2026-11-04 | MP-53 | Uniform Distribution is a Registrar-only page, not a shared module. The size is clicked first, then stock is deducted | DECIDED |
| D-03 | 2026-11-04 | MP-43 | Requirements Tracking is Registrar only. Bulk update capped at 100 rows, all or nothing | DECIDED |
| D-04 | 2026-11-04 | MP-53, MP-59 | The restock reminder is split out of MP-53 into its own ticket, MP-59. Withdrawn and dropped trainees are shown greyed out as Inactive | DECIDED |
| D-05 | 2026-11-04 | MP-42, MP-43 | Payment carries over on a program change (all programs have the same payment). Requirements page defaults to ENROLLED | DECIDED |
| D-06 | 2026-11-04 | MP-45 to MP-49 | Withdrawal validation is sequential: Trainer first, then Registrar, then Admin. No race condition, `REGISTRAR_VALIDATED` removed | DECIDED |
| D-07 | 2026-11-04 | MP-48 | A trainer must give a reason when rejecting a withdrawal request. Remarks stay optional when approving | DECIDED |
| D-08 | 2026-11-06 | MP-47 | Registrar withdrawal validation: three manual ticks, a reason is required on reject, a rejection is final for that request, the Registrar sees all requests, no history table, released on its own (per task) | DECIDED |
| D-09 | 2026-11-06 | MP-47, MP-49 | The registrar checks finances and documents only (two ticks) and sees whether the enrollment fee is paid. ID surrendered moves to the Admin sign-off. Built in MP-47 | DECIDED |
| D-10 | 2026-11-06 | MP-47 | The registrar reads the trainee's payment history in a pop-up from the Enrollment fee box, read only, without leaving the page | DECIDED |
| D-11 | 2026-11-06 | MP-47 | Only the functional code is committed: the unit tests are kept in a local stash, and no test data or reference notes are in the code | DECIDED |

---

## D-01. MP-42 keeps a change history

| Field | Value |
|-------|-------|
| **ID** | D-01 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-42 (Admin Edit Trainee: Info, Batch/Schedule and Program Changes) |
| **Status** | DECIDED (option A, confirmed 2026-11-04) |
| **Registrar impact** | Sees the Change History section on a trainee profile, read-only. Cannot change batch or program |
| **Supersedes / Superseded by** | None |

**Context**
MP-42 lets the Admin move a trainee to another batch (a schedule change) or to another program. A batch change updates `enrollments.batch_id` on the same enrollment. A program change withdraws the old enrollment and creates a new one.

**Decision**
Every batch or program change writes one append-only history row with the trainee, the from and to enrollment, the from and to batch, the reason, the admin and the time.

**Rationale**

| # | Reason |
|---|--------|
| 1 | A batch change overwrites the old batch. Without a history row, nothing shows that the trainee was in Batch 1, who moved them, when, or why |
| 2 | A program change leaves only a free-text `exit_reason` on the withdrawn enrollment. Nothing links old and new enrollment. `from_enrollment_id` and `to_enrollment_id` make the link explicit |
| 3 | Staff will be asked "why am I in the evening batch?" or "why do I have two ID card numbers?". The reason, the admin and the time answer these |
| 4 | Attendance, batch capacity counts and the trainer's batch list follow the batch. Knowing when a trainee moved explains the numbers if they look wrong |
| 5 | A program change can carry over a payment or deduct a uniform. An audit trail is the usual safeguard for payments and stock. The project already keeps one for stock (MP-35 history) |
| 6 | The reason is required on every change. It is cheap, and it is what makes the history useful |
| 7 | The Registrar handles enrollments and answers trainee questions at the counter, so they need to read it. Read-only keeps the Admin as the only person who can change anything |

**Options considered**

| Option | Description | For | Against |
|--------|-------------|-----|---------|
| A | Keep the table as written in MP-42: batch and program changes | Clear link between old and new enrollment. Matches the current ticket | One more table for one module |
| B | Smaller: log batch changes only | Program changes are already partly traceable through the withdrawn enrollment | Loses the explicit link between old and new enrollment |
| C | One shared audit log for all modules | Would also cover MP-43 requirement history and future needs | Bigger change. A team design choice, and other modules already have their own history tables |

**Chosen:** option A. Keep the table as written in MP-42.

**Not in question:** the mandatory reason, and the Registrar being read-only.

**Consequences:** one migration for the history table. A Change History section on the profile for Admin and Registrar. For a `BATCH_CHANGE`, `from_enrollment_id` and `to_enrollment_id` are the same enrollment, because the enrollment moves and is not replaced. They differ only for a `PROGRAM_CHANGE`.

---

## D-02. MP-53 Uniform Distribution is Registrar only and not reusable

| Field | Value |
|-------|-------|
| **ID** | D-02 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-53 |
| **Status** | DECIDED |
| **Registrar impact** | Owns the page `/registrar/uniform-distribution` |
| **Supersedes / Superseded by** | Replaces the first draft of MP-53, which was a reusable module for Admin and Registrar |

**Context**
The first draft built one shared distribution module with thin Admin and Registrar wrappers.

**Decision**
One Registrar page. No Admin version and no shared module. The Admin only manages stock on the Inventory page (MP-35) and receives the restock reminder in the header bell.

**Rationale**

| # | Reason |
|---|--------|
| 1 | The Registrar hands out uniforms. The Admin does not |
| 2 | A shared module added code, routes and tests for a role that never uses it |

**Size rule (also decided):** the registrar clicks the size first, then confirms, and stock is deducted directly from the size picked. The size can differ from the enrollment's size, because what was handed out is what must leave the stock. The size handed out is saved in `size_issued`.

**Consequences:** a Registrar-only controller and page. Stock deduction still goes through `InventoryService.deductAndLog`. The restock reminder to the Admin uses the notification foundation (MP-52).

---

## D-03. MP-43 Requirements Tracking is Registrar only, with a bulk cap of 100

| Field | Value |
|-------|-------|
| **ID** | D-03 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-43 |
| **Status** | DECIDED |
| **Registrar impact** | Owns the page `/registrar/requirements` |
| **Supersedes / Superseded by** | Replaces the first draft, which was a shared Admin and Registrar module with a 10,000-row list target |

**Decision**
Registrar only at `/registrar/requirements`. Bulk update is capped at 100 rows per request, all or nothing, and a 100-row update must finish in under 500 ms server-side with no per-row queries.

**Rationale**

| # | Reason |
|---|--------|
| 1 | Registrar only, to match MP-53 and keep routes, permissions and tests simple. Widening access later is a small change |
| 2 | The Admin still edits checklists in the enrollment detail through the same service method |
| 3 | A cap protects the database from huge requests, keeps the transaction small enough to roll back cleanly, and keeps error reports readable |
| 4 | The cap is one configuration constant, so it can change without editing the code in several places. Beyond the cap the API returns 400 "Maximum 100 rows per request" |
| 5 | All or nothing, so a failed row never leaves a half-updated batch |
| 6 | The old target of 10,000 rows in 500 ms could not be tested through a 100-row cap. The new target guards against a loop with one query per row |

**Consequences:** one Registrar controller. The frontend sends a longer selection in chunks of 100.

---

## D-04. Restock reminder split into MP-59, and Inactive rows are greyed out

| Field | Value |
|-------|-------|
| **ID** | D-04 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-53, MP-59 |
| **Status** | DECIDED |
| **Registrar impact** | MP-53 ships the page and the stock deduction. The reminder button arrives with MP-59 |
| **Supersedes / Superseded by** | Changes D-02: the reminder is no longer part of MP-53 |

**Context**
MP-53 first included a "Remind admin to order more" feature. It needs the notification foundation (MP-52) and the Admin bell (MP-54), which are not built.

**Decision**
1. The reminder becomes its own ticket, **MP-59**. MP-53 does not wait for MP-52 or MP-54.
2. On the Uniform Distribution page, withdrawn and dropped trainees (and completed ones) stay in the list, **greyed out and marked Inactive**, with no action. They are hidden by default behind an Active filter and are not counted as waiting.

**Rationale**

| # | Reason |
|---|--------|
| 1 | MP-53 can be built and shipped now. The reminder would block it for no gain |
| 2 | The reminder has its own open gaps (note vs quantity, the 24-hour limit), so a separate ticket keeps them from holding up the page |
| 3 | Showing inactive trainees greyed out keeps the history visible, so staff can see why someone has no action, without mixing them into the work still to do |

**Consequences:** the out-of-stock message in MP-53 stays as at enrollment. The "Remind admin" option appears in it when MP-59 is built.

---

## D-05. Payment carries over on a program change, and the Requirements page defaults to ENROLLED

| Field | Value |
|-------|-------|
| **ID** | D-05 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-42, MP-43 |
| **Status** | DECIDED |
| **Registrar impact** | The Registrar's Requirements page opens on ENROLLED trainees. A program change does not create a new payment unless the Admin chooses to |
| **Supersedes / Superseded by** | Narrows the default status filter in MP-43 from `PENDING` and `ENROLLED` to `ENROLLED` |

**Decision**
1. **MP-42:** when the Admin changes a trainee's program, the payment carries over by default (no new OR).
2. **MP-43:** the Requirements page opens filtered to Incomplete and status `ENROLLED`. `PENDING` and other statuses can be added with the status filter.

**Rationale**

| # | Reason |
|---|--------|
| 1 | All programs have the same payment, so a program change has no fee difference to collect or refund. A new payment would be a duplicate |
| 2 | Trainees are accepted and enrolled right away, so the work to follow up is on `ENROLLED` trainees. `PENDING` would add rows that need no follow-up |

**Open:** whether the "record a new payment instead" option in MP-42 is still needed (logged as G-42-2 in `to-be-discussed.md`).

---

## D-06. Withdrawal validation is sequential: Trainer first, then Registrar, then Admin

| Field | Value |
|-------|-------|
| **ID** | D-06 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-45, MP-46, MP-47, MP-48, MP-49 |
| **Status** | DECIDED |
| **Registrar impact** | The Registrar can only validate a withdrawal request after the Trainer has validated it. The Registrar's validation sends the request to the Admin |
| **Supersedes / Superseded by** | None. Replaces the earlier parallel design (Registrar and Trainer validating at the same time), which was never built |

**Context**
The first design had the Registrar and the Trainer validate in parallel, with the request going to the Admin once both were done. That needs the second validator to check the other side and move the status on, and two validators acting in the same second could leave a request stuck (a race condition).

**Decision**
The pipeline is sequential:

`PENDING_VALIDATION` → (Trainer validates) `TRAINER_VALIDATED` → (Registrar validates) `PENDING_ADMIN_SIGNOFF` → (Admin signs off) `APPROVED`

Any validator can reject (`REJECTED`). The trainee can cancel before completion (`CANCELLED`). The Admin only ever sees requests that both the Trainer and the Registrar have validated.

**Rationale**

| # | Reason |
|---|--------|
| 1 | No race condition. Only one validator can act at a time, so no row lock or conditional update is needed |
| 2 | One straight status path with no branching, which is simpler to build, test and show to the trainee |
| 3 | The Registrar's checklist (ID surrendered, finances cleared, documents submitted) is real paperwork. If the Trainer rejects first, the Registrar does none of it for nothing |

**Options considered**

| Option | For | Against |
|--------|-----|---------|
| A. Parallel (Trainer and Registrar at the same time) | Faster. The Registrar can work while the Trainer is away | Race condition. Branching status. Wasted Registrar work if the other rejects |
| B. Trainer first, then Registrar (chosen) | Simple, no race, no wasted paperwork | Slower. A slow or absent Trainer stalls the request |

**Consequences**
- `REGISTRAR_VALIDATED` is removed from `withdrawal_status_enum`, since a Registrar validation now always leads straight to `PENDING_ADMIN_SIGNOFF`.
- MP-48 (Trainer) acts only on `PENDING_VALIDATION`. MP-47 (Registrar) acts only on `TRAINER_VALIDATED`. Any other status returns 400.
- The race-condition handling in MP-47 and MP-48 is no longer needed.

**Open action** A Trainer who is slow or unavailable stalls the pipeline. Decide later whether the Admin may step in or reassign (not part of this decision).

---

## D-07. The trainer must give a reason when rejecting a withdrawal request

| Field | Value |
|-------|-------|
| **ID** | D-07 |
| **Date** | 2026-11-04 |
| **Ticket** | MP-48 (Trainer: Validate Withdrawal Request) |
| **Status** | DECIDED |
| **Registrar impact** | None directly. The Registrar never sees a request the Trainer rejected, so the reason is for the trainee and the Admin |
| **Supersedes / Superseded by** | Narrows MP-48, which said remarks were optional for both approve and reject |

**Context**
MP-48 said the trainer's remarks are optional. A rejected trainee would then see "Rejected" with no explanation, and the request ends there (nothing goes on to the Registrar or Admin).

**Decision**
Remarks are **required when the trainer rejects** and **optional when the trainer approves**. Blank or whitespace-only text counts as no remarks. Up to 1000 characters. The reason is saved on the request (`trainer_remarks`) and on the history row, which is what the trainee sees on the progress page.

**Rationale**

| # | Reason |
|---|--------|
| 1 | A rejection ends the request. The trainee has no other way to learn why |
| 2 | The history already carries the reason to the trainee, so no new screen is needed |
| 3 | Approving needs no explanation, so it stays quick |

**Consequences**
- The API refuses a reject with missing or blank remarks (400).
- The trainer screen must make the reason field required when Reject is chosen.
- The same question will come up for the Registrar (MP-47) and Admin (MP-49) rejections. Not decided here. (The Registrar part is answered in D-08.)

---

## D-08. MP-47 Registrar withdrawal validation: manual checklist, reason on reject, released with MP-49

| Field | Value |
|-------|-------|
| **ID** | D-08 |
| **Date** | 2026-11-06 |
| **Ticket** | MP-47 (Registrar: Validate Withdrawal Request) |
| **Status** | DECIDED (answered by the owner, all eight accepted; #6 changed to "release on its own") |
| **Registrar impact** | The Registrar validates requests the trainer approved, using three manual checks. A rejection needs a reason |
| **Supersedes / Superseded by** | Answers the open point in D-07. Narrows MP-47, which said remarks were optional |

**Context**
The MP-47 ticket left eight points open. They were put to the owner on 2026-11-06 and each recommendation was accepted.

**Decision**

| # | Point | Decision |
|---|-------|----------|
| 1 | Reason when the Registrar rejects | **Required** (blank counts as none, up to 1000 characters), as for the trainer (D-07). Optional when approving |
| 2 | Finances cleared | A **manual tick**. The database has no balance, only receipts. It may be derived from payments later |
| 3 | Documents submitted | A **manual tick**. The panel shows the MP-43 progress (N / 6) **for information only**. It does not block approval |
| 4 | ID surrendered | ~~A manual tick in `surrendered_id` for the registrar.~~ **Superseded by D-09:** the ID check moves to the Admin sign-off (MP-49) |
| 5 | A Registrar rejection | **Final for that request**. The trainee may submit a new request |
| 6 | Release | **On its own** (changed by the owner the same day, replacing "together with MP-49"). Releases are per task and the pipeline is built from the bottom up: the registrar sees a request as soon as the trainer approves it. The sidebar link is visible. Until MP-49 is released, an approved request waits at `PENDING_ADMIN_SIGNOFF` and the trainee cannot cancel it (known limit, see overview section 11) |
| 7 | Who the Registrar sees | **All** requests, not scoped to a batch (the trainer is scoped to their own batches) |
| 8 | History table | **No separate decided-requests table.** The status filter is enough for now |

**Rationale**

| # | Reason |
|---|--------|
| 1 | A rejection ends the request, so the trainee must be told why (same reason as D-07) |
| 2 | Nothing in the database can prove finances are cleared. A manual tick keeps the build small and honest |
| 3 | The Registrar decides, the progress number only informs |
| 4 | The two fields mean different things (surrendered at withdrawal vs given at enrollment) |
| 5 | Keeps each request a clean record and avoids reopening finished ones |
| 6 | Releases are per task, and a request already waits at `TRAINER_VALIDATED` today with no one able to act. MP-47 lets the registrar act on it. The wait moves one step on, to the admin |

**Consequences**
- `PATCH /registrar/withdrawal-requests/:id/validate`: reject without a reason gives 400. Approve needs all three ticks (400 otherwise).
- The detail response includes the MP-43 checklist progress (N / 6) for display only.
- Only a request in `TRAINER_VALIDATED` can be validated. Anything else, including `PENDING_VALIDATION`, gives 400. An unknown id gives 404.
- The write is one transaction with a conditional update, the same pattern as the trainer step, so two Registrars acting together get one winner and one 400.
- MP-47 is released on its own. The Registrar sidebar link "Withdrawal Requests" is visible.
- Until MP-49 ships, an approved request stops at `PENDING_ADMIN_SIGNOFF` (audit finding A-12, informational).

---

## D-09. The registrar checks finances and documents only. ID surrendered moves to the Admin. The registrar sees whether the enrollment fee was paid

| Field | Value |
|-------|-------|
| **ID** | D-09 |
| **Date** | 2026-11-06 |
| **Ticket** | MP-47 (Registrar), MP-49 (Admin) |
| **Status** | DECIDED by the owner. **Built in MP-47** (two checks, fee status, tracker step), checked on a throwaway database. The admin ID tick is MP-49, not built |
| **Registrar impact** | The checklist has two items, not three. The panel also shows whether the enrollment fee is paid |
| **Supersedes / Superseded by** | Supersedes D-08 point 4 (ID surrendered as a registrar tick) and narrows point 2 (finances cleared) |

**Context**
D-08 gave the registrar three manual ticks: ID surrendered, finances cleared, documents submitted. The owner then pointed out two things. The trainee hands the ID in at the admin, and the admin is the final sign-off, so the ID belongs to the admin step. And for finances, the registrar should be able to see whether the trainee actually paid, not only tick a box.

**Decision**

| # | Point | Decision |
|---|-------|----------|
| 1 | Registrar checklist | **Two manual ticks: finances cleared and documents submitted.** Approving needs both. Rejecting saves them as they are and needs a reason (unchanged from D-08) |
| 2 | ID surrendered | **Admin only (MP-49).** The trainee gives the ID to the admin, and the admin confirms it as part of the sign-off. The existing `surrendered_id` column is kept and is now written by the admin step, not the registrar |
| 3 | Fee cleared | The registrar panel **shows whether the enrollment fee is paid**: paid or not paid, and when paid the receipt number, date and amount. It reads the official receipts of that enrollment with the reason `ENROLLMENT` |
| 4 | The tick stays manual | The "Finances cleared" tick is still the registrar's decision. The fee status is shown next to it to help, and it does not tick or block anything by itself |
| 5 | Trainee tracker | **After the registrar approves, the trainee's progress view shows the last step: "Surrender your ID to the admin".** The Admin sign-off step turns active with that instruction, so the trainee knows what to do. It reads the status the tracker already has (`PENDING_ADMIN_SIGNOFF`), so it needs no notification system. It belongs to MP-47 because MP-47 is what puts a request in that state, and MP-47 is released on its own |

**Rationale**

| # | Reason |
|---|--------|
| 1 | The admin signs off last and is the one who receives the ID, so the ID check belongs there |
| 2 | The registrar handles money and papers, so the two items match the registrar's job |
| 3 | Payments are already recorded as receipts, so "paid" can be shown without new data |
| 4 | Other fees (uniform, processing, assessment deposit, external) are separate and not part of "enrollment fee paid" |

**Assumptions to confirm with the owner** (built this way unless told otherwise)
1. "Fee paid" means at least one receipt with the reason `ENROLLMENT` exists for the enrollment. The amount is not compared with 450, because the base fee itself is still wrong in one case (500, TECH-04).
2. Admin approval (MP-49) needs the ID surrendered tick, and the admin can reject without it.
3. A request that reached the admin before this change keeps its saved `surrendered_id` value. The seeded and live request already at `PENDING_ADMIN_SIGNOFF` have it unset, so the admin ticks it.
4. **RESOLVED (owner, 2026-11-06): the ID is surrendered after the registrar accepts, so the Admin confirms it at sign-off (option A).** The order is trainer, registrar, then the trainee hands the ID to the admin, then the admin signs off. The registrar cannot record an ID that has not been handed in yet. A notification from the registrar's approval ("bring your ID to the admin", sent to the trainee, and "ready for sign-off" to the admin) is a good fit later, but it needs MP-52 (notification foundation) and MP-54 (Admin events), which are not built. Until then the trainee's progress view can show the next step in words. The notification is a pointer only: the saved `surrendered_id` tick, with who and when, stays the record.

**Consequences**
- MP-47 code to change: drop `surrendered_id` from the validate body and the approve rule (two ticks, not three), show two checkboxes in the panel, and add the fee status to the detail response and the panel. Unit tests and the seed data change with it.
- MP-49 gains the ID surrendered tick on the sign-off: the sign-off body carries `surrendered_id`, approve needs it true, and the panel shows who confirmed it.
- MP-47 also changes the shared progress view (`WithdrawalPipeline` and `buildPipeline`): the Admin step shows the ID instruction while the request is at `PENDING_ADMIN_SIGNOFF`. This touches the trainee's screens from MP-46, so those need a check too.
- D-08 point 4 no longer applies. Points 1, 3 and 5 to 8 stand.

---

## D-10. The registrar reads the trainee's payment history in a pop-up, without leaving the page

| Field | Value |
|-------|-------|
| **ID** | D-10 |
| **Date** | 2026-11-06 |
| **Ticket** | MP-47 (Registrar) |
| **Status** | DECIDED by the owner. Built and checked on a throwaway database |
| **Registrar impact** | One click in the Enrollment fee box shows every payment of the trainee, so the registrar does not have to open the Payments page to judge "finances cleared" |
| **Supersedes / Superseded by** | Extends D-09 point 3 (fee status). Nothing superseded |

**Context**
D-09 added a paid / not paid line for the enrollment fee. The owner then asked that the registrar be able to see the payments themselves in a pop-up, instead of visiting another page.

**Decision**

| # | Point | Decision |
|---|-------|----------|
| 1 | Where | A **View payment history** button in the Enrollment fee box opens a pop-up over the side panel. Closing it (button, backdrop or Escape) returns to the panel as it was. Escape closes the pop-up first, then the panel |
| 2 | What it shows | **Every** payment of that enrollment, oldest first: date, receipt number, what it was for, method and amount. Enrollment fee rows are marked "counts as paid" |
| 3 | What "paid" means | Unchanged from D-09: only an `ENROLLMENT` receipt makes the box say Paid. Other fees (uniform and ID, processing, assessment deposit, external) are listed but do not count |
| 4 | Read only | It is information. It never ticks "Finances cleared" and never blocks an approval |
| 5 | Amounts | Always shown with centavos, for example `PHP 450.00` |

**Consequences**
- The detail response gains `enrollmentFee.payments`: at most 50 receipts, each with only `orNumber`, `paymentDate`, `amount`, `method` and `reason`. No staff name, contact detail or internal id is returned.
- No new endpoint, no migration. It reads the existing `official_receipts` table.
- It reuses the registrar's existing access to payment information (the Payments module already shows registrars these receipts).

---

## D-11. MP-47 ships only the functional code: no unit tests, test data or reference notes in the commit

| Field | Value |
|-------|-------|
| **ID** | D-11 |
| **Date** | 2026-11-06 |
| **Ticket** | MP-47 |
| **Status** | DECIDED by the owner |
| **Registrar impact** | None. This is about what goes into the commit |
| **Supersedes / Superseded by** | Same choice as D-08 of MP-43 (unit tests kept out of the branch) |

**Decision**
The commit contains only the code the feature needs, and the backlog text. It does not contain the unit test files, any test data (accounts, seed data, scripts) or reference notes such as decision or ticket numbers inside code comments.

**What was done**
- The 3 unit test files (64 tests) were moved into a local git stash named "MP-47 unit tests (kept local, not committed)". They passed with the rest of the suite (166 of 166) and can be brought back with `git stash pop`.
- The sandbox database, its seed data and the end-to-end script live outside the repository and are never committed.
- Decision and ticket numbers were removed from the code comments. They stay in the backlog.

**Consequences**
- The registrar step has no unit tests in the repository (audit finding, as F-9 was for MP-43). Its behaviour was checked by 109 requests against a throwaway database instead.
- The backend suite in the repository stays at the 102 tests that existed before.

---

## Entry Template

```
## D-XX. Short title of the decision

| Field | Value |
|-------|-------|
| **ID** | D-XX |
| **Date** | YYYY-MM-DD |
| **Ticket** | MP-XX |
| **Status** | DECIDED / OPEN / SUPERSEDED |
| **Registrar impact** | What changes for the Registrar |
| **Supersedes / Superseded by** | D-XX or None |

**Context** What the situation was.
**Decision** What was decided.
**Rationale** Numbered reasons.
**Options considered** (if there were alternatives) A table of options, for and against.
**Consequences** What this means for the build.
**Open action** (only if status is OPEN) What still has to be decided.
```
