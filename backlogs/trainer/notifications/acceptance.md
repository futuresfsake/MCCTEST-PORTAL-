# MP-56: Notification Bell, Trainer Events (batch assigned, removed, schedule changed, closed or cancelled)

| Field | Value |
|-------|-------|
| **Jira** | MP-56 |
| **Type** | Task |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira's default at creation, reassign if needed) |
| **Depends on** | MP-52 (notification foundation) |
| **Role** | Trainer |
| **Opens** | `/trainer/batches` |
| **Added** | 2026-11-03 |

---

## User Story

**As** a trainer,
**I want** the header bell to tell me when I am assigned to or removed from a batch, and when a batch I teach changes dates or schedule, or is closed or cancelled,
**so that** I do not find out about changes to my classes by chance.

The shared bell, the notifications table, `record` and live push are built in MP-52. Do not copy the bell. Each event here is one entry in the events registry plus one `record` call.

## Events

| Event | Where it happens | Opens |
|-------|------------------|-------|
| **Assigned to** a batch | `create()` with a trainer, or `update()` when the batch's trainer changes **to** this trainer | `/trainer/batches` |
| **Removed from** a batch | `update()` when the batch's trainer changes **from** this trainer to someone else | `/trainer/batches` |
| Batch **dates or schedule changed** | `update()` in `registrar/batches/batches.service.ts`, only when a date or the schedule actually changes | `/trainer/batches` |
| Batch **closed or cancelled** | `advanceStatus()` in the same service, when the new status is CLOSED or CANCELLED | `/trainer/batches` |

- **Who receives it:** only the trainer on that batch. A batch has exactly one trainer (`trainer_id`), and the notification goes to that trainer's **user account**, not to the trainer row. No other trainer or role receives it.
- **A trainer change from A to B in one save:** A gets "removed" and B gets "assigned". Neither gets a "dates changed" notification from the same save.

## Out of Scope

Trainee changes in the batch. Moving a trainee between batches (MP-42). Other roles' events.

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Creating a batch with a trainer notifies that trainer ("assigned") | NOT STARTED | |
| 2 | Changing a batch's trainer from A to B notifies A (removed) and B (assigned), and no other trainer | NOT STARTED | |
| 3 | Changing a batch's start date, end date or schedule notifies only the batch's current trainer | NOT STARTED | |
| 4 | Advancing a batch to CLOSED or CANCELLED notifies only its trainer. Moving it from OPEN to ONGOING does not | NOT STARTED | |
| 5 | A trainer never sees notifications about a batch they do not teach. Admin, registrar, encoder and trainee never receive these | NOT STARTED | |
| 6 | The notification is saved in the same transaction as the change. If the change fails, no notification is created | NOT STARTED | |
| 7 | The message names the batch and the action. It contains no sensitive account fields | NOT STARTED | |
| 8 | Clicking the notification opens `/trainer/batches` | NOT STARTED | |
| 9 | The trainer bell shows these live, without a reload, with the unread badge and "Mark all as read" as in MP-52 | NOT STARTED | |
| 10 | Each event is one registry entry and one `record` call. No change to the bell component | NOT STARTED | |
| 11 | Backend and frontend type-check, build and lint with 0 problems | NOT STARTED | |

---

## Test Cases

### TC-1: Assigned on creation
- **Precondition:** Trainers A, B and C, and a registrar.
- **Steps:** The registrar creates a batch with Trainer A.
- **Expected:** A sees "assigned". B and C see nothing.

### TC-2: Trainer changed
- **Steps:** The registrar changes the batch's trainer from A to B.
- **Expected:** A sees "removed". B sees "assigned". C sees nothing.

### TC-3: Dates changed
- **Steps:** The registrar changes the dates.
- **Expected:** Only the batch's current trainer sees it.

### TC-4: Trainer and dates changed together
- **Steps:** The registrar changes the trainer and the dates in one save.
- **Expected:** The old trainer gets "removed", the new one gets "assigned", and nobody gets "dates changed".

### TC-5: Status changes
- **Steps:** The batch goes from OPEN to ONGOING, then to CLOSED.
- **Expected:** Nobody is notified for OPEN to ONGOING. The trainer is notified for CLOSED.

### TC-6: Cancelled
- **Steps:** A batch is cancelled.
- **Expected:** Its trainer is notified.

### TC-7: Failed change
- **Steps:** Make the batch update fail (mock).
- **Expected:** No notification row exists.

### TC-8: Live
- **Steps:** The trainer keeps a page open while the registrar does TC-1.
- **Expected:** The badge on the trainer's bell rises without a reload.

---

## Open Questions

1. Should the trainer also be told when trainees are added to or removed from their batch? (The original scope excluded it.)
2. The exact message wording.

## Summary: 0/11 PASS. NOT STARTED
