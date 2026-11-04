# MP-57: Notification Bell, Encoder Events (enrollment completed, dropped or withdrawn)

| Field | Value |
|-------|-------|
| **Jira** | MP-57 |
| **Type** | Task |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira's default at creation, reassign if needed) |
| **Depends on** | MP-52 (notification foundation) |
| **Role** | Encoder |
| **Opens** | `/encoder/records` (to confirm) |
| **Added** | 2026-11-03 |

---

## User Story

**As** an encoder,
**I want** the header bell to tell me when an enrollment ends (completed, dropped or withdrawn),
**so that** I can update clearance, certificates and records without checking each enrollment.

The shared bell, the notifications table, `record` and live push are built in MP-52. Do not copy the bell. Each event here is one entry in the events registry plus one `record` call.

## Background

The original scope said "new enrollments to encode", but no such status exists. Enrollment statuses are PENDING, ENROLLED, WITHDRAWN, COMPLETED and DROPPED. It was agreed to notify the Encoder when an enrollment ends (COMPLETED, DROPPED or WITHDRAWN).

## Events

| Event | Where it happens | Opens |
|-------|------------------|-------|
| Enrollment becomes **COMPLETED** | Wherever an enrollment's status is changed (Admin Enrollments, MP-33) | `/encoder/records` (to confirm) |
| Enrollment becomes **DROPPED** | Same | `/encoder/records` (to confirm) |
| Enrollment becomes **WITHDRAWN** | Same (to confirm WITHDRAWN is included) | `/encoder/records` (to confirm) |

- **Who receives it:** all encoders except the person who did it. No other role receives these.
- A status change to PENDING or ENROLLED does **not** notify.
- The event is recorded in **one place**, the single code path that changes an enrollment's status, so any future status change (for example the withdrawal validation in MP-47) is covered without extra work.

## Out of Scope

New enrollments. Payments. Returned-record notifications. Other roles' events.

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | An enrollment becoming COMPLETED notifies every encoder | NOT STARTED | |
| 2 | An enrollment becoming DROPPED notifies every encoder | NOT STARTED | |
| 3 | An enrollment becoming WITHDRAWN notifies every encoder | NOT STARTED | Confirm WITHDRAWN is included |
| 4 | Changing an enrollment to PENDING or ENROLLED notifies nobody | NOT STARTED | |
| 5 | Admin, registrar, trainer and trainee never receive these notifications | NOT STARTED | |
| 6 | The notification is saved in the same transaction as the status change. If the change fails, no notification is created | NOT STARTED | |
| 7 | The message names the trainee, the program and the new status. It contains no sensitive account fields | NOT STARTED | |
| 8 | Clicking the notification opens the agreed encoder page | NOT STARTED | Page to be confirmed |
| 9 | The encoder bell shows these live, without a reload, with the unread badge and "Mark all as read" as in MP-52 | NOT STARTED | |
| 10 | The event is recorded in one place for every status change. No change to the bell component | NOT STARTED | |
| 11 | Backend and frontend type-check, build and lint with 0 problems | NOT STARTED | |

---

## Test Cases

### TC-1: Completed
- **Precondition:** An enrollment, an encoder and a registrar.
- **Steps:** An admin marks the enrollment COMPLETED.
- **Expected:** The encoder sees a notification naming the trainee, the program and the status. The registrar does not.

### TC-2: Dropped
- **Steps:** An enrollment becomes DROPPED.
- **Expected:** The encoder sees a notification.

### TC-3: Withdrawn
- **Steps:** An enrollment becomes WITHDRAWN.
- **Expected:** The encoder sees a notification.

### TC-4: Not an ending status
- **Steps:** An enrollment goes from PENDING to ENROLLED.
- **Expected:** Nobody is notified.

### TC-5: Failed change
- **Steps:** Make the status change fail (mock).
- **Expected:** No notification row exists.

### TC-6: Live
- **Steps:** The encoder keeps a page open while the admin does TC-1.
- **Expected:** The badge on the encoder's bell rises without a reload.

### TC-7: Data
- **Steps:** Read the notification response.
- **Expected:** The trainee's name and program, and no email or hash.

---

## Open Questions

1. Confirm WITHDRAWN is included.
2. Which page should the notification open? `/encoder/records` is a guess.
3. Should the Encoder only be told about enrollments that need a clearance or a certificate?
4. The exact message wording.

## Summary: 0/11 PASS. NOT STARTED
