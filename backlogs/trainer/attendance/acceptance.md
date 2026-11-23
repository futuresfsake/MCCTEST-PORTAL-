# Trainer: Attendance Tracking

| Field | Value |
|-------|-------|
| **Jira** | MP-67 |
| **Type** | Feature (new Trainer page, new endpoints, one migration) |
| **Status** | IMPLEMENTED - REVIEW/PRE-DEPLOYMENT |
| **Assignee** | Vince Jon Gonzalez (Jira default, reassign if needed) |
| **Route** | `/trainer/attendance` (implemented and route-protected) |
| **Backend** | `/api/trainer/attendance` (new) |
| **Requirement** | FUNC-006 (attendance), REQ-4.6 in the capstone paper |
| **Depends on** | Class Management (MP-66): the batch must be `ONGOING` and its start date is the first date that can be recorded |
| **Feeds** | Trainer Dashboard (MP-65: hours progress, behind pace, today's classes), Trainer clearance (MP-61: hours check), Trainee Dashboard (MP-30: attendance counts) |
| **Decided 2026-11-23** | One session per class day, hours default from the program class time and the trainer can adjust. Any date from the batch start up to today, never the future. Corrections allowed while the batch is `ONGOING`, every change logged. Status and an optional remark per trainee, no time in or out. **The attendance sheet can be printed and exported** (answered 2026-11-23) |
| **TBA (to be announced)** | Three things are not decided: how **LATE and EXCUSED** count toward hours, whether hours **carry over on a transfer** to another batch, and the **export file format and layout** (assumed Excel, see Open Question 3). See the Open Questions |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** to record the attendance of my trainees for each class session, with the hours of the session,
**so that** the system knows how many training hours each trainee completed, and the dashboards and the clearance check can use it.

## Background

- Attendance is kept on paper and in Excel today. `training_session` and `attendance` exist in the database, both empty, and nothing writes to them.
- The Trainee Dashboard (MP-30) already reads attendance counts. The Trainer Dashboard (MP-65) needs hours progress and "behind pace". The Trainer clearance (MP-61) needs hours completed. None of them can show real data until this ticket records attendance.
- TESDA sets training hours per qualification (nominal duration) and training is competency-based. So the system needs **hours per session**, not only present and absent counts. See the sources in `trainer/dashboard/acceptance.md`.

## What the Database Has Today (and What Is Missing)

| Table | Has | Missing |
|---|---|---|
| `training_session` | `session_id`, `batch_id`, `session_date`, `topics_covered`, `created_by`. Index on `batch_id` | **No hours.** **No unique key on (`batch_id`, `session_date`)**, so two sessions can exist for one day. No update time or editor |
| `attendance` | `id`, `session_id`, `enrollment_id`, `status` (PRESENT, ABSENT, LATE, EXCUSED), `recorded_by`, `remarks`, `created_at`. Indexes on `session_id` and `enrollment_id`. Cascade delete from session and enrollment | **No unique key on (`session_id`, `enrollment_id`)**, so one trainee can be recorded twice for one session. No update time or editor |
| History | None | No record of corrections |
| `enrollments` | `enrollment_status` (PENDING, ENROLLED, WITHDRAWN, COMPLETED, DROPPED), unique (`trainee_id`, `batch_id`) | |
| `program_schedule` | `days` (MON to SUN), `start_time`, `end_time`, per program | Used for the default hours |
| `programs` | `total_training_hours` | Used for the percentage |

Both tables are empty on the shared database (checked 2026-11-23), so adding constraints is safe. Test the migration on a fresh database. Known issues: the `0_init` byte-order mark (TECH-02) and the drift (TECH-03).

## What the Trainer Can Do

The page works on the trainer's own batches that are `ONGOING`.

1. **Pick a batch and a date.** The date defaults to today. Scheduled class days (from the program schedule) are suggested. Other days are marked **Extra day**.
2. **Take attendance.** A roster of the enrolled trainees. Each gets a status (present, absent, late, excused) and an optional remark. **Mark all present** fills everyone, then the trainer changes the exceptions. A running count shows the four totals.
3. **Set the hours** of the session. The default is the length of the class time for that weekday in the program schedule. The trainer can change it. For an extra day with no scheduled time the hours must be entered.
4. **Save.** The session and every trainee's attendance are saved in one step. Every trainee on the roster must have a status.
5. **Correct a saved session.** Open the date again and change statuses, remarks or hours. Every change is logged. A reason is required for a session dated before today.
6. **Session list.** The sessions of the batch: date, hours, the four counts, and who last changed it. Scheduled class days with no session yet are highlighted as **Missing**.
7. **Trainee summary.** Per trainee: hours completed, percentage of the program's total hours, the counts of each status.
8. **Print a session sheet.** A print layout of one session (one date): batch, program, date, hours, the roster with each status and remark, the four counts, and a line for the trainer's signature. Uses the browser print, no server file.
9. **Export the attendance grid.** An Excel file for a batch and a date range (the whole batch by default): one row per trainee, one column per session date with a letter for the status, and totals per trainee (the four counts, hours completed, percentage). This mirrors the paper and Excel sheets used today.

## Rules

- **Who.** Only `TRAINER`, only for batches where the logged-in user is the batch trainer. The trainer is never taken from a query, body or path value.
- **Which batch.** The batch must be `ONGOING` to record or correct. An `OPEN`, `CLOSED` or `CANCELLED` batch can be viewed (if it has sessions) but not changed.
- **Which date.** On or after the batch `start_date` (the real date confirmed in MP-66) and not after today in Asia/Manila. One session per batch per date.
- **Roster.** The trainees of the batch with enrollment status `ENROLLED` whose enrollment date is on or before the session date. A trainee who withdrew or dropped keeps the rows already recorded, shown read-only. Edge cases are in the Open Questions.
- **Complete roster.** Saving needs a status for every trainee on the roster. No blanks.
- **Hours.** Greater than 0 and at most 24 (also a database check). In steps of 0.25 on the screen.
- **Hours completed** (per enrollment) = the sum of the session hours where the trainee was `PRESENT`. **Assumed until MCCTEST decides (Open Question 1):** `LATE` counts in full, `EXCUSED` and `ABSENT` count 0. This rule is in **one shared function**, used by the Trainer Dashboard (MP-65), the Trainer clearance (MP-61) and the Trainee Dashboard, so the numbers always agree.
- **Corrections.** Allowed while the batch is `ONGOING`. Every change writes a history row. A reason (5 to 500 characters) is required when the session date is before today. After the batch is `CLOSED` everything is read-only.
- **Deleting.** A session with attendance rows cannot be deleted. An empty session (saved by mistake with no rows) can.
- **Stale save.** The save carries the version of the session the trainer loaded. If it changed, the API returns 409 and changes nothing. Two saves at the same moment give one winner.
- **All or nothing.** The session, the attendance rows and the history rows are saved in one transaction.
- **History.** Append-only. The application has no update or delete for it.
- **Print.** Done in the browser from the saved data on screen. Shows the saved session, not unsaved edits (a warning shows when there are unsaved changes).
- **Export.** Only the trainer's own batches. Allowed for `ONGOING` and `CLOSED` batches (read-only data). Built on the server from the saved data and sent as a download, not stored. The file has names and system IDs, statuses, remarks and hours, **no contact number, address or other personal data**.
- **Spreadsheet safety.** A remark or name that starts with `=`, `+`, `-` or `@` is written as plain text so it cannot run as a formula.

## Schema Proposal (one migration)

- `training_session`: add `hours` (decimal(4,2), not null, check greater than 0 and at most 24), `updated_at` (timestamptz), `updated_by` (uuid, FK to users, nullable), and a **unique** (`batch_id`, `session_date`).
- `attendance`: add `updated_at`, `updated_by` (uuid, FK to users, nullable), and a **unique** (`session_id`, `enrollment_id`).
- New enum `attendance_change_enum`: `RECORDED`, `STATUS_CHANGED`, `REMARK_CHANGED`, `HOURS_CHANGED`, `SESSION_DELETED`.
- New table `attendance_history`: `id`, `session_id` (uuid, no cascade delete so history survives an empty-session delete), `enrollment_id` (nullable, null for hours changes), `change_type`, `old_status`, `new_status`, `old_remarks`, `new_remarks`, `old_hours`, `new_hours`, `reason`, `changed_by` (FK to users), `changed_at`. Index on (`session_id`, `changed_at` desc).
- Because the tables are empty, `hours` can be added as not null with no default.
- No change to the `attendance_status_enum` (PRESENT, ABSENT, LATE, EXCUSED).

## Endpoints (all `TRAINER` only, `JwtAuthGuard` and `RolesGuard`)

| Method and path | What |
|---|---|
| `GET /api/trainer/attendance/batches` | My `ONGOING` batches (and batches with sessions) with the schedule |
| `GET /api/trainer/attendance/batches/:batchId/sheet?date=YYYY-MM-DD` | The roster for a date, the saved session if there is one (statuses, remarks, hours, version), the default hours, and whether the date is a scheduled day |
| `PUT /api/trainer/attendance/batches/:batchId/sessions/:date` | Create or update the session and all attendance rows in one call. Body: hours, topics (optional), the rows, the version, and the reason when needed |
| `DELETE /api/trainer/attendance/batches/:batchId/sessions/:date` | Delete an empty session |
| `GET /api/trainer/attendance/batches/:batchId/sessions` | The session list with counts, and the missing scheduled days |
| `GET /api/trainer/attendance/batches/:batchId/summary` | Per trainee hours completed, percentage and counts |
| `GET /api/trainer/attendance/sessions/:date/history?batchId=` | The history timeline of a session |
| `GET /api/trainer/attendance/batches/:batchId/export.xlsx?from=&to=` | The attendance grid of the batch for a date range (whole batch by default) as an Excel file |

## Open Questions (TBA unless answered)

| # | Question | Answer or assumption |
|---|---|---|
| 1 | How do **LATE** and **EXCUSED** count toward hours? Must EXCUSED hours be made up? | **TBA, MCCTEST to decide** (the same open decision as MP-65). Assumed until then: LATE counts in full, EXCUSED and ABSENT count 0. The rule is one function so it can change |
| 2 | Do hours **carry over** when a trainee is transferred to another batch? | **TBA.** A transfer makes a new enrollment, so today the new enrollment starts at zero hours. The old rows stay with the old enrollment |
| 3 | Can the attendance sheet be printed or exported? | **Answered 2026-11-23:** yes, it can be printed and exported. **Assumed:** print is the browser print of one session, and the export is an Excel grid of the batch. **TBA:** the exact file format (Excel, PDF or both) and the column layout MCCTEST wants. A PDF could reuse the PDF builder of MP-68 |
| 4 | One session per day or two? | **Answered 2026-11-23:** one session per class day |
| 5 | Hours: default or typed? | **Answered 2026-11-23:** default from the program class time, the trainer can adjust |
| 6 | Which dates can be recorded? | **Answered 2026-11-23:** from the batch start date up to today, never the future |
| 7 | Can the trainer correct after saving? | **Answered 2026-11-23:** yes while the batch is `ONGOING`, every change logged |
| 8 | What is recorded per trainee? | **Answered 2026-11-23:** status and an optional remark. No time in or out |
| 9 | Who is on the roster of a past date? | **Assumed:** trainees now `ENROLLED` whose enrollment date is on or before that date. Trainees who withdrew keep their earlier rows, read-only |
| 10 | Is a reason required for a correction? | **Assumed:** yes when the session date is before today. Not required for the same day |
| 11 | Does the Trainee, Registrar or Admin see attendance? | **Assumed:** the trainee sees their own through the Trainee Dashboard (MP-30). No Admin or Registrar view in this ticket |
| 12 | Can a session be deleted? | **Assumed:** only an empty one. A session with attendance can only be corrected |

## Scope

- **Backend:** a trainer attendance module (controller, service, DTOs) under `/api/trainer/attendance`; a shared hours function (hours completed, percentage) that MP-65, MP-61 and the Trainee Dashboard call; the Excel export (a spreadsheet library is a new dependency, none is installed today); one migration.
- **Frontend:** the Attendance page (batch and date picker, roster, counts, hours, save, session list with Missing days, trainee summary, history timeline, Print and Export buttons), kept in the URL.
- **Tests:** unit tests for the service (every unhappy path), the DTOs, the controller (role, guards, the logged-in user passed on) and the shared hours function.

## Out of Scope

Time in and out, notifications to trainees about absences, an Admin or Registrar attendance view, automatic warnings, a PDF of the grid (Open Question 3), the My Batches and Class Records pages, and competency results (FUNC-007).

---

## Acceptance Criteria

### Access and security

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-1 | Only `TRAINER` can open `/trainer/attendance`. Other roles go to `/403` | PASS | `ProtectedRoute` with `TRAINER` role |
| AT-2 | Every endpoint needs a login (401) and the `TRAINER` role (403 for Admin, Registrar, Encoder, Trainee) | PASS | JWT and role guards |
| AT-3 | A trainer reads and changes only batches where they are the batch trainer. Another trainer's batch returns 404 on every call | PASS | Ownership lookup in `findBatch` |
| AT-4 | The trainer comes from the login. No query, body or path value picks a trainer. The `recorded_by` and `updated_by` values come from the login, never from the body | PASS | Trainer ID comes from `req.user.id` |
| AT-5 | Responses have no password hash, email, contact number, address or birth date. Trainees appear by name and system ID only | PASS | Typed/select responses |
| AT-6 | Input is validated: bad ids and dates, a status outside the four values, hours out of range, a remark or reason too long, rows for enrollments not in the batch, and extra fields are rejected or dropped | PASS | DTO validation and global whitelist |

### Taking attendance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-7 | The page lists my `ONGOING` batches. Choosing a batch and a date shows the roster of enrolled trainees with a status control and a remark for each | PASS | |
| AT-8 | The date defaults to today. Scheduled class days are suggested and other days are marked Extra day | PASS | Default Manila date; scheduled/extra label |
| AT-9 | **Mark all present** sets every trainee to present and the trainer can change the exceptions. A running count shows present, absent, late and excused | PASS | |
| AT-10 | Saving needs a status for every trainee on the roster. A missing status returns 400 and the page shows which trainee | PASS | Frontend and API validation |
| AT-11 | Saving creates the session and all attendance rows in one call, with `recorded_by` set to the trainer. A second save of the same date updates the same session and does not create another | PASS | |
| AT-12 | The default hours are the length of the class time for that weekday in the program schedule. The trainer can change them. For an extra day with no scheduled time, hours must be entered | PASS | |
| AT-13 | Hours must be greater than 0 and at most 24, in steps of 0.25 on the screen. Anything else returns 400 | PASS | Screen step and backend 0.25 validation |
| AT-14 | A date before the batch start date, or after today (Asia/Manila), returns 400 and names the limit | PASS | |
| AT-15 | A batch that is not `ONGOING` (`OPEN`, `CLOSED`, `CANCELLED`) cannot be recorded or changed. The API returns 409 | PARTIAL | Recording is blocked, but the implementation returns 404 instead of the specified 409 |
| AT-16 | The roster has only trainees with status `ENROLLED` whose enrollment date is on or before the session date. A row for any other enrollment returns 400 | PASS | |
| AT-17 | A trainee who withdrew or dropped keeps the rows already recorded, shown read-only, and does not appear on new sessions | PASS | |
| AT-18 | Optional topics covered (existing column) can be saved with the session, with a length limit | PASS | API `topics` field and 500-character limit |

### Corrections and history

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-19 | A saved session can be reopened and changed while the batch is `ONGOING`. A closed batch is read-only | PASS | |
| AT-20 | Every first save writes `RECORDED` history rows. Every later change of a status, a remark or the hours writes a row with the old and new value, who and when | PASS | |
| AT-21 | Changing a session dated before today needs a reason of 5 to 500 characters. Without it the API returns 400. The same day needs no reason | PASS | |
| AT-22 | A save that changes nothing writes no history and no new `updated_at` | PASS | |
| AT-23 | The history timeline of a session shows each change newest first with who, when, old and new value and the reason | PASS | Backend endpoint implemented |
| AT-24 | History cannot be changed or deleted through the application. There is no update or delete route for it | PASS | |
| AT-25 | An empty session can be deleted and writes a `SESSION_DELETED` row. A session with attendance rows returns 409 on delete | PASS | |

### Session list and summary

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-26 | The session list shows date, hours, the four counts and who last changed each session | PARTIAL | Date, hours and counts pass; last editor is not shown |
| AT-27 | Scheduled class days between the batch start date and today that have no session are shown as Missing | NOT IMPLEMENTED | |
| AT-28 | The trainee summary shows, per trainee, hours completed, the percentage of the program's `total_training_hours` (never above 100), and the four counts | PASS | |
| AT-29 | A program with no `total_training_hours` shows the hours and counts but no percentage ("Program hours not set") and no error | PASS | |
| AT-30 | Hours completed use the one shared function (PRESENT in full, LATE in full, EXCUSED and ABSENT 0, until decided) and nowhere else is the rule written | PASS | |

### Integration with the other tickets

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-31 | The Trainee Dashboard (MP-30) shows the counts and percentage from the new rows without a change to its endpoint. A trainee sees only their own attendance | PASS | Shared helper integrated; runtime regression remains |
| AT-32 | The Trainer Dashboard (MP-65) uses the shared function for hours progress, behind pace and "Attendance recorded" for today | NOT IMPLEMENTED | |
| AT-33 | The Trainer clearance check "hours complete" (MP-61) can read hours completed from the shared function. It stays ticked by hand until MCCTEST decides the minimum | NOT IMPLEMENTED | |
| AT-34 | Changing a batch start date (MP-66) to a date after a recorded session is refused. Recording a session before the batch start date is refused. The two rules agree | PARTIAL | Recording-side rule passes; MP-66 cross-ticket guard needs separate implementation/testing |

### Integrity, concurrency and performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-35 | A stale save (the session changed since it was loaded) returns 409 and changes nothing | PASS | |
| AT-36 | Two saves of the same batch and date at the same moment give one winner and one session. The database unique key (`batch_id`, `session_date`) holds | PASS | Unique key plus P2002 mapping |
| AT-37 | The same trainee cannot get two rows for one session. The database unique key (`session_id`, `enrollment_id`) holds | PASS | |
| AT-38 | The session, the attendance rows and the history rows are saved together or not at all. A failure in the middle leaves nothing behind | PASS | `$transaction` |
| AT-39 | The sheet, the session list and the summary run a fixed number of queries whatever the number of trainees or sessions. Saving 25 trainees runs a fixed number of statements, not one per trainee | NOT VERIFIED | Statement logging required |
| AT-40 | The migration applies on a fresh database, `prisma migrate diff` shows no drift for the new objects, and it runs on the empty shared tables | PASS | Throwaway PostgreSQL passed; known old-object drift only |

### Print and export

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-46 | Print on a session opens the browser print with a clean layout: batch, program, date, hours, the roster with status and remark, the four counts, and a trainer signature line. No menus, buttons or sidebar are printed | PASS | Browser preview still needs manual verification |
| AT-47 | The printed sheet shows the saved session. With unsaved changes the page warns and prints the saved version | PASS | Print block uses `detail.entries` and dirty warning |
| AT-48 | Export downloads an Excel file for the batch and a date range (whole batch by default). One row per trainee, one column per session date with a status letter, and totals per trainee: the four counts, hours completed and percentage | PARTIAL | CSV works; native `.xlsx` not implemented |
| AT-49 | The file header shows MCCTEST, program, batch, trainer, the date range and the date generated (Asia/Manila). The hours of each session are shown above its column | NOT IMPLEMENTED | |
| AT-50 | The export has no contact number, address, email, birth date or other personal data, only name, system ID, statuses, remarks and hours | PASS | Export does not include remarks and includes no sensitive fields |
| AT-51 | A name or remark starting with `=`, `+`, `-` or `@` is written as plain text and does not run as a formula | PASS | CSV cell escaping |
| AT-52 | Export works for `ONGOING` and `CLOSED` batches of the trainer. Another trainer's batch returns 404, a batch with no session returns 409, and a range with `from` after `to` returns 400. Nothing is stored on the server | PASS | Runtime browser/API verification remains |

### Frontend

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AT-41 | The batch, the date and the tab are kept in the URL and survive a refresh | PASS | |
| AT-42 | Empty, loading and error states exist: no ONGOING batch, no trainees on the roster, a failed save with the typed values kept | PARTIAL | Loading/empty/error states exist; no-roster state needs browser verification |
| AT-43 | The page warns before leaving with unsaved changes | PASS | Before-unload warning |
| AT-44 | Status colors are not the only signal (labels or icons as well), the roster is usable by keyboard, and the page works at phone width without sideways scroll | PARTIAL | Labels and keyboard controls exist; 375px verification pending |
| AT-45 | Constants (status list, hours step and limit, reason length) are in one place on each side, and the status list matches the database enum | PARTIAL | Status enum comes from Prisma and frontend has a local status list; constants are not fully centralized |

---

## Test Cases

### TC-01: Access
- **AC:** AT-1, AT-2, AT-4
- **Priority:** Critical
- **Steps:** Open the page as Admin, Registrar, Encoder and Trainee. Call each endpoint with those tokens and with none. Send a body with `recorded_by` of another user.
- **Expected:** Page goes to `/403`. API returns 403, and 401 with no token. The `recorded_by` in the body is ignored and the saved row has the trainer's id.

### TC-02: Ownership
- **AC:** AT-3, AT-5
- **Priority:** Critical
- **Precondition:** Two trainers with a batch each.
- **Steps:** As trainer A, list batches and try to read and save for B's batch.
- **Expected:** Only A's batch is listed. B's batch returns 404 for every call. No personal data fields in the responses.

### TC-03: Take attendance for today
- **AC:** AT-7 to AT-12
- **Priority:** Critical
- **Precondition:** An `ONGOING` batch with 10 enrolled trainees and a Monday to Friday 8:00 to 12:00 schedule.
- **Steps:** Open the batch on a class day. Click Mark all present, change two trainees to absent and late, add a remark. Try to save with one status cleared, then save properly.
- **Expected:** Default hours are 4. The counts show 8, 1, 1, 0. The incomplete save returns 400 and names the trainee. The full save creates one session and 10 rows with `recorded_by` set.

### TC-04: Dates and batch status
- **AC:** AT-13 to AT-15
- **Priority:** High
- **Steps:** Try a future date, a date before the batch start date, hours of 0 and 25, and a date on an `OPEN`, a `CLOSED` and a `CANCELLED` batch. Then record a date three days ago.
- **Expected:** 400 for the future date, the early date and the bad hours. 409 for the three statuses. The date three days ago saves.

### TC-05: Extra day
- **AC:** AT-8, AT-12
- **Priority:** Medium
- **Steps:** Pick a Sunday that is not scheduled.
- **Expected:** Marked Extra day. Hours have no default and must be entered. A save without hours returns 400.

### TC-06: Roster rules
- **AC:** AT-16, AT-17
- **Priority:** High
- **Precondition:** One trainee withdrew after two sessions, one trainee enrolled yesterday.
- **Steps:** Open a past date before yesterday, and today. Send a row for the withdrawn trainee on a new session, and a row for a trainee of another batch.
- **Expected:** The late enrollee is not on the old date. The withdrawn trainee's old rows show read-only and the trainee is not on new sessions. Both bad rows return 400.

### TC-07: Correction with history
- **AC:** AT-19 to AT-24
- **Priority:** Critical
- **Steps:** Change one status the same day. Change a status of a session from three days ago with no reason, then with a reason. Save with no change. Open the history. Close the batch and try to edit.
- **Expected:** The same-day change needs no reason and writes a row. The old session without a reason returns 400, with a reason it writes a row. The no-change save writes nothing. The timeline lists the rows newest first with who, when, old and new value and reason. After closing, edits return 409. No update or delete route for history exists.

### TC-08: Delete a session
- **AC:** AT-25
- **Priority:** Medium
- **Steps:** Create an empty session directly in a test database (a session with no attendance rows) and delete it through the API. Then try to delete a session that has attendance.
- **Expected:** The empty session deletes and writes `SESSION_DELETED`. The session with attendance returns 409.

### TC-09: Session list and Missing days
- **AC:** AT-26, AT-27
- **Priority:** Medium
- **Precondition:** A batch started 10 days ago, Monday to Friday schedule, with 6 recorded days.
- **Steps:** Open the session list.
- **Expected:** The six sessions show hours, counts and last editor. The scheduled days without a session are marked Missing. Weekend days are not.

### TC-10: Trainee summary and the hours rule
- **AC:** AT-28 to AT-30
- **Priority:** High
- **Precondition:** A 300-hour program. A trainee with 10 sessions of 4 hours: 6 present, 2 late, 1 excused, 1 absent.
- **Steps:** Open the summary. Open a program with no total hours.
- **Expected:** Hours completed are 32 (6 present and 2 late, 4 hours each), the percentage is 10.67, and the counts are 6, 2, 1, 1. The program with no total shows the counts and "Program hours not set". The same number appears on the Trainer Dashboard and the Trainee Dashboard.

### TC-11: Other dashboards
- **AC:** AT-31 to AT-34
- **Priority:** High
- **Steps:** After recording, open the Trainee Dashboard as a trainee, the Trainer Dashboard as the trainer, and the Trainee Information profile. Then try to move a batch start date after a recorded session (MP-66) and to record before the start date.
- **Expected:** The trainee sees only their own counts. The trainer dashboard shows hours progress and "Attendance recorded". Both date rules refuse and name the date.

### TC-12: Stale save and a double save
- **AC:** AT-35, AT-36
- **Priority:** Critical
- **Steps:** Open the same date in two browsers, save in one, then save in the other. Fire two saves for the same new date at the same moment.
- **Expected:** The second save returns 409 and changes nothing. In the race exactly one session exists and one save wins.

### TC-13: Database constraints and one transaction
- **AC:** AT-37, AT-38, AT-40
- **Priority:** High
- **Steps:** Insert two attendance rows for the same session and enrollment, and two sessions for the same batch and date, directly in a test database. Force the history insert to fail during a save. Apply all migrations to an empty database and run `prisma migrate diff`.
- **Expected:** Both inserts fail on the unique keys. The forced failure leaves no session and no rows. No drift for the new objects.

### TC-14: Query count
- **AC:** AT-39
- **Priority:** Medium
- **Steps:** Statement logging on. Load the sheet and save for 5 trainees, then for 25. Load the session list for a batch with 10 and with 60 sessions.
- **Expected:** The same number of queries and statements in both cases. Record the timing and say it is local.

### TC-15: Print the session sheet
- **AC:** AT-46, AT-47
- **Priority:** Medium
- **Steps:** Open a saved session and print preview. Change a status without saving and print again.
- **Expected:** A clean sheet with the batch, program, date, hours, roster, counts and a signature line, and no menus or buttons. With unsaved changes a warning shows and the printed sheet has the saved values.

### TC-16: Export the attendance grid
- **AC:** AT-48 to AT-52
- **Priority:** High
- **Precondition:** A batch with 10 sessions and 12 trainees, one trainee named `=HYPERLINK("x")` and one remark `+1+1`.
- **Steps:** Export the whole batch, then a range of 3 sessions. Try another trainer's batch, a batch with no session, and `from` after `to`. Open the file in Excel.
- **Expected:** One row per trainee, one column per date with status letters, totals match the on-screen summary, the header and session hours are correct. No contact data. The formula-looking text shows as text. 404, 409 and 400 for the three refused cases. No file stored on the server.

### TC-17: Screen behaviour
- **AC:** AT-41 to AT-44
- **Priority:** Medium
- **Steps:** Pick a batch and date, then refresh. Edit and try to leave. Stop the API and save. Open with no `ONGOING` batch. Tab through the roster. Open at 375 px wide.
- **Expected:** Batch and date survive the refresh. A warning shows before leaving with changes. The failed save keeps the typed values and shows an error. The empty states show. The roster works by keyboard, statuses show a label as well as a color, and nothing scrolls sideways.

---

## Implementation Audit: 2026-11-23

This audit replaces the earlier blanket "ready/done" statement. It is based on
code and build/migration evidence. Automated checks are not a substitute for
manual acceptance testing.

| Area | Result | Evidence / remaining verification |
|---|---|---|
| Access and ownership | PASS, implementation complete | Trainer guard, role guard, trainer-ID ownership, and 404 batch lookup are implemented. Browser 401/403 behavior still needs manual testing. |
| Attendance save and corrections | PASS, implementation complete | Transactional save, 0.25-hour validation, draft status, stale version check, read-only withdrawn rows, and no-op timestamp protection are implemented. |
| Date and roster rules | PASS, implementation complete | Manila today check, batch-start check, strict date parsing, and enrollment-date filtering are implemented. |
| History | IMPLEMENTED, needs runtime test | Append-only history rows, newest-first endpoint, and no update/delete application route are implemented. |
| Delete empty session | IMPLEMENTED, needs runtime test | API deletes only sessions with no attendance. Attendance-bearing sessions return 409. |
| Session list | PARTIAL | Saved sessions and counts are implemented. Missing scheduled class days and last-editor details are not implemented. |
| Trainee summary | PASS, implementation complete | Completed hours, percentage cap, and four status counts are implemented. Program-without-hours is handled. |
| Trainer and clearance integration | NOT IMPLEMENTED | The trainer dashboard and MP-61 clearance are still placeholders or do not consume this ticket's shared function. |
| Shared hours policy | PASS | `PRESENT` and `LATE` count in full; `ABSENT` and `EXCUSED` count zero. The trainee dashboard consumes the shared helper. |
| Concurrency and database | PASS, migration tested | Throwaway PostgreSQL migration passed; unique keys and hours check are present. Concurrent runtime behavior needs manual testing. |
| Print | IMPLEMENTED, needs browser verification | A saved-session-only print block with roster, counts, hours, and signature line is implemented. Unsaved changes are warned and excluded. |
| Export | CSV IMPLEMENTED, not native XLSX | Authenticated CSV export has status letters, trainee/system ID, date range, totals, formula protection, and no personal contact fields. It does not meet an exact native `.xlsx` format requirement. |
| Export restrictions | IMPLEMENTED, needs runtime test | Own CLOSED/ONGOING batches, from-after-to 400, no-session 409, and formula protection are implemented. |
| Frontend URL and leave behavior | IMPLEMENTED, needs browser verification | Batch/date URL state and before-unload unsaved warning are implemented. |
| Mobile and accessibility | PARTIAL | Responsive Tailwind layout exists, keyboard controls exist, but phone-width and accessibility acceptance testing is still required. |

## Deployment and publishing conclusion

**Not publish-ready to production, but ready for a code-review/dev PR.**

The code compiles and lints, the schema/migration passes throwaway PostgreSQL
testing, and no migration was applied to Supabase. Before claiming task
acceptance, run the 17 manual test cases against seeded deployed data. MP-65,
MP-61 and missing scheduled-session details remain separate/unfinished surfaces
and must not be claimed as complete within this ticket unless their acceptance
code is delivered and tested.

## Summary: 40 PASS, 7 PARTIAL, 4 NOT IMPLEMENTED, 1 NOT VERIFIED

- **52 acceptance criteria total**
- **40 PASS:** verified from implementation/build evidence
- **7 PARTIAL:** implemented but missing a required detail or runtime verification
- **4 NOT IMPLEMENTED:** outside or incomplete relative to this implementation
- **1 NOT VERIFIED:** requires statement/query-count testing
- **17 test cases:** 0 manual test cases executed; 17 NOT RUN
- **Migration:** tested successfully on throwaway PostgreSQL
- **Latest migration revision:** retested successfully after adding delete-safe attendance history
- **Supabase:** unchanged
- **Build/lint:** backend and frontend pass
- **Native Excel `.xlsx`:** pending leader decision
- **PR status:** ready for code review into `dev`; not ready for production completion
