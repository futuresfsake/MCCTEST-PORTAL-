# MP-55: Notification Bell, Registrar Events (batch changes and trainees added or removed)

| Field | Value |
|-------|-------|
| **Jira** | MP-55 |
| **Type** | Task |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira's default at creation, reassign if needed) |
| **Depends on** | MP-52 (notification foundation) |
| **Role** | Registrar |
| **Opens** | `/registrar/batches` |
| **Added** | 2026-11-03 |

---

## User Story

**As** a registrar,
**I want** the header bell to tell me when another registrar creates or changes a batch, or when trainees are added or removed,
**so that** I stay in step with the others without refreshing the Batches page.

The shared bell, the notifications table, `record` and live push are built in MP-52. Do not copy the bell. Each event here is one entry in the events registry plus one `record` call.

## Events

| Event | Where it happens | Opens |
|-------|------------------|-------|
| Batch **created** | `create()` in `registrar/batches/batches.service.ts` | `/registrar/batches` |
| Batch **dates or schedule edited** | `update()` in the same service, only when a date or the schedule actually changes | `/registrar/batches` |
| Batch **status changed** | `advanceStatus()` in the same service. The batch statuses are OPEN, ONGOING, CLOSED and CANCELLED | `/registrar/batches` |
| **Trainee added** to a batch | An enrollment is created in a batch (to confirm, open question 1) | `/registrar/batches` |
| **Trainee removed** from a batch | An enrollment in the batch becomes WITHDRAWN or DROPPED (to confirm) | `/registrar/batches` |

- **Who receives it:** all registrars except the person who did it. No other role receives these.
- A change that only edits other fields (for example the trainer) does **not** notify registrars. Trainer changes belong to MP-56.

## Out of Scope

Trainer changes on a batch (MP-56). Moving a trainee between batches (MP-42). Other roles' events.

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Creating a batch notifies every other registrar. The person who created it gets nothing | NOT STARTED | |
| 2 | Editing a batch's start date, end date or schedule notifies the other registrars. Editing only other fields does not | NOT STARTED | |
| 3 | Changing a batch's status notifies the other registrars, and the message shows the new status | NOT STARTED | |
| 4 | A trainee added or removed (as defined in open question 1) notifies the other registrars | NOT STARTED | Depends on the answer to question 1 |
| 5 | Admin, trainer, encoder and trainee never receive these notifications | NOT STARTED | |
| 6 | The notification is saved in the same transaction as the change. If the change fails, no notification is created | NOT STARTED | |
| 7 | The message names the batch and the action. It contains no sensitive account fields | NOT STARTED | |
| 8 | Clicking the notification opens `/registrar/batches` | NOT STARTED | |
| 9 | The registrar bell shows these live, without a reload, with the unread badge and "Mark all as read" as in MP-52 | NOT STARTED | |
| 10 | Each event is one registry entry and one `record` call. No change to the bell component | NOT STARTED | |
| 11 | Backend and frontend type-check, build and lint with 0 problems | NOT STARTED | |

---

## Test Cases

### TC-1: Create a batch
- **Precondition:** Two registrars, A and B, and an admin.
- **Steps:** A creates a batch. B and the admin have a page open.
- **Expected:** B sees a notification naming the batch. A does not. The admin does not.

### TC-2: Edit dates
- **Steps:** A changes the batch's end date.
- **Expected:** B sees a notification.

### TC-3: Edit other fields only
- **Steps:** A changes only the description (or only the trainer).
- **Expected:** B sees nothing.

### TC-4: Status changes
- **Steps:** A moves the batch from OPEN to ONGOING, then to CLOSED.
- **Expected:** B sees two notifications, each showing the new status.

### TC-5: Trainee added
- **Steps:** A trainee is enrolled in the batch.
- **Expected:** B sees "trainee added".

### TC-6: Trainee removed
- **Steps:** An enrollment in the batch becomes WITHDRAWN.
- **Expected:** B sees "trainee removed".

### TC-7: Failed change
- **Steps:** Make the batch update fail (mock).
- **Expected:** No notification row exists.

### TC-8: Live
- **Steps:** B keeps any page open while A does TC-1.
- **Expected:** The badge on B's bell rises without a reload.

---

## Open Questions

1. **What "trainees added or removed" means.** The batches service has no add or remove method. The code has an enrollment created in a batch (added) and an enrollment becoming WITHDRAWN or DROPPED (removed). Moving a trainee between batches does not exist until MP-42. Confirm.
2. **Grouping.** If 20 trainees are enrolled in one batch on the same day, one notification or twenty?
3. The exact message wording.

## Summary: 0/11 PASS. NOT STARTED
