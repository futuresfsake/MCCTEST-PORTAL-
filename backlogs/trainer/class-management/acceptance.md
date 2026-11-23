# Trainer: Class Management (Real Start Date of a Batch)

| Field | Value |
|-------|-------|
| **Jira** | MP-66 |
| **Type** | Feature (new Trainer page, new endpoints, one migration) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Route** | `/trainer/classes` (the sidebar link "Class Records" becomes "Class Management") |
| **Backend** | `/api/trainer/classes` (new) |
| **Depends on** | Batches (MP-22 Admin, Registrar batches), the enrollment overlap rule (`enrollments.service`), announcements, the Trainer Dashboard (MP-65) |
| **Related** | Notifications (MP-52 trainee, MP-56 trainer). Attendance (FUNC-006) records sessions, which this ticket must not contradict |
| **TBA (to be announced)** | Four things are not decided: whether the **Admin can override** a date the trainer confirmed, whether the start date can be **set in the past**, whether a **minimum of trainees** is needed to start, and **who closes a batch** and how far the end date may be extended. See the Open Questions |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** to confirm the real start date of my batch and mark it started,
**so that** the trainees, the Registrar and the Admin all see the date classes really begin, because in vocational training the start date is not fixed.

## Background

- The Admin and the Registrar create a batch with a **planned** `start_date` and `end_date`. The Registrar can change the dates only while the batch is `OPEN`. The trainer cannot change anything.
- In vocational training the real start moves: not enough trainees, the trainer or room is not ready, holidays. Only the trainer knows the real date.
- The dates are used in many places, so a wrong date does harm: the trainee dashboard shows the batch dates, enrollment checks that a batch has not ended and orders batches by start date, and enrollment refuses a trainee whose two active programs overlap in dates and schedule (`enrollments.service`).
- There is **one** `start_date` and **one** `end_date` on `batch`. The trainer changes these same columns, so the new date shows everywhere with nothing to keep in sync. What is new is a flag that says the trainer confirmed it, and a history of every change.
- The batch status today is changed by hand by the Admin or the Registrar (`OPEN`, `ONGOING`, `CLOSED`, `CANCELLED`). This ticket lets the trainer take a batch from `OPEN` to `ONGOING` when classes really start.

## What the Trainer Can Do

The page lists the trainer's own batches. From a batch the trainer can:

1. **Confirm or change the start date** (only while `OPEN`). A reason is required. The end date moves by the same number of days by default, and the trainer can change it. A preview shows the new dates before saving.
2. **Mark as started.** An `OPEN` batch whose start date is today or earlier becomes `ONGOING`.
3. **Change the end date** of an `ONGOING` batch (an extension or an early finish), with a reason.
4. **Tell the trainees.** A tick box, on by default, posts an announcement to the batch with the new date (the trainer can already post to their own batch).
5. **See the history** of the batch dates and status as a timeline.

## Reflection (the Main Point)

| Where | What shows |
|---|---|
| Trainee Dashboard (MP-30) | The batch start and end date, and the trainee sees the batch announcement |
| Registrar batch list, enrollment batch picker | The new dates, and the label Planned or Confirmed by trainer |
| Admin batch list (MP-22) | The new dates, the label, and the history |
| Trainer pages (this page, MP-65, Trainees) | The new dates |

- Because the dates live in one place, reflection needs no sync. What the ticket must do is make sure **no list keeps an old copy** (no caching of batch dates in the frontend, every list reads the API) and **show the Planned or Confirmed label**.
- **Planned** = set by the Admin or the Registrar, not confirmed. **Confirmed by trainer** = the trainer confirmed the start date.
- Once the trainer has confirmed the start date, the Registrar and the Admin **cannot change the dates** of that batch. They get a clear message ("The trainer confirmed the start date. Ask the trainer to change it"). Whether the Admin may override is TBA (Open Question 1).

## Rules

- **Who.** Only `TRAINER`. Only batches where the logged-in user is the batch trainer (`batch.trainer_id` = the trainer of the login). The trainer is never taken from a query, body or path value.
- **Start date.** Changeable only while the batch is `OPEN`. After `ONGOING` it is fixed. A cancelled or closed batch cannot be changed at all.
- **Not in the past.** The new start date is today or later (Asia/Manila). Whether the trainer may set a past date is TBA (Open Question 2).
- **End date.** Must be after the start date. By default it shifts by the same number of days as the start date, so the length of the training stays the same. The trainer can change it in the same save.
- **Conflict with a trainee's other enrollment.** A new date is refused (409) if it would put an enrolled trainee of this batch in conflict with that trainee's other active enrollment, using the **same rule as enrollment** (shared helper, not copied). The trainer sees how many trainees are affected and which.
- **Recorded sessions.** A new start date that is after the date of a recorded session (`training_session`) of the batch is refused (400).
- **Mark as started.** Needs status `OPEN` and a start date of today or earlier. No minimum of trainees (Open Question 3), but the page warns when the batch has none enrolled.
- **Change end date (ONGOING).** The new end date must be today or later and after the start date. How far it may be extended is TBA (Open Question 4).
- **Reason.** Required, 5 to 500 characters, for every change.
- **Stale save.** The request carries the dates and status the trainer saw. If the batch changed in the meantime the API returns 409 and changes nothing. Two trainers cannot both win, and neither can a trainer and a Registrar.
- **All or nothing.** The batch change, the history row and the optional announcement are saved in one transaction.
- **History.** Append-only. One row per change with who, when, the old and new dates and status, the type and the reason. Never edited or deleted by the application.

## Schema Proposal (one migration)

- `batch`: add `start_date_confirmed_by` (uuid, FK to users, nullable) and `start_date_confirmed_at` (timestamptz, nullable). Both set means "Confirmed by trainer". Existing batches stay null, so they show Planned.
- New enum `batch_schedule_change_enum`: `START_DATE_SET`, `START_DATE_CHANGED`, `END_DATE_CHANGED`, `STARTED`, `DATES_EDITED_BY_STAFF` (a Registrar or Admin edit of the planned dates, so the history is complete).
- New table `batch_schedule_history`: `id`, `batch_id` (FK, cascade), `changed_by` (FK to users), `change_type`, `old_start_date`, `new_start_date`, `old_end_date`, `new_end_date`, `old_status`, `new_status`, `reason`, `changed_at`. Index on (`batch_id`, `changed_at` desc).
- No change to the existing `start_date`, `end_date` or `batch_status` columns. The Admin and Registrar batch endpoints use the same shared date rules and also write `DATES_EDITED_BY_STAFF` rows.
- Remember the known migration issues: the `0_init` byte-order mark (TECH-02) and the drift (TECH-03). Test the new migration on a fresh database.

## Endpoints (all `TRAINER` only, `JwtAuthGuard` and `RolesGuard`)

| Method and path | What |
|---|---|
| `GET /api/trainer/classes` | My batches (not cancelled): status, start and end date, confirmed flag, enrolled, capacity, schedule. Filter by status. Paged |
| `GET /api/trainer/classes/:batchId` | One batch with the history timeline and the count of enrolled trainees |
| `POST /api/trainer/classes/:batchId/start-date` | Confirm or change the start date (and optionally the end date), with a reason and the dates the trainer saw. Optional `notify_trainees` |
| `POST /api/trainer/classes/:batchId/start` | Mark as started (`OPEN` to `ONGOING`) |
| `POST /api/trainer/classes/:batchId/end-date` | Change the end date of an `ONGOING` batch, with a reason |
| `GET /api/trainer/classes/:batchId/date-check` | Preview: the trainees that would be in conflict with a proposed start and end date. No changes |

## Open Questions (TBA unless answered)

| # | Question | Answer or assumption |
|---|---|---|
| 1 | After the trainer confirmed the start date, can the Admin or the Registrar still change the dates? | **Assumed:** no, they get 409 and are told to ask the trainer. **TBA:** whether the Admin may override |
| 2 | Can the trainer set a start date in the past (for a class that already began)? | **TBA.** Assumed: not earlier than today |
| 3 | Is a minimum number of enrolled trainees needed before a batch can start? | **TBA.** Assumed: none, the page only warns |
| 4 | Who closes a batch (`ONGOING` to `CLOSED`), and how far can the end date be extended? | **TBA.** Out of this ticket. Closing stays with the Admin and the Registrar |
| 5 | What is the page called, and what happens to My Batches (`/trainer/batches`)? | **Assumed:** Class Management at `/trainer/classes`. My Batches stays a separate, later page |
| 6 | Is the announcement to the trainees on by default? | **Assumed:** yes, and the trainer can untick it |
| 7 | Does the end date move with the start date? | **Assumed:** yes by the same number of days, and the trainer can edit it |

## Scope

- **Backend:** a trainer class module (controller, service, DTOs) under `/api/trainer/classes`; a shared batch dates helper used by the trainer, Registrar and Admin batch endpoints (the rules and the history write live in one place); the enrollment overlap rule exposed as a shared helper; one migration.
- **Frontend:** the Class Management page (list, filter by status in the URL, side panel with the form, preview, history timeline), the sidebar label, and the Planned or Confirmed label in the Admin, Registrar and Trainee views.
- **Tests:** unit tests for the service (every unhappy path), the DTOs, the controller (role, guards, the logged-in user passed on), the shared helper, and the Registrar and Admin endpoints that now refuse a confirmed batch.

## Out of Scope

Creating batches (Admin, Registrar), attendance and sessions (FUNC-006), notifications (MP-52, MP-56), closing a batch, the My Batches and Graduating List pages, and moving trainees between batches.

---

## Acceptance Criteria

### Access and security

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CM-1 | Only `TRAINER` can open `/trainer/classes`. Other roles go to `/403` | NOT STARTED | `ProtectedRoute` |
| CM-2 | Every endpoint needs a login (401) and the `TRAINER` role (403 for Admin, Registrar, Encoder, Trainee) | NOT STARTED | Guards |
| CM-3 | A trainer sees and changes only batches where they are the batch trainer. Another trainer's batch returns 404 on read and on every change | NOT STARTED | Same ownership rule as MP-48 and MP-50 |
| CM-4 | The trainer comes from the login. No query, body or path value picks a trainer | NOT STARTED | `@CurrentUser()` |
| CM-5 | Responses have no password hash, email, contact number, address or birth date. Trainees in a conflict list appear by name and system ID only | NOT STARTED | Typed response |
| CM-6 | Input is validated: bad ids, dates that are not dates, a reason too short or too long, and extra fields are rejected or dropped | NOT STARTED | DTOs, `whitelist` |

### List and page

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CM-7 | The page lists my batches (not cancelled) with program, batch name, status, start and end date, the Planned or Confirmed by trainer label, enrolled out of capacity, and class days and time | NOT STARTED | |
| CM-8 | The status filter and the page are kept in the URL and survive a refresh | NOT STARTED | |
| CM-9 | Empty, loading and error states exist. A trainer with no batch sees a friendly empty state and the API returns 200 | NOT STARTED | |
| CM-10 | The sidebar link reads "Class Management" and opens `/trainer/classes` | NOT STARTED | Open question 5 |
| CM-11 | The side panel shows the history timeline (who, when, old and new dates, reason) newest first | NOT STARTED | |

### Confirm or change the start date

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CM-12 | The trainer can confirm or change the start date of an `OPEN` batch with a reason. The batch then shows Confirmed by trainer, with who and when | NOT STARTED | |
| CM-13 | By default the end date moves by the same number of days. The trainer can edit it in the same save. The preview shows both new dates before saving | NOT STARTED | Open question 7 |
| CM-14 | The new end date must be after the new start date. Otherwise 400 | NOT STARTED | |
| CM-15 | A start date before today (Asia/Manila) returns 400 | NOT STARTED | Open question 2 (TBA) |
| CM-16 | A reason is required (5 to 500 characters) for every change. A missing reason returns 400 | NOT STARTED | |
| CM-17 | A batch that is `ONGOING`, `CLOSED` or `CANCELLED` cannot have its start date changed (409) | NOT STARTED | |
| CM-18 | A new start date after the date of a recorded session of the batch returns 400 and names the session date | NOT STARTED | Empty until FUNC-006 |
| CM-19 | If the new dates would put an enrolled trainee in conflict with another active enrollment of that trainee, the change is refused (409) and the response says how many trainees and which. The rule is the shared enrollment rule, not a copy | NOT STARTED | `enrollments.service` overlap rule |
| CM-20 | `GET .../date-check` returns the same conflict list without changing anything, and the page shows it in the preview | NOT STARTED | |
| CM-21 | With the tick box on, an announcement for the batch scope is posted with the new dates, in the same transaction. With it off, none is posted | NOT STARTED | Open question 6 |

### Mark as started and change the end date

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CM-22 | Mark as started moves an `OPEN` batch to `ONGOING` and writes a `STARTED` history row. The batch must have a start date of today or earlier, otherwise 400 | NOT STARTED | |
| CM-23 | Mark as started on a batch that is not `OPEN` returns 409 and changes nothing | NOT STARTED | |
| CM-24 | A batch with no enrolled trainee shows a warning before it is started. It can still be started | NOT STARTED | Open question 3 (TBA) |
| CM-25 | The trainer can change the end date of an `ONGOING` batch with a reason. It must be today or later and after the start date | NOT STARTED | Open question 4 (TBA) |
| CM-26 | The same trainee-conflict rule applies to an end date extension (CM-19) | NOT STARTED | |

### Reflection

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CM-27 | After a change, the Admin batch list, the Registrar batch list and enrollment batch picker, the Trainee Dashboard and the Trainer Dashboard show the new dates on the next load, with no old copy kept in the frontend | NOT STARTED | Core of the ticket |
| CM-28 | The Admin and Registrar batch lists show Planned or Confirmed by trainer, and the Admin sees the history | NOT STARTED | |
| CM-29 | After the trainer confirmed the start date, the Registrar and the Admin editing the dates of that batch get 409 with the message to ask the trainer. Other fields (batch name, capacity, trainer) still follow the existing rules | NOT STARTED | Open question 1 |
| CM-30 | A Registrar or Admin edit of the dates of an unconfirmed batch still works and writes a `DATES_EDITED_BY_STAFF` history row | NOT STARTED | Keeps the history complete |
| CM-31 | The trainee in the batch sees the batch announcement posted by the trainer | NOT STARTED | Uses the existing batch scope |

### Integrity, concurrency and performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CM-32 | A stale save (the batch changed since the trainer loaded it) returns 409 and changes nothing | NOT STARTED | Compare-and-set on the dates and status |
| CM-33 | Two changes at the same moment give one winner, also a trainer and a Registrar at once | NOT STARTED | Conditional update or row lock |
| CM-34 | The batch change, the history row and the announcement are saved together or not at all. A failure in the announcement leaves the batch unchanged | NOT STARTED | One transaction |
| CM-35 | History is append-only. The application has no update or delete for it | NOT STARTED | By convention, noted in the audit |
| CM-36 | The list runs a fixed number of queries, whatever the number of batches | NOT STARTED | Statement logging |
| CM-37 | The migration applies on a fresh database and `prisma migrate diff` shows no drift for the new objects. Existing batches keep their dates and show Planned | NOT STARTED | TECH-02 and TECH-03 known |
| CM-38 | Constants (reason length, status names) are in one place on each side, and the date rules are shared by the trainer, Registrar and Admin endpoints | NOT STARTED | Config duplication check |

---

## Test Cases

### TC-01: Access
- **AC:** CM-1, CM-2, CM-4
- **Priority:** Critical
- **Steps:** Open the page as Admin, Registrar, Encoder and Trainee. Call each endpoint with those tokens and with none. Send `?trainer_id=<other>`.
- **Expected:** Page goes to `/403`. API returns 403, and 401 with no token. The query value is ignored.

### TC-02: Ownership
- **AC:** CM-3, CM-5
- **Priority:** Critical
- **Precondition:** Two trainers with a batch each.
- **Steps:** As trainer A, open the list and try to read and change B's batch by id.
- **Expected:** Only A's batch is listed. B's batch returns 404 for every call. No personal data fields in the responses.

### TC-03: Confirm the start date
- **AC:** CM-12 to CM-14, CM-16
- **Priority:** Critical
- **Precondition:** An `OPEN` batch planned to start in 3 days and end in 90 days, with 5 trainees enrolled.
- **Steps:** Open the batch, set the start date 10 days later with a reason. Check the preview, then save. Try again with no reason and with an end date before the start.
- **Expected:** The end date moves 10 days too in the preview. Saved: the batch shows Confirmed by trainer with who and when, and a `START_DATE_SET` row exists. No reason or a bad end date returns 400 and changes nothing.

### TC-04: Rules on dates and status
- **AC:** CM-15, CM-17, CM-18
- **Priority:** High
- **Steps:** Try yesterday as the start date. Try to change the start date of an `ONGOING`, a `CLOSED` and a `CANCELLED` batch. Try a start date after a recorded session date.
- **Expected:** 400 for the past date and for the session date (the session date is named), 409 for the three statuses. Nothing changes.

### TC-05: Trainee conflict
- **AC:** CM-19, CM-20, CM-26
- **Priority:** High
- **Precondition:** One trainee of the batch also has another active enrollment whose dates and schedule would overlap the new dates.
- **Steps:** Run the date check, then try to save. Then choose dates that do not overlap.
- **Expected:** The check lists the trainee by name and system ID. Saving returns 409 with the count. The non-overlapping dates save.

### TC-06: Announcement to the trainees
- **AC:** CM-21, CM-31, CM-34
- **Priority:** High
- **Steps:** Change the start date with the box ticked, then with it unticked. Force the announcement to fail once.
- **Expected:** One batch announcement with the new date when ticked, none when unticked. When the announcement fails the batch date is not changed. A trainee of the batch sees the announcement.

### TC-07: Mark as started
- **AC:** CM-22 to CM-24
- **Priority:** Critical
- **Steps:** Try to start a batch whose start date is in the future. Move the date to today and start it. Start it again. Start a batch with no trainees.
- **Expected:** Future date returns 400. Today works, status is `ONGOING`, and a `STARTED` row exists. The second start returns 409. The empty batch shows a warning and can still start.

### TC-08: Extend the end date
- **AC:** CM-25, CM-26
- **Priority:** Medium
- **Steps:** On an `ONGOING` batch, extend the end date by 14 days with a reason. Try an end date before today.
- **Expected:** Saved with an `END_DATE_CHANGED` row. The past date returns 400.

### TC-09: Reflection in every role
- **AC:** CM-27, CM-28, CM-31
- **Priority:** Critical
- **Precondition:** A trainee enrolled in the batch.
- **Steps:** Confirm a new start date. Then open, with no manual cache clearing: the Admin batch list and history, the Registrar batch list and enrollment batch picker, the Trainee Dashboard, the Trainer Dashboard.
- **Expected:** Every place shows the new dates and the Confirmed by trainer label. The trainee sees the announcement.

### TC-10: Registrar and Admin after confirmation
- **AC:** CM-29, CM-30
- **Priority:** High
- **Steps:** As Registrar, change the dates of a batch the trainer confirmed, and of an unconfirmed one. Repeat as Admin. Change the capacity of the confirmed batch.
- **Expected:** The confirmed batch returns 409 with the message to ask the trainer. The unconfirmed one saves and a `DATES_EDITED_BY_STAFF` row is written. The capacity change follows the old rules.

### TC-11: Stale save and two at once
- **AC:** CM-32, CM-33
- **Priority:** Critical
- **Steps:** Open the batch in two browsers. Save a date in one, then save in the other. Then fire a trainer change and a Registrar change at the same moment.
- **Expected:** The second save returns 409 and changes nothing. In the race exactly one wins and exactly one history row is written.

### TC-12: History is complete
- **AC:** CM-11, CM-35
- **Priority:** Medium
- **Steps:** Make a start date change, a start, and an end date change, plus a Registrar edit on another batch.
- **Expected:** The timeline lists every change newest first with who, when, old and new values and the reason. No update or delete route exists for history.

### TC-13: Empty, loading, error and URL state
- **AC:** CM-8, CM-9, CM-10
- **Priority:** Medium
- **Steps:** Open as a trainer with no batch. Throttle the network, then stop the API. Set a status filter and refresh.
- **Expected:** Friendly empty state, loading state, error state with Retry. The filter and page survive the refresh. The sidebar reads "Class Management".

### TC-14: Migration and existing batches
- **AC:** CM-37
- **Priority:** High
- **Steps:** Apply all migrations to an empty database and run `prisma migrate diff`. Check existing batches.
- **Expected:** No drift for the new objects. Existing batches keep their dates and show Planned.

### TC-15: Query count
- **AC:** CM-36
- **Priority:** Medium
- **Steps:** Statement logging on. Load the list for a trainer with 1 batch and for one with 20 batches.
- **Expected:** The same number of queries. Timing is local, not Supabase.

---

## Summary: 0 PASS, 38 NOT STARTED (38 criteria), 15 test cases
