# MP-52: Notification Foundation (shared bell, notifications table, live push)

| Field | Value |
|-------|-------|
| **Jira** | MP-52 |
| **Type** | Task |
| **Status** | NOT STARTED |
| **Assignee** | Rhoddz Gerunda |
| **Role tickets** | MP-54 Admin, MP-55 Registrar, MP-56 Trainer, MP-57 Encoder (all start after this one) |
| **Where** | The header bell, on every page, for every role |
| **Migration** | One new table, `notifications` (to be written) |
| **Added** | 2026-11-03 |

Status key: PASS = verified. NOT TESTED = code exists but was not run. NOT STARTED = not built yet.

---

## User Story

**As** a staff member or trainee,
**I want** one notification bell in the header that shows what is new for me,
**so that** I do not have to open each page to find out something changed.

## Background

- The bell exists only for the Trainee, and only shows announcements. It is built for the trainee alone: `AnnouncementBell` has a hard-coded page for `TRAINEE` only, and `useAnnouncementNotifications` is tied to the announcements API and to a browser key `announcements:lastSeen:<user>`. It refreshes every 60 seconds.
- Events such as a staff account being deactivated or a batch being edited are not stored anywhere. There is no notifications table and no audit log.
- The roles asked for in the original ticket (Admin, Registrar, Trainer, Encoder) each have different events. Those events are separate tickets (MP-54 to MP-57). This ticket builds what they all share.

## Decisions (2026-11-03)

| Question | Decision |
|----------|----------|
| Where do the non-announcement notifications come from? | A new `notifications` table. Each event is recorded when it happens (who did it, what, when, where to go) |
| Where is read or unread remembered? | In the browser, per user, like the trainee bell (a "last seen" time). It does not follow the person to another device or browser. Accepted trade-off |
| How fast does a notification appear? | Live push, not polling |
| Is a person notified about their own actions? | No. Only about other people's actions |
| Who are the recipients? | Admin, Registrar and Encoder events go to everyone in that role except the person who did it. Trainer events go only to the trainer on that batch |

Every role also keeps announcements, as the trainee bell does today.

## Reusable Module Design

Build the bell once and configure it per role. Do not copy the announcements bell or its hook.

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| `NotificationsModule` | `src/notifications/` (root of `src`, not under a role) | Exports `NotificationsService` |
| `NotificationsService.record(tx, event)` | `src/notifications/notifications.service.ts` | Called inside the transaction of the change that causes the event. Saves one row with an audience |
| Events registry | `src/notifications/notification-events.ts` | One entry per event type: name, audience (a role, or one user), message, page it opens. Adding an event type is one entry plus one `record` call in the service that makes the change |
| One controller | `src/notifications/notifications.controller.ts` | List my notifications, and the live stream. What a user receives is decided by their own role and id from the login token, so there are no per-role controllers |

Services that cause events (staff accounts, batches, enrollments) only call `record`. They do not know about roles, the bell or live push.

### Frontend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| `NotificationBell` | `src/components/notifications/` | One bell for every role |
| `useNotifications` | `src/hooks/` | Merges sources (announcements and system events), tracks "last seen" per user, listens to the live stream |
| Role config | `src/components/notifications/` | For each role: the "View all" page and how each event type maps to a link |

Adding a role means one config entry, a backend audience rule, and no new component. The existing `AnnouncementBell` and `useAnnouncementNotifications` are replaced. **The trainee bell must keep working exactly as it does today.**

### Proposed data (to confirm)

- Table `notifications`: `id`, `type` (enum of the events), `audience_role` or `audience_user_id`, `actor_id` (who did it, so they are skipped), `message`, `link`, `entity_id`, `created_at`.
- Indexes on `(audience_role, created_at DESC)` and `(audience_user_id, created_at DESC)`.
- One row per event with an audience, not one row per recipient, because read state is in the browser. A user's unread count is the number of rows for their role or user, newer than their "last seen" time, not made by them.
- One migration, reviewed before it is applied to the shared database.

## Out of Scope

- The role events (MP-54 to MP-57).
- Payments, trainee-account-generation and returned-record notifications.
- Notifications for the Trainee beyond announcements.
- Email or SMS delivery.
- Read state that follows the user across devices.

---

## Acceptance Criteria

### Bell and behavior

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | The bell appears in the header for Admin, Registrar, Trainer and Encoder, showing announcements, and still works for the Trainee exactly as before | NOT STARTED | |
| 2 | The unread badge, "Mark all as read" and the dropdown of the latest items behave the same as the trainee bell | NOT STARTED | |
| 3 | "View all" and clicking an announcement open the announcements page for that role | NOT STARTED | The four staff roles already have an announcements page |
| 4 | A new notification appears on an open page without a reload (live push) | NOT STARTED | Technology is an open question |
| 5 | A test event proves the whole path: recorded in the table, delivered live, and shown in the right bell only | NOT STARTED | No role events are added in this ticket |

### Reuse

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 6 | One bell component and one hook serve all five roles, with no per-role copies | NOT STARTED | |
| 7 | Adding a new event type needs one registry entry and one `record` call, and no change to the bell. Adding a new role needs only a config entry and an audience rule | NOT STARTED | |

### Rules

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 8 | A notification is saved in the same transaction as its change. If the change fails, no notification is created | NOT STARTED | |
| 9 | A person is not notified about a change they made themselves | NOT STARTED | `actor_id` is skipped |
| 10 | A user never sees notifications meant for another role, or for another user | NOT STARTED | |

### Security and quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 11 | Notification responses never include `password_hash` or other sensitive account fields | NOT STARTED | |
| 12 | All endpoints are guarded. Without a token they return 401 | NOT STARTED | |
| 13 | Unread counts and the list use a fixed number of queries per request, and the list is limited or paginated | NOT STARTED | |
| 14 | Exactly one migration (the notifications table and its indexes) | NOT STARTED | Reviewed before it is applied to Supabase |
| 15 | Backend and frontend type-check, build and lint with 0 problems. Tests cover the audience rules, the "not about my own action" rule, and the trainee bell staying unchanged | NOT STARTED | |

---

## Test Cases

### TC-F1: The bell appears for every role
- **Precondition:** An account for each role (Admin, Registrar, Trainer, Encoder, Trainee) and at least one active announcement.
- **Steps:** Log in as each role and look at the header.
- **Expected:** The bell is in the header for all five. The four staff roles see announcements in the dropdown. The badge counts announcements newer than their last seen time.

### TC-F2: The trainee bell is unchanged
- **Steps:** As a trainee, compare with before: open the dropdown, press "Mark all as read", press "View all".
- **Expected:** Same badge, same latest-five dropdown, same "Mark all as read", and "View all" opens `/trainee/announcements`.

### TC-F3: The whole path works (test event)
- **Precondition:** A test event type in the registry addressed to one role.
- **Steps:** Keep a page open as a user of that role and another as a user of a different role. Trigger the test event.
- **Expected:** A row is saved. The right bell updates without a reload. The other role's bell does not change.

### TC-F4: Own actions are skipped
- **Steps:** Trigger the test event as user A, with A's role as the audience, while user B of the same role has a page open.
- **Expected:** B sees it. A does not.

### TC-F5: Another user's notification stays private
- **Steps:** Trigger a test event addressed to one user.
- **Expected:** Only that user sees it. Another user of the same role does not.

### TC-F6: Rollback
- **Steps:** Make the change that records the event fail after `record` is called (mock).
- **Expected:** No notification row exists.

### TC-F7: Access and data
- **Steps:** Call the notification endpoints without a token. Read a response.
- **Expected:** 401 without a token. No password, hash or email in any response.

### TC-F8: Read state
- **Steps:** Press "Mark all as read", then refresh the page. Open the app in a different browser as the same user.
- **Expected:** After the refresh the badge stays cleared. In the other browser everything shows as new again (accepted trade-off).

### TC-F9: Reuse check (code review)
- **Steps:** Add a dummy event type and a dummy role in a branch.
- **Expected:** The event needs one registry entry and one `record` call. The role needs one config entry and an audience rule. The bell component is not edited.

### TC-F10: Live connection drops
- **Steps:** Stop and restart the backend while a page is open.
- **Expected:** The behavior matches the agreed fallback (open question 1). The page does not break.

---

## Open Questions

1. **Live push technology.** Server-sent events or websockets? Does the hosting setup allow long-lived connections? Should the bell fall back to checking every 60 seconds if the connection drops?
2. **"View all" page.** The trainee has `/trainee/announcements`. Should the other roles also get a notifications page of their own, or only the dropdown and the announcements pages?
3. **How long to keep notifications.** For example delete after 30 or 90 days, or keep them all.
4. **Mark one as read.** Only "Mark all as read", or also one at a time?
5. **Badge cap.** For example show "99+" above 99.
6. **Grouping.** If many events of the same kind happen at once, show one notification or one each? (Raised in MP-55.)

## Related

MP-54 (Admin), MP-55 (Registrar), MP-56 (Trainer), MP-57 (Encoder). Announcements: MP-21, MP-31, MP-37, MP-39.

## Summary: 0/15 PASS. NOT STARTED
