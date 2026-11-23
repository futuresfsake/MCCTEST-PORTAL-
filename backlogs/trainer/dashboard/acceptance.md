# Trainer: Dashboard

| Field | Value |
|-------|-------|
| **Jira** | MP-65 |
| **Type** | Feature (Trainer page and one read-only endpoint) |
| **Status** | NOT STARTED (the page is a placeholder, TD-1 to TD-4 pass) |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Route** | `/trainer/dashboard` (exists, placeholder) |
| **Backend** | `GET /api/trainer/dashboard` (exists, returns a fixed message) |
| **Depends on** | Built now: Trainee Information (MP-50), Withdrawal (MP-48), Announcements. Filled in later by: attendance (FUNC-006), competency results (FUNC-007), clearance (MP-61) |
| **Related** | The Trainee Dashboard (MP-30) is the pattern for the endpoint and cards. Notifications (MP-56) is separate |
| **TBA (to be announced)** | Three things are not decided: what counts as **low attendance**, whether **hours completed** is shown, and whether the **graduating list** shows here. See the Open Questions |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** a dashboard that shows my batches, my trainees, today's classes, attendance, progress and the requests waiting for me,
**so that** I can see at a glance what needs my attention without opening every page.

## Today

- The page has a welcome banner (system ID) and the announcements widget. Nothing else.
- `TrainerService.getDashboardData()` returns `{ role: 'TRAINER', message: 'Trainer dashboard — coming in Sprint 2' }`. It reads nothing from the database.
- The sidebar already has links for pages that are not built: My Batches, Class Records, Attendance, Progress, Grades, Records and Graduating List. Trainees, Withdrawal requests and Announcements work.

## Data that exists today

| Section | Source | Built? |
|---|---|---|
| My batches | `batch` where `trainer_id` is the logged-in trainer, with `programs`, `program_schedule` | Yes (data exists, no trainer endpoint) |
| Trainee counts | `enrollments` of those batches (`ENROLLED`, `WITHDRAWN`, `COMPLETED`) | Yes |
| Needs my action: withdrawal | Withdrawal requests at `PENDING_VALIDATION` for my batches (MP-48) | Yes |
| Needs my action: clearance | Clearance requests at `PENDING_VALIDATION` for my batches (MP-61) | No, shows 0 until MP-61 |
| Today's classes | `program_schedule.days` and `start_time`, batch `ONGOING` and dates in range, `training_session` for today | Schedule yes, sessions empty |
| Attendance snapshot | `attendance` through `training_session` | Tables exist and are empty, no one records yet (FUNC-006) |
| Progress snapshot | `trainee_outcome_status` | Table exists and is empty, no one records yet (FUNC-007) |
| Coming up | `batch.start_date` and `end_date` | Yes |
| Announcements | Existing `AnnouncementWidget` | Yes |

## What the Dashboard Shows

All of it is for **my own batches** only. It is read-only. No button on it changes data.

1. **Needs my action** (top). Count of withdrawal requests waiting for my validation, and clearance requests waiting for my validation. Each is a link to its page. When both are 0 it says nothing is waiting.
2. **Summary cards.** Batches by status (open, ongoing, closed), trainees enrolled, trainees who withdrew, trainees who completed.
3. **My batches.** One card per batch (not cancelled): program, batch name, status, start and end date, enrolled out of capacity, class days and time, and a progress bar of how far today is between the start and end date. A link opens Trainees filtered to that batch.
4. **Today's classes.** The ongoing batches that have class today (by the program schedule days), with the time, and a chip "Attendance recorded" or "Not recorded yet".
5. **Attendance snapshot.** Per batch: the attendance rate of the last recorded session, and the three trainees with the lowest attendance rate. Empty state until attendance is recorded.
6. **Progress snapshot.** Per batch: learning outcomes passed out of assessed, and the trainees with a failed outcome. Empty state until results are recorded.
7. **Coming up.** Batches starting or ending in the next 14 days.
8. **Announcements.** The existing widget, with a link to the Announcements page to post.
9. **Quick links.** Trainees, Withdrawal requests, Announcements, Clearance.

## Rules

- **Attendance rate** = PRESENT out of all recorded rows, rounded to two decimals, the same rule as the Trainee Dashboard (MP-30), so both pages agree. Whether LATE and EXCUSED should count is Open Question 1 (TBA).
- **Trainees counted** are enrollments of the trainer's batches by enrollment status. A trainee who transferred batches is counted in the batch they are in now.
- **Cancelled batches** are not listed and not counted.
- **Today** is the date in Philippine time (Asia/Manila), not the server's time zone.
- **One round trip.** The page loads with one request. A section that fails is not shown as an error for the whole page.

## Open Questions (TBA unless answered)

| # | Question | Answer or assumption |
|---|---|---|
| 1 | What counts as **low attendance**, and how is the rate computed? | **TBA.** Until decided, the snapshot lists the three lowest rates and does not flag anyone as "low". The rate matches the Trainee Dashboard (MP-30) |
| 2 | Is **hours completed** shown? | **TBA.** `training_session` stores a date and topics but no hours, so hours cannot be computed. Left out |
| 3 | Does the **graduating list** show here? | **TBA.** The page is not built. Left out |
| 4 | How far ahead is "Coming up"? | **Assumed:** 14 days. A constant in one place |
| 5 | Does a trainer with batches in different programs see one list? | **Assumed:** yes, one list, grouped by batch, sorted by status then start date |

## Scope

- **Backend:** replace the stub of `GET /api/trainer/dashboard` in `TrainerService` with one read-only query set and a typed response (like `users/trainee/dashboard/dashboard.types.ts`). No migration.
- **Frontend:** build the sections on `TrainerDashboard.tsx` with small components (cards, batch card, class chip, empty state) in the same style as the Trainee Dashboard. Keep the announcements widget.
- **Tests:** unit tests for the service (own batches only, empty trainer, counts, today's classes by weekday, time zone, empty attendance and progress), the controller (role, guards, the logged-in user passed on) and the response shape.

## Out of Scope

The pages the cards link to (My Batches, Class Records, Attendance, Progress, Grades, Trainee Records, Graduating List), notifications (MP-56), charts and exports, a calendar view, and any button that changes data.

---

## Acceptance Criteria

### Already in place (placeholder)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TD-1 | Login as trainer redirects to the trainer dashboard | PASS | Role-based redirect |
| TD-2 | The page renders without errors | PASS | `TrainerDashboard` component |
| TD-3 | Non-trainer roles cannot open it | PASS | `ProtectedRoute allowedRoles={['TRAINER']}` |
| TD-4 | The sidebar shows the trainer links | PASS | Training and Records sections |

### Access and security

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TD-5 | `GET /api/trainer/dashboard` needs a login. No token returns 401 | NOT STARTED | `JwtAuthGuard` |
| TD-6 | Only TRAINER can call it. Admin, Registrar, Encoder and Trainee get 403 | NOT STARTED | `RolesGuard`, `@Roles(Role.TRAINER)` |
| TD-7 | The trainer comes from the login. The endpoint takes no query, body or path value that picks a trainer. `?trainer_id=other` is ignored | NOT STARTED | `@CurrentUser()` |
| TD-8 | A trainer sees only batches where they are the assigned trainer, and only the trainees in them. Two trainers get different data | NOT STARTED | Same rule as MP-50 and MP-48 |
| TD-9 | The response has no password hash, email, contact number, address, birth date or other personal data. Trainees appear by name and system ID only | NOT STARTED | Typed response |
| TD-10 | The endpoint changes no data. It runs only reads | NOT STARTED | |

### Needs my action

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TD-11 | Shows the number of withdrawal requests at `PENDING_VALIDATION` for my batches, with a link to `/trainer/withdrawal-requests`. A request from another trainer's batch is not counted | NOT STARTED | Same filter as MP-48 |
| TD-12 | Shows the number of clearance requests at `PENDING_VALIDATION` for my batches, with a link to `/trainer/clearance-requests`. It shows 0 and no error while MP-61 is not built | NOT STARTED | Must not fail when the table has no rows or the status does not exist yet |
| TD-13 | When both counts are 0 it says nothing is waiting | NOT STARTED | |

### Summary and batches

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TD-14 | The summary cards show batches by status (open, ongoing, closed), trainees enrolled, withdrawn and completed. Cancelled batches are not counted | NOT STARTED | |
| TD-15 | Each batch card shows program, batch name, status, start and end date, enrolled out of capacity, class days and time | NOT STARTED | Schedule from `program_schedule` |
| TD-16 | The batch progress bar shows how far today is between the start and end date, and stays between 0 and 100 percent before the start and after the end | NOT STARTED | |
| TD-17 | Each batch card links to the Trainees page for that batch | NOT STARTED | Link only, no data change |
| TD-18 | A program with no schedule shows "No schedule set" and does not break the card | NOT STARTED | |
| TD-19 | Batches are sorted ongoing first, then open, then closed, then by start date | NOT STARTED | |

### Today's classes, attendance and progress

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TD-20 | Today's classes lists the ongoing batches whose program schedule has today's weekday and whose dates include today, with the start and end time | NOT STARTED | |
| TD-21 | "Today" is the date in Asia/Manila. At 23:30 Manila time the same weekday is used as in Manila, not the server's | NOT STARTED | Time zone test |
| TD-22 | Each class has a chip "Attendance recorded" when a `training_session` with attendance exists for today and "Not recorded yet" when not | NOT STARTED | |
| TD-23 | The attendance snapshot shows, per batch, the rate of the last recorded session and the three lowest trainee rates. It uses the same rate rule as the Trainee Dashboard | NOT STARTED | Open question 1 |
| TD-24 | With no attendance rows the snapshot shows an empty state ("No attendance recorded yet"), not 0 percent and not an error | NOT STARTED | Table is empty today |
| TD-25 | The progress snapshot shows, per batch, outcomes passed out of assessed and the trainees with a failed outcome | NOT STARTED | |
| TD-26 | With no outcome rows the progress snapshot shows an empty state, not an error | NOT STARTED | Table is empty today |
| TD-27 | Coming up lists batches that start or end within the next 14 days, with the date and days left | NOT STARTED | Open question 4 |

### Empty states, performance and frontend

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TD-28 | A trainer with no batch sees a friendly empty state on every section and no error. The endpoint returns 200 | NOT STARTED | |
| TD-29 | The number of database queries is fixed. A trainer with 1 batch and a trainer with 20 batches and 600 trainees run the same number of queries | NOT STARTED | Measure with statement logging. Local timing is not Supabase timing |
| TD-30 | The page shows a loading state, and an error state with a retry button when the request fails | NOT STARTED | |
| TD-31 | The page works at phone width. Cards stack and nothing scrolls sideways | NOT STARTED | |
| TD-32 | The announcements widget stays, and the Announcements link opens `/trainer/announcements` | NOT STARTED | |
| TD-33 | The response has a typed shape shared by the service and the frontend, and constants (14 days, the three lowest) are in one place on each side | NOT STARTED | Config duplication check |
| TD-34 | The dashboard shows only data of the logged-in trainer after a login switch (log out, log in as another trainer, no stale data) | NOT STARTED | Clear the state on logout |

---

## Test Cases

### TC-01: Trainer login redirects to the dashboard
- **AC:** TD-1
- **Priority:** Critical
- **Steps:** Log in with a trainer account.
- **Expected:** Redirected to `/trainer/dashboard`.

### TC-02: Other roles are blocked
- **AC:** TD-3, TD-5, TD-6
- **Priority:** Critical
- **Steps:** Open the page as Admin, Registrar, Encoder and Trainee. Call the API with each token and with no token.
- **Expected:** Page goes to `/403`. API returns 403, and 401 with no token.

### TC-03: Trainer sees only own batches
- **AC:** TD-7, TD-8, TD-9
- **Priority:** Critical
- **Precondition:** Two trainers, each with a batch and trainees.
- **Steps:** Open the dashboard as trainer A. Call the API with `?trainer_id=<B>`.
- **Expected:** Only A's batches and trainees. The query value is ignored. No personal data fields in the response.

### TC-04: Needs my action counts
- **AC:** TD-11 to TD-13
- **Priority:** High
- **Precondition:** Two withdrawal requests at PENDING_VALIDATION in my batches, one in another trainer's batch.
- **Steps:** Open the dashboard. Validate one request and reload.
- **Expected:** Count is 2, then 1. The other trainer's request is never counted. Clearance shows 0 without error. At 0 and 0 the page says nothing is waiting.

### TC-05: Summary and batch cards
- **AC:** TD-14 to TD-19
- **Priority:** High
- **Precondition:** One open, one ongoing, one closed and one cancelled batch. One program without a schedule.
- **Steps:** Open the dashboard.
- **Expected:** Counts exclude the cancelled batch. Order is ongoing, open, closed. Progress bar is 0 before the start, 100 after the end. The program without a schedule shows "No schedule set". The card link opens Trainees for that batch.

### TC-06: Today's classes
- **AC:** TD-20 to TD-22
- **Priority:** High
- **Precondition:** An ongoing batch with a Monday and Wednesday schedule.
- **Steps:** Open the dashboard on a Monday, then on a Tuesday. Add a session with attendance for today.
- **Expected:** The class shows on Monday with the time, not on Tuesday. The chip changes from "Not recorded yet" to "Attendance recorded".

### TC-07: Time zone
- **AC:** TD-21
- **Priority:** Medium
- **Steps:** Run the service with the clock at 23:30 Asia/Manila (15:30 UTC) and at 00:30 Asia/Manila (16:30 UTC the day before).
- **Expected:** The weekday is the Manila weekday in both cases.

### TC-08: Attendance snapshot
- **AC:** TD-23, TD-24
- **Priority:** High
- **Precondition:** Seeded attendance for three sessions with different rates, and a batch with none.
- **Steps:** Open the dashboard.
- **Expected:** The rate of the last session and the three lowest trainees show. The rate matches the Trainee Dashboard for the same trainee. The empty batch shows "No attendance recorded yet", not 0 percent.

### TC-09: Progress snapshot
- **AC:** TD-25, TD-26
- **Priority:** Medium
- **Precondition:** Seeded outcome statuses (PASSED, FAILED, PENDING, NOT_YET_ASSESSED), and a batch with none.
- **Steps:** Open the dashboard.
- **Expected:** Passed out of assessed counts only PASSED and FAILED as assessed. Trainees with FAILED are listed. The empty batch shows an empty state.

### TC-10: Coming up
- **AC:** TD-27
- **Priority:** Low
- **Precondition:** Batches starting in 5 days, ending in 10 days and ending in 30 days.
- **Steps:** Open the dashboard.
- **Expected:** The first two are listed with days left. The third is not.

### TC-11: No batch
- **AC:** TD-28
- **Priority:** High
- **Precondition:** A trainer with no batch.
- **Steps:** Open the dashboard.
- **Expected:** 200, friendly empty states, no error, announcements still show.

### TC-12: Query count
- **AC:** TD-29
- **Priority:** High
- **Steps:** Turn on statement logging. Load the dashboard for a trainer with 1 batch, then for one with 20 batches and 600 trainees.
- **Expected:** The same number of queries in both. Record the timing and say it is local.

### TC-13: Loading, error and phone width
- **AC:** TD-30, TD-31
- **Priority:** Medium
- **Steps:** Throttle the network, then stop the API. Open the page at 375 px wide.
- **Expected:** A loading state, then an error state with Retry. At 375 px cards stack with no sideways scroll.

### TC-14: Switching accounts
- **AC:** TD-34
- **Priority:** Medium
- **Steps:** Open the dashboard as trainer A, log out, log in as trainer B.
- **Expected:** No data of A is visible at any moment.

---

## Summary: 4 PASS, 30 NOT STARTED (34 criteria), 14 test cases
