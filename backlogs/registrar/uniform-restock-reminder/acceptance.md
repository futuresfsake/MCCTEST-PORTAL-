# Uniform Restock Reminder: Registrar Reminds the Admin to Order More

| Field | Value |
|-------|-------|
| **Jira** | MP-59 |
| **Type** | Feature (Registrar sends, Admin receives) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj |
| **Depends on** | MP-52 (notification foundation), MP-54 (Admin bell), MP-53 (Uniform Distribution page), MP-35 (inventory) |
| **Split from** | MP-53 on 2026-11-04 |
| **Interface** | Registrar: button on `/registrar/uniform-distribution`. Admin: header bell, opens `/admin/inventory` |
| **Added** | 2026-11-04 |

---

## User Story

**As** a registrar,
**I want** to send the admin a reminder to order more uniforms when stock runs low,
**so that** the admin restocks before trainees are left waiting for their uniform.

## Background

- Split out of MP-53. MP-53 (the Uniform Distribution page) ships on its own. The reminder cannot be built until the notification foundation (MP-52) and the Admin bell (MP-54) exist, so it is its own ticket.
- The reminder is a bell notification to the Admin. No email or SMS.
- The Admin restocks on the existing Inventory page (MP-35). This ticket does not place orders.

## Open Gaps (to answer before building)

| # | Gap | Current assumption |
|---|-----|--------------------|
| 1 | Is a note enough, or should the registrar also say how many to order (a quantity field)? | Note only, optional. A quantity field is not in the criteria yet |
| 2 | Is one reminder per program and size per 24 hours the right limit? | Yes for now. 24 hours is the assumed window, not confirmed |

## Scope

- **Where.** A "Remind admin to order more" button on the Uniform Distribution page. The out-of-stock error in the "Mark as given" dialog also offers it, with the program and size already filled in.
- **What the registrar sends.** Program, size and an optional note (for example "10 trainees still waiting"). The page shows the current quantity next to the choice.
- **What happens.** One notification for every admin through the MP-52 foundation (`NotificationsService.record`), using a new event type such as `UNIFORM_RESTOCK_REQUESTED` added to the events registry. The message names the program, size, quantity left, the registrar and the note. It opens `/admin/inventory`.
- **Admin side.** The notification shows in the header bell (MP-54). No new Admin page.
- **Registrar side.** The registrar who sent it is not notified.
- **Limits.** The note has a maximum length. A second reminder for the same program and size inside the limit window is refused (gap 2). The reminder changes no stock.

## Design

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Endpoint | `POST /api/registrar/uniform-distribution/restock-requests` | Validates program and size, checks the limit window, records the notification |
| Service | In the MP-53 Registrar module (`src/users/registrar/uniform-distribution/`) | `requestRestock`. Calls `NotificationsService.record` |
| DTO | `.../dto/` | `programId`, `size`, `note` (optional, max length) |
| Events registry | `src/notifications/notification-events.ts` (MP-52) | New entry `UNIFORM_RESTOCK_REQUESTED`: audience all admins, link `/admin/inventory` |
| Frontend | MP-53 page | Button, form dialog, and the link from the out-of-stock error |

## Out of Scope

Email or SMS, placing the order, tracking a purchase, an Admin page for requests.

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | The Uniform Distribution page has a "Remind admin to order more" button. The out-of-stock error also offers it with the program and size filled in | NOT STARTED | |
| 2 | Sending a reminder creates one notification that every admin sees in the header bell. The registrar who sent it gets nothing | NOT STARTED | |
| 3 | The message names the program, size, quantity left, the registrar and the note. It opens `/admin/inventory` | NOT STARTED | |
| 4 | The notification appears live on an open Admin page, with the unread badge, without a reload | NOT STARTED | MP-52 live push |
| 5 | A second reminder for the same program and size inside the limit window is refused with a clear message, and no second notification is created | NOT STARTED | Window is gap 2 |
| 6 | The note is optional and has a maximum length. An unknown program or invalid size returns 400 | NOT STARTED | |
| 7 | The reminder is one registry entry plus one `record` call. It changes no stock and no change is made to the bell component | NOT STARTED | MP-52 criterion 7 |
| 8 | Only the Registrar can send a reminder. Other roles get 403, and no token gets 401 | NOT STARTED | |
| 9 | Backend and frontend lint and build pass. Tests cover success, the limit window and role access | NOT STARTED | |

---

## Test Cases

### TC-01: Remind the admin
- **Precondition:** Two admins, A and B, each with a page open, and a registrar on the Uniform Distribution page.
- **Steps:** The registrar sends a reminder for Program A size M with the note "10 trainees waiting".
- **Expected:** A and B both see one notification naming Program A, size M, the quantity left, the registrar and the note, without a reload. Clicking it opens `/admin/inventory`. The registrar gets no notification. Stock is unchanged.

### TC-02: Reminder limit
- **Steps:** Send the same reminder again inside the limit window.
- **Expected:** Refused with a clear message. No second notification. A reminder for a different size is accepted.

### TC-03: From the out-of-stock error
- **Precondition:** Program A size M has 0 stock.
- **Steps:** Try to mark a uniform as given, then choose "Remind admin to order more" in the error.
- **Expected:** The form opens with Program A and size M filled in. Sending it behaves as TC-01.

### TC-04: Role access
- **Steps:** Call the endpoint as Admin, Trainer, Trainee and Encoder, and without a token.
- **Expected:** 403 for the four roles, 401 without a token.

### TC-05: Validation
- **Steps:** Send an unknown program, an invalid size, and a note over the maximum length.
- **Expected:** 400 for each. No notification.

---

## Summary: 0/9 PASS, NOT STARTED
