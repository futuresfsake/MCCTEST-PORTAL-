# MP-30 follow-up: Trainee — Dashboard sections that are not functional (no data entry exists)

| Field        | Value                                                                              |
|--------------|------------------------------------------------------------------------------------|
| Type         | Gap / follow-up to MP-30 (Jira ticket to be created)                               |
| Status       | **NOT STARTED**                                                                    |
| Discovered   | 2026-11-03                                                                         |
| Affects      | Trainee dashboard (`/trainee/dashboard`): Attendance Summary, Competency Outcomes, Upcoming Sessions |
| Related      | MP-30 (trainee dashboard), trainer pages Attendance, Progress, Grades & Competencies (NOT STARTED) |
| Assignee     | Unassigned                                                                         |

---

## Problem

Three sections on the trainee dashboard cannot show anything, and nothing in the system can make
them show anything. They are built to *read* attendance, competencies and sessions, but no part of
the app can *create* that data. The trainee always sees the empty state.

This is a missing upstream feature, not a bug in the dashboard. The dashboard code works: it
handles empty data and shows "No attendance records yet", "No outcomes assessed yet" and "No
upcoming sessions".

### What the trainee sees today

| Dashboard section | What it reads | What the trainee sees |
|-------------------|---------------|-----------------------|
| Attendance Summary | `attendance` joined to `training_session` | "No attendance records yet" |
| Competency Outcomes | `competency`, `learning_outcome`, `trainee_outcome_status` for the program | "No outcomes assessed yet" |
| Upcoming Sessions | `training_session` for the batch from today onward | "No upcoming sessions" |
| Schedule (on the enrollment card) | `program_schedule` (the program's recurring weekly times) | Works, shows days and times |

### Evidence (dev database, 2026-11-03)

| Table | Rows | Meaning |
|-------|------|---------|
| `training_session` | **0** | No dated sessions exist for any batch |
| `attendance` | **0** | No attendance has been taken |
| `competency` | **0** | No competencies are defined for any program |
| `learning_outcome` | **0** | No learning outcomes are defined |
| `trainee_outcome_status` | **0** | No outcome has been assessed for any trainee |
| `competency_category` | 3 | Lookup values only |
| `program_schedule` | 10 | Recurring weekly schedules exist and display |
| `batch` | 7 | |
| `enrollments` | 13 | |

### Why the tables are empty

- No code writes to these tables. Nothing in the backend creates or updates a training session,
  an attendance record, a competency, a learning outcome or an outcome status.
- There are no endpoints for them. The only controller with "sessions" in its name is the login
  session one (`/sessions/expires`), which is unrelated.
- The database seed does not create any of them.
- The trainer pages that would record this are **not started**: Attendance, Progress, and
  Grades & Competencies (listed in the trainer sidebar, no page behind them).
- There is no admin screen to define competencies and learning outcomes for a program.

### Why Upcoming Sessions is empty even though schedules exist

The dashboard shows upcoming sessions from `training_session` (dated sessions). It does not
generate them from the program's recurring `program_schedule`. So a program with a Monday and
Wednesday schedule still shows "No upcoming sessions" until someone creates dated sessions.

### Why MP-30 reported all PASS

The MP-30 criteria checked that each section loads and shows the correct empty state. They did not
check that real data can reach the sections. This follow-up covers that.

---

## Acceptance Criteria

### Sessions and schedules

| # | Criteria | Status |
|---|---------|--------|
| 1 | A batch has dated training sessions, created by staff or generated from the program's recurring schedule between the batch's start and end dates | NOT STARTED |
| 2 | A trainee sees their batch's next sessions (up to 5) under Upcoming Sessions, with date and time | NOT STARTED |
| 3 | Past sessions never appear under Upcoming Sessions | NOT STARTED |
| 4 | Changing or cancelling a session updates what the trainee sees | NOT STARTED |

### Attendance

| # | Criteria | Status |
|---|---------|--------|
| 5 | A trainer can mark each enrolled trainee present, late, absent or excused for a session of their own batch | NOT STARTED |
| 6 | A trainer cannot mark attendance for a batch that is not theirs (403) | NOT STARTED |
| 7 | The trainee's Attendance Summary shows totals and the recent sessions with their status | NOT STARTED |
| 8 | Attendance cannot be entered twice for the same trainee and session | NOT STARTED |

### Competencies and outcomes

| # | Criteria | Status |
|---|---------|--------|
| 9 | Staff can define competencies and learning outcomes for a program, grouped by the existing categories | NOT STARTED |
| 10 | A trainer can record an outcome status for a trainee in their own batch | NOT STARTED |
| 11 | The trainee's Competency Outcomes section lists the program's competencies with each outcome's status | NOT STARTED |
| 12 | A trainee sees only their own outcomes | NOT STARTED |

### Data and quality

| # | Criteria | Status |
|---|---------|--------|
| 13 | Demo data (sessions, attendance, competencies, outcomes) exists so each dashboard section can be shown | NOT STARTED |
| 14 | Role tests cover every new write endpoint | NOT STARTED |
| 15 | The trainee dashboard shows real data for a trainee with attendance, sessions and outcomes (browser check) | NOT STARTED |

---

## Open Questions

| # | Question |
|---|----------|
| Q1 | Who creates the dated sessions: the registrar, the admin, the trainer, or are they generated from the program schedule? |
| Q2 | Is attendance taken per session by the trainer only, or can staff correct it? |
| Q3 | Who defines the competencies and learning outcomes for each program, and are they taken from a TESDA standard? |
| Q4 | Which outcome statuses are used (the `outcome_status_enum` values), and who may change one after it is set? |

## Test Cases

### TC-01: Sections are empty today
- **Precondition:** Logged in as a trainee with an enrollment (for example `tes.delacruz_mcctest`)
- **Steps:** Open `/trainee/dashboard`
- **Expected now:** Attendance Summary, Competency Outcomes and Upcoming Sessions show their empty states; the enrollment card shows the program's schedule

### TC-02: Upcoming sessions appear
- **AC:** #1, #2, #3
- **Steps:** Create sessions for the trainee's batch, some in the past and some in the future; open the dashboard
- **Expected:** Only future sessions are listed, soonest first, at most 5

### TC-03: Attendance reaches the trainee
- **AC:** #5, #7
- **Steps:** As the batch's trainer, mark the trainee present and absent for two sessions; open the trainee dashboard
- **Expected:** The summary shows the counts and the two sessions with their status

### TC-04: Trainer cannot touch another trainer's batch
- **AC:** #6
- **Steps:** As trainer A, mark attendance for a session of trainer B's batch
- **Expected:** 403

### TC-05: Outcomes reach the trainee
- **AC:** #9, #10, #11, #12
- **Steps:** Define a competency with outcomes for the trainee's program; as the trainer set one outcome for the trainee; open the dashboard as that trainee and as another trainee
- **Expected:** The first trainee sees the outcome and its status; the second sees none of the first's results
