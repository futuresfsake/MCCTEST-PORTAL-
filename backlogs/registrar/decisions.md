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
