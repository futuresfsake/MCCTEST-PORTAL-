# MP-54: Notification Bell, Admin Events (staff account status and password reset)

| Field | Value |
|-------|-------|
| **Jira** | MP-54 |
| **Type** | Task |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira's default at creation, reassign if needed) |
| **Depends on** | MP-52 (notification foundation) |
| **Role** | Admin |
| **Opens** | `/admin/staff-accounts` |
| **Added** | 2026-11-03 |

---

## User Story

**As** an admin,
**I want** the header bell to tell me when a staff account is deactivated, reactivated, or has a password reset sent by another admin,
**so that** I know about account changes without checking the Staff Accounts page.

The shared bell, the notifications table, `record` and live push are built in MP-52. Do not copy the bell. Each event here is one entry in the events registry plus one `record` call.

## Events

| Event | Where it happens | Opens |
|-------|------------------|-------|
| Staff account **deactivated** | `setStatus(id, false)` in `staff-accounts.service.ts` | `/admin/staff-accounts` |
| Staff account **reactivated** | `setStatus(id, true)` in `staff-accounts.service.ts` | `/admin/staff-accounts` |
| Staff **password reset sent** | `triggerPasswordReset(id)` in `staff-accounts.service.ts` | `/admin/staff-accounts` |

- **Who receives it:** all admins except the admin who did it. No other role receives these.
- **Not included:** account created, role or details changed.

## Out of Scope

Account created, role or details changed. Email or SMS delivery. Other roles' events (MP-55, MP-56, MP-57).

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Deactivating a staff account notifies every other admin. The admin who did it gets nothing | NOT STARTED | |
| 2 | Reactivating a staff account notifies every other admin | NOT STARTED | |
| 3 | Sending a password reset notifies every other admin | NOT STARTED | |
| 4 | Registrar, trainer, encoder and trainee never receive these notifications | NOT STARTED | |
| 5 | The notification is saved in the same transaction as the change. If the change fails (for example the account is not found), no notification is created | NOT STARTED | |
| 6 | The message names the staff member affected, the action, and who did it. It never contains an email address, password or hash | NOT STARTED | |
| 7 | Clicking the notification opens `/admin/staff-accounts` | NOT STARTED | |
| 8 | The admin bell shows these live, without a reload, with the unread badge and "Mark all as read" as in MP-52 | NOT STARTED | |
| 9 | Each event is one registry entry and one `record` call. No change to the bell component | NOT STARTED | |
| 10 | Backend and frontend type-check, build and lint with 0 problems | NOT STARTED | |

---

## Test Cases

### TC-1: Deactivate a staff account
- **Precondition:** Two admins, A and B, a registrar, and an active staff account.
- **Steps:** A deactivates the staff account. B and the registrar have a page open.
- **Expected:** B sees one notification naming the staff member and A. A does not. The registrar does not.

### TC-2: Reactivate
- **Steps:** A reactivates the same account.
- **Expected:** B sees a second notification.

### TC-3: Password reset
- **Steps:** A sends a password reset to a staff member.
- **Expected:** B sees a notification.

### TC-4: Failed change
- **Steps:** Make the service method fail after it has validated (mock).
- **Expected:** No notification row exists.

### TC-5: Live
- **Steps:** B keeps `/admin/dashboard` open while A does TC-1.
- **Expected:** The badge on B's bell rises without a reload.

### TC-6: Click
- **Steps:** B clicks the notification.
- **Expected:** `/admin/staff-accounts` opens and the dropdown closes.

### TC-7: Data
- **Steps:** Read the notification response.
- **Expected:** No email, password or hash.

---

## Open Questions

1. The exact message wording.
2. Should a reset sent to an inactive account still notify?

## Summary: 0/10 PASS. NOT STARTED
