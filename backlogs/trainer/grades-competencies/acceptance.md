# Trainer: Grades and Competencies (Per-Program Setup and Grading)

| Field | Value |
|-------|-------|
| **Jira** | MP-69 |
| **Type** | Feature (new Trainer page, new endpoints, one migration) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Route** | `/trainer/grades` (the sidebar link "Grades" exists, the page does not) |
| **Backend** | `/api/trainer/competencies` (setup) and `/api/trainer/grades` (grading), both new |
| **Requirement** | FUNC-007 (competency and outcome tracking), REQ-4.7 in the capstone paper |
| **Depends on** | Class Management (MP-66, the batch status) |
| **Feeds** | Trainer Dashboard (MP-65, progress snapshot), Trainee Dashboard (MP-30, already reads these tables), Trainer clearance (MP-61, "assessments are done") |
| **Closes** | The items "staff can define competencies and learning outcomes" and "a trainer can record an outcome status" in `trainee/dashboard-data-gaps/acceptance.md` (MP-30 follow-up) |
| **Decided 2026-11-23** | The **trainer** defines the competencies and learning outcomes of the program. Grading is **Competent or Not Yet Competent per learning outcome**, no numeric scores. The trainer records the **assessment method** (written, practical, oral) per result. A Not Yet Competent trainee can be **reassessed any time**, and **every attempt is kept** |
| **TBA (to be announced)** | Six things are not decided: whether trainers of the same program **share one list**, whether the Admin must **approve** a trainer's setup, an **import** from the TESDA Training Regulations, **printing or exporting** the grade sheet, the exact **on-screen wording**, and whether grades can be **corrected after the batch is closed**. See the Open Questions |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** to set up the competencies and learning outcomes of my program and grade each trainee as Competent or Not Yet Competent, with how they were assessed,
**so that** the system knows each trainee's progress toward the qualification, whatever the course, and the dashboards and clearance can use it.

## Background

- Courses are not the same. A program is a TESDA qualification with its own units of competency, so the list of what is graded must be different for each program. That is what "dynamic" means here: nothing is fixed in the code, each program has its own list kept in the database.
- TESDA groups units of competency into **Basic** (needed in all sectors), **Common** (needed across one sector) and **Core** (specific to the qualification). The database already has these three categories. See the sources at the end.
- The interview says the Trainer grades the **written, practical and oral** parts needed for completion. The Trainer clearance (MP-61) has a check "the assessments are done" that is ticked by hand until this exists.
- No page lets anyone define competencies or grade anyone today.

## What the Database Has Today (and What Is Missing)

All four tables were checked on 2026-11-23 and are empty (the three category rows are lookup values).

| Table | Has | Missing |
|---|---|---|
| `competency_category` | `category_id`, `category_name` (BASIC, COMMON, CORE). 3 rows | Nothing needed |
| `competency` | `competency_id`, `program_id`, `category_id`, `competency_code` (varchar 10), `competency_title`, `sort_order`. Index on `program_id`. Deletes with the program | **No unique key** on (`program_id`, `competency_code`). No active flag. No update information |
| `learning_outcome` | `learning_outcome_id`, `competency_id`, `outcome_number`, `outcome_description`, `sort_order`. Index on `competency_id`. Deletes with the competency | **No unique key** on (`competency_id`, `outcome_number`). No active flag. No update information |
| `trainee_outcome_status` | `id`, `enrollment_id`, `learning_outcome_id`, `status` (PENDING, PASSED, FAILED, NOT_YET_ASSESSED, default PENDING), `date_checked`, `remarks`, `checked_by`. Index on `enrollment_id` | **No unique key** on (`enrollment_id`, `learning_outcome_id`), so one trainee can have two current results for one outcome. **No assessment method.** No attempt history |
| History | None | No record of setup changes or of attempts |

Other facts used in the design:
- `competency.program_id` is the owner, so the list belongs to the **program**, not to a batch. Every batch and every trainer of that program shares it.
- `competency_code` is 10 characters. Check it against real TESDA unit codes before the migration. If some are longer, the column is widened in the same migration (Open Question 7).
- The Trainee Dashboard (`users/trainee/dashboard/dashboard.service.ts`) already reads `competency`, `learning_outcome` and `trainee_outcome_status` in the order BASIC, COMMON, CORE.

## What the Trainer Can Do

### Part 1: Set up a program (the dynamic part)

1. Choose a program the trainer teaches. The structure shows by category: **Basic, Common, Core**.
2. **Add, edit, reorder and retire competencies** (code and title) inside a category.
3. **Add, edit, reorder and retire learning outcomes** of a competency (number and description).
4. A competency or outcome that already has results **cannot be deleted**. It can be **retired**: it is hidden from new grading, kept in all history, and can be reactivated. One with no results can be deleted.
5. Every change is written to the setup history.
6. Because the list belongs to the program, a **warning** shows how many trainees and batches use it before a new outcome is added or one is retired.

### Part 2: Grade a batch

1. Choose one of the trainer's batches. A **matrix**: trainees as rows, learning outcomes as columns, grouped by category and competency.
2. Each result is **Competent**, **Not Yet Competent** or not yet assessed, with the **assessment method** (written, practical or oral), the **date checked** and an optional remark.
3. **Bulk grading.** Pick one outcome and several trainees, set one result, method and date for all (for example after a group demonstration).
4. **Reassess.** A Not Yet Competent result can be graded again at any time. The new attempt is added to the history and becomes the current result.
5. **Competency result** is worked out, not typed (see Rules).
6. **Progress** per trainee and per batch: outcomes and competencies done out of the total, by category.
7. **History** of every attempt for a trainee and an outcome: who, when, method, result, remark.

### Words on screen (assumed)

| Database value | Shown as |
|---|---|
| `PASSED` | Competent |
| `FAILED` | Not Yet Competent |
| no row, or `NOT_YET_ASSESSED` | Not yet assessed |
| `PENDING` | In progress (the assessment was started, the result is not final) |

The wording is assumed from TESDA practice and is to be confirmed against the Training Regulations (Open Question 5).

## Rules

- **Who.** Only `TRAINER`. The trainer comes from the login, never from a query, body or path value.
- **Setup scope.** A trainer can set up a program only if they teach, or taught, a non-cancelled batch of it.
- **Grading scope.** A trainer grades only trainees (enrollments) in their own batches. Another trainer's batch returns 404.
- **Batch status.** Grading needs the batch to be `ONGOING`. After `CLOSED` it is read-only (assumed, the same as attendance, Open Question 6).
- **Who is graded.** Enrollments with status `ENROLLED`. A trainee who withdrew keeps earlier results, read-only.
- **Date checked.** Not in the future (Asia/Manila) and not before the batch start date.
- **Method.** One of `WRITTEN`, `PRACTICAL`, `ORAL`. Required for a Competent or Not Yet Competent result.
- **Attempts.** Each save of a result that changes the status, the method, the date or the remark adds one history row with the next attempt number. The current row holds the latest. A save that changes nothing writes nothing.
- **Changing a Competent result** to Not Yet Competent (a correction) needs a reason of 5 to 500 characters, logged.
- **Competency result** (worked out): **Competent** when every active outcome of the competency has a current result of Competent. **Not Yet Competent** when at least one active outcome is Not Yet Competent and the rest are not all Competent. **In progress** when some have a result and none is Not Yet Competent. **Not assessed** when none has a result. Retired outcomes are ignored.
- **Qualification progress** = competencies Competent out of active competencies, by category and in total. No score, no percentage grade.
- **One shared function** works out the competency result and the progress, and is used by the Trainer Dashboard (MP-65), the Trainee Dashboard (MP-30) and the Trainer clearance (MP-61), so the numbers always agree.
- **Setup edits and stale saves.** An edit carries the `updated_at` the trainer saw. If it changed (the other trainer of the program edited), the API returns 409 and changes nothing.
- **All or nothing.** A result, its history row and any update to the current row are saved in one transaction. A bulk grading is all or nothing.
- **History.** Both history tables are append-only. The application has no update or delete for them.

## Schema Proposal (one migration)

- `competency`: add `is_active` (boolean, default true), `updated_at`, `updated_by` (FK to users, nullable). Add **unique** (`program_id`, `competency_code`).
- `learning_outcome`: add `is_active`, `updated_at`, `updated_by`. Add **unique** (`competency_id`, `outcome_number`).
- `trainee_outcome_status`: add `assessment_method` (new enum `assessment_method_enum`: `WRITTEN`, `PRACTICAL`, `ORAL`, nullable) and `updated_at`. Add **unique** (`enrollment_id`, `learning_outcome_id`). It holds the **current** result only.
- New table `outcome_assessment_history`: `id`, `enrollment_id` (FK, cascade), `learning_outcome_id` (FK), `attempt_number`, `status`, `assessment_method`, `date_checked`, `remarks`, `reason`, `assessed_by` (FK to users), `assessed_at`. Index on (`enrollment_id`, `learning_outcome_id`, `attempt_number`). Append-only.
- New enum `competency_change_enum`: `CREATED`, `EDITED`, `RETIRED`, `REACTIVATED`, `REORDERED`, `DELETED`.
- New table `competency_setup_history`: `id`, `program_id` (FK), `entity_type` (`COMPETENCY` or `OUTCOME`), `entity_id`, `change_type`, `old_values` (jsonb), `new_values` (jsonb), `changed_by` (FK to users), `changed_at`. Index on (`program_id`, `changed_at` desc). Append-only.
- If real TESDA unit codes are longer than 10 characters, widen `competency_code` (Open Question 7).
- All tables are empty, so the migration is safe. Test it on a fresh database. Known issues: the `0_init` byte-order mark (TECH-02) and the drift (TECH-03).

## Endpoints (all `TRAINER` only, `JwtAuthGuard` and `RolesGuard`)

### Setup (`/api/trainer/competencies`)

| Method and path | What |
|---|---|
| `GET /programs` | The programs the trainer teaches, with counts of competencies and outcomes and whether grading has started |
| `GET /programs/:programId` | The structure by category, with active and retired items and the number of results on each |
| `POST /programs/:programId/competencies` | Add a competency (category, code, title) |
| `PATCH /competencies/:competencyId` | Edit code or title, with the `updated_at` the trainer saw |
| `POST /competencies/:competencyId/retire` and `/reactivate` | Retire or bring back |
| `DELETE /competencies/:competencyId` | Delete only when it and its outcomes have no results |
| `POST /competencies/:competencyId/outcomes` | Add a learning outcome |
| `PATCH /outcomes/:outcomeId`, `POST /outcomes/:outcomeId/retire`, `/reactivate`, `DELETE /outcomes/:outcomeId` | The same for outcomes |
| `PUT /programs/:programId/order` | Reorder competencies and outcomes |
| `GET /programs/:programId/impact` | How many trainees and batches use the list now (for the warning) |
| `GET /programs/:programId/history` | The setup history timeline |

### Grading (`/api/trainer/grades`)

| Method and path | What |
|---|---|
| `GET /batches` | My `ONGOING` batches (and batches with results) |
| `GET /batches/:batchId/matrix` | Trainees, active outcomes grouped by category and competency, the current results, the competency results and the progress |
| `PUT /batches/:batchId/results` | Save one or many results (also the bulk case), all or nothing |
| `GET /batches/:batchId/trainees/:enrollmentId` | One trainee's results and the attempt history |
| `GET /batches/:batchId/summary` | Progress per trainee and for the batch |

## Open Questions (TBA unless answered)

| # | Question | Answer or assumption |
|---|---|---|
| 1 | Who defines the competencies and outcomes? | **Answered 2026-11-23:** the trainer. Not the Admin |
| 2 | How are trainees graded? | **Answered 2026-11-23:** Competent or Not Yet Competent per learning outcome, no numbers |
| 3 | Is the assessment method recorded? | **Answered 2026-11-23:** yes, written, practical or oral, chosen per result. **Not chosen:** a rule that an outcome needs all three methods |
| 4 | What happens on Not Yet Competent? | **Answered 2026-11-23:** reassess any time, every attempt kept in a history |
| 5 | The wording on screen | **TBA.** Competent and Not Yet Competent are assumed from TESDA practice. Confirm against the Training Regulations of each program |
| 6 | Can grades be corrected after the batch is closed? | **TBA.** Assumed: no, read-only after `CLOSED` |
| 7 | Does `competency_code` (10 characters) fit real TESDA unit codes? | **TBA.** Check with real codes. Widen in the migration if not |
| 8 | Two trainers teach the same program. Do they share one list? | **Assumed:** yes, one list per program (the table is per program). The risk is two trainers editing one list. The protections are no delete after results, retire instead, the setup history, the impact warning and the stale-edit check. **TBA:** a per-batch list would need a different design |
| 9 | Must the Admin approve a trainer's setup before it is used? | **Assumed:** no. **TBA** |
| 10 | Can the structure be imported from the TESDA Training Regulations or a file? | **TBA.** Assumed: manual entry in this ticket |
| 11 | Can the grade sheet be printed or exported (as in MP-67)? | **TBA.** Not in this ticket |
| 12 | Does the Admin or Registrar see the structure or the grades? | **Assumed:** no, not in this ticket. The trainee sees their own on the Trainee Dashboard |
| 13 | What does `PENDING` mean? | **Assumed:** the assessment was started and the result is not final. Shown as In progress |

## Scope

- **Backend:** a trainer competencies module and a trainer grades module (controllers, services, DTOs); the one shared function for the competency result and progress; the migration with the two history tables.
- **Frontend:** the Grades & Competencies page with two tabs, Setup (the structure by category, add, edit, reorder, retire, history) and Grading (the matrix, bulk grading, the attempt history), kept in the URL.
- **Tests:** unit tests for both services (every unhappy path), the DTOs, the controllers (role, guards, the logged-in user passed on) and the shared function.

## Out of Scope

The Progress page (`/trainer/progress`), numeric grades or scores, an Admin or Registrar screen for competencies, the Graduating List, certificates (MP-64), printing or exporting the grade sheet (Open Question 11), a rule that an outcome needs all three methods, and filling the MP-61 clearance checks automatically.

---

## Acceptance Criteria

### Access and security

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GC-1 | Only `TRAINER` can open `/trainer/grades`. Other roles go to `/403` | NOT STARTED | `ProtectedRoute` |
| GC-2 | Every endpoint needs a login (401) and the `TRAINER` role (403 for Admin, Registrar, Encoder, Trainee) | NOT STARTED | Guards |
| GC-3 | A trainer sets up only programs they teach or taught (a non-cancelled batch of it). Any other program returns 404 on every setup call | NOT STARTED | |
| GC-4 | A trainer grades and reads results only for enrollments in their own batches. Another trainer's batch or enrollment returns 404 | NOT STARTED | Same rule as MP-48 and MP-50 |
| GC-5 | The trainer comes from the login. No query, body or path value picks a trainer. `assessed_by`, `updated_by` and `changed_by` come from the login, never from the body | NOT STARTED | `@CurrentUser()` |
| GC-6 | Responses have no password hash, email, contact number, address or birth date. Trainees appear by name and system ID only | NOT STARTED | Typed response |
| GC-7 | Input is validated: bad ids, a category that does not exist, a code or title that is empty or too long, an outcome number outside range, a status or method outside the enums, a remark or reason too long, extra fields | NOT STARTED | DTOs, `whitelist` |

### Setup: competencies and outcomes

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GC-8 | The setup shows the program's structure by category in the order Basic, Common, Core, with competencies and outcomes in `sort_order`. A program with nothing set up shows an empty state with an Add button | NOT STARTED | |
| GC-9 | The trainer can add a competency with category, code and title. Two competencies of one program with the same code are refused (409) | NOT STARTED | Unique key |
| GC-10 | The trainer can add a learning outcome with a number and a description. Two outcomes of one competency with the same number are refused (409) | NOT STARTED | Unique key |
| GC-11 | The trainer can edit a competency or an outcome. The edit carries the `updated_at` the trainer saw. A stale edit returns 409 and changes nothing | NOT STARTED | Two trainers of one program |
| GC-12 | The trainer can reorder competencies and outcomes. The order is kept and shown everywhere (matrix, Trainee Dashboard) | NOT STARTED | |
| GC-13 | A competency or outcome with no results can be deleted. One that has any result (current or history) returns 409 on delete and can only be retired | NOT STARTED | |
| GC-14 | Retiring hides the item from the matrix and from new grading, keeps every old result and history visible, and removes it from the progress totals. It can be reactivated | NOT STARTED | |
| GC-15 | Before adding or retiring in a program that is already being graded, the page shows how many trainees and batches are affected and asks to confirm | NOT STARTED | `GET .../impact` |
| GC-16 | Every setup change writes one `competency_setup_history` row with who, when, the type and the old and new values. A save that changes nothing writes nothing | NOT STARTED | |
| GC-17 | The setup history timeline of a program shows the changes newest first. The application has no update or delete for it | NOT STARTED | Append-only by convention, noted in the audit |
| GC-18 | A change to the setup and its history row are saved in one transaction. A failure leaves neither | NOT STARTED | |

### Grading

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GC-19 | Choosing one of my `ONGOING` batches shows the matrix: enrolled trainees as rows, active outcomes as columns grouped by category and competency, with the current results | NOT STARTED | |
| GC-20 | The trainer can set a result of Competent or Not Yet Competent with a method (written, practical, oral), a date checked and an optional remark. A result with no method returns 400 | NOT STARTED | Open question 3 |
| GC-21 | The date checked is not in the future (Asia/Manila) and not before the batch start date. Otherwise 400 | NOT STARTED | |
| GC-22 | Grading needs the batch to be `ONGOING`. A batch that is `OPEN`, `CLOSED` or `CANCELLED` returns 409 on save and the matrix is read-only | NOT STARTED | Open question 6 |
| GC-23 | Only `ENROLLED` trainees can be graded. A trainee who withdrew keeps earlier results, read-only. A result for an enrollment in another batch returns 400 | NOT STARTED | |
| GC-24 | A retired outcome cannot get a new result (409) | NOT STARTED | |
| GC-25 | **Bulk grading.** One outcome for several trainees with one result, method and date. It is all or nothing: if one row is refused none is saved | NOT STARTED | |
| GC-26 | A trainee has at most one current result per outcome. The unique key (`enrollment_id`, `learning_outcome_id`) holds, also when two saves arrive at the same moment | NOT STARTED | |
| GC-27 | A Not Yet Competent result can be graded again at any time. The new attempt becomes the current result and the earlier one stays in the history | NOT STARTED | Decided |
| GC-28 | Every save that changes a result writes one `outcome_assessment_history` row with the attempt number, status, method, date, remark, who and when. Attempt numbers go 1, 2, 3 without gaps for one trainee and outcome | NOT STARTED | |
| GC-29 | Changing Competent to Not Yet Competent needs a reason of 5 to 500 characters. Without it the API returns 400 | NOT STARTED | Correction |
| GC-30 | A save that changes nothing writes no history and does not change `updated_at` | NOT STARTED | No-op save |
| GC-31 | The attempt history of a trainee and an outcome shows every attempt newest first with who, when, method, result, remark and reason | NOT STARTED | |
| GC-32 | A stale save (the current result changed since it was loaded) returns 409 and changes nothing | NOT STARTED | |
| GC-33 | No numeric score or percentage grade exists anywhere in the page, the API or the database | NOT STARTED | Decided |

### Competency result and progress

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GC-34 | A competency is Competent when every active outcome has a current result of Competent. A competency with no active outcome is shown as "No outcomes set" and is not counted as Competent | NOT STARTED | |
| GC-35 | A competency with at least one Not Yet Competent outcome (and not all Competent) is Not Yet Competent. With results but none Not Yet Competent it is In progress. With no result it is Not assessed | NOT STARTED | |
| GC-36 | Retired outcomes and competencies are ignored in every result and total | NOT STARTED | |
| GC-37 | Progress shows, per trainee and for the batch, outcomes and competencies done out of the total, by category and overall | NOT STARTED | |
| GC-38 | The results and progress are worked out by **one shared function**. The Trainer Dashboard (MP-65), the Trainee Dashboard (MP-30) and the Trainer clearance (MP-61) use it and nowhere else is the rule written | NOT STARTED | |
| GC-39 | The Trainee Dashboard (MP-30) shows the new results and the on-screen wording without a change to its endpoint. A trainee sees only their own | NOT STARTED | Regression check |
| GC-40 | A trainee's results survive the setup changes: adding an outcome sets the competency back to In progress and does not delete any result | NOT STARTED | |

### Integrity and performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GC-41 | Both history tables are append-only. There is no update or delete route for either | NOT STARTED | By convention, noted in the audit |
| GC-42 | A result, its history row and the current row are saved together or not at all. A forced failure leaves nothing behind | NOT STARTED | One transaction |
| GC-43 | The matrix, the summary and the setup view run a fixed number of queries whatever the number of trainees, outcomes or competencies. Saving 30 trainees in bulk runs a fixed number of statements, not one per trainee | NOT STARTED | Statement logging. Local timing is not Supabase timing |
| GC-44 | The migration applies on a fresh database, `prisma migrate diff` shows no drift for the new objects, and it runs on the empty shared tables | NOT STARTED | TECH-02, TECH-03 known |
| GC-45 | A program deleted by an admin still deletes its competencies as today (cascade). The new history tables do not block it, or the behavior is stated in the audit | NOT STARTED | Foreign key check |

### Frontend

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GC-46 | The tab (Setup or Grading), the program, the batch and the filters are kept in the URL and survive a refresh | NOT STARTED | |
| GC-47 | Empty, loading and error states exist: no program, no competency, no trainee, no ONGOING batch, a failed save with the typed values kept | NOT STARTED | |
| GC-48 | The page warns before leaving with unsaved changes | NOT STARTED | |
| GC-49 | Results do not rely on color alone (labels or icons as well), the matrix is usable by keyboard, a wide matrix scrolls inside its own area with the trainee names fixed, and the page works at phone width | NOT STARTED | |
| GC-50 | Constants (method list, status labels, reason length, code and title limits) are in one place on each side, and the status and method lists match the database enums | NOT STARTED | Config duplication check |

---

## Test Cases

### TC-01: Access
- **AC:** GC-1, GC-2, GC-5
- **Priority:** Critical
- **Steps:** Open the page as Admin, Registrar, Encoder and Trainee. Call each endpoint with those tokens and with none. Send a body with `assessed_by` of another user.
- **Expected:** Page goes to `/403`. API returns 403, and 401 with no token. The `assessed_by` in the body is ignored and the saved row has the trainer's id.

### TC-02: Ownership
- **AC:** GC-3, GC-4, GC-6
- **Priority:** Critical
- **Precondition:** Two trainers with different programs and batches.
- **Steps:** As trainer A, open setup for A's program and B's program, and the matrix and a result for B's batch.
- **Expected:** A's program and batch work. B's program and B's batch return 404 for every call. No personal data fields in the responses.

### TC-03: Define a program from nothing
- **AC:** GC-8 to GC-10, GC-12, GC-16
- **Priority:** Critical
- **Precondition:** A program with no competency.
- **Steps:** Open setup. Add a Basic, a Common and a Core competency, each with two outcomes. Reorder. Add a duplicate code and a duplicate outcome number.
- **Expected:** The empty state shows first. The items appear by category in the chosen order. The duplicates return 409. Every change has a setup history row.

### TC-04: Two programs, two lists
- **AC:** GC-8, GC-9
- **Priority:** High
- **Steps:** Set up a different list for a second program.
- **Expected:** Each program shows only its own list, and the same competency code can exist in both programs.

### TC-05: Edit, retire and delete rules
- **AC:** GC-11, GC-13, GC-14, GC-36
- **Priority:** Critical
- **Precondition:** One outcome with a result, one with none.
- **Steps:** Try to delete both. Retire the one with a result. Look at the matrix and the progress. Reactivate it. Edit with a stale `updated_at`.
- **Expected:** The one with a result returns 409 on delete, the other deletes. Retiring hides it from the matrix and the totals, keeps its history, and it comes back on reactivate. The stale edit returns 409.

### TC-06: Impact warning
- **AC:** GC-15, GC-40
- **Priority:** Medium
- **Precondition:** A program with two batches and graded trainees.
- **Steps:** Add an outcome to the list.
- **Expected:** The page shows the number of trainees and batches affected and asks to confirm. After adding, the competency is In progress and no result is deleted.

### TC-07: Grade a trainee
- **AC:** GC-19 to GC-21
- **Priority:** Critical
- **Steps:** Open an ONGOING batch matrix. Grade an outcome Competent, practical, today. Try with no method, a future date, and a date before the batch start.
- **Expected:** The result saves and shows. The three bad saves return 400 and change nothing.

### TC-08: Batch status and roster rules
- **AC:** GC-22 to GC-24
- **Priority:** High
- **Steps:** Try to save on an `OPEN`, a `CLOSED` and a `CANCELLED` batch, for a withdrawn trainee, for an enrollment of another batch, and for a retired outcome.
- **Expected:** 409 for the batch statuses and the retired outcome, 400 for the withdrawn trainee and the other batch. The closed batch matrix is read-only.

### TC-09: Bulk grading
- **AC:** GC-25, GC-26
- **Priority:** High
- **Steps:** Select one outcome and 10 trainees, set Competent, oral. Then repeat with one trainee not in the batch.
- **Expected:** The first saves 10 results. The second saves none. No trainee has two current results for one outcome.

### TC-10: Reassessment and attempts
- **AC:** GC-27, GC-28, GC-30, GC-31
- **Priority:** Critical
- **Steps:** Grade Not Yet Competent (written). Reassess as Not Yet Competent (practical), then Competent (practical). Save again with no change.
- **Expected:** The current result is Competent. The history has attempts 1, 2, 3 in order with method, who and when. The no-change save adds nothing.

### TC-11: Correction of a Competent result
- **AC:** GC-29
- **Priority:** High
- **Steps:** Change a Competent result to Not Yet Competent with no reason, then with a reason.
- **Expected:** No reason returns 400. With a reason it saves and the history shows the reason.

### TC-12: Competency result and progress
- **AC:** GC-34 to GC-37
- **Priority:** Critical
- **Precondition:** A competency with 3 outcomes, and a competency with none.
- **Steps:** Grade 0, 1 Competent, 1 Competent plus 1 Not Yet Competent, then 3 Competent. Retire one outcome and check again.
- **Expected:** Not assessed, In progress, Not Yet Competent, Competent in that order. The empty competency shows "No outcomes set". The retired outcome is ignored in the totals. Progress by category and overall matches by hand.

### TC-13: One rule for every page
- **AC:** GC-38, GC-39
- **Priority:** High
- **Steps:** After grading, open the Trainee Dashboard as a trainee, the Trainer Dashboard progress snapshot and the Trainer clearance panel.
- **Expected:** The same numbers on every page. The trainee sees only their own.

### TC-14: Stale save and two at once
- **AC:** GC-11, GC-32, GC-26
- **Priority:** Critical
- **Steps:** Open the same trainee in two browsers and save in both. Fire two saves for the same new result at the same moment. Have two trainers of one program edit the same competency.
- **Expected:** The second save returns 409 and changes nothing. In the race one result row and one attempt exist. The second trainer's edit returns 409.

### TC-15: Transactions and history
- **AC:** GC-18, GC-41, GC-42
- **Priority:** High
- **Steps:** Force the history insert to fail during a result save and during a setup change. Look for update or delete routes for both history tables.
- **Expected:** Nothing is saved on a forced failure. No update or delete route exists.

### TC-16: Query count and migration
- **AC:** GC-43 to GC-45
- **Priority:** High
- **Steps:** Statement logging on. Load the matrix for 5 trainees and 20 outcomes, then 30 trainees and 120 outcomes. Bulk grade 5 and 30 trainees. Apply all migrations to an empty database and run `prisma migrate diff`. Delete a program that has competencies in a test database.
- **Expected:** The same number of queries and statements in both sizes. No drift for the new objects. The program deletes as before or the behavior is stated.

### TC-17: Screen behaviour
- **AC:** GC-46 to GC-49
- **Priority:** Medium
- **Steps:** Pick a tab, program and batch, then refresh. Edit and try to leave. Stop the API and save. Open with no program set up. Tab through the matrix. Open at 375 px wide.
- **Expected:** The choices survive the refresh. A warning shows before leaving with changes. The failed save keeps the typed values and shows an error. The empty states show. The matrix works by keyboard, has labels as well as colors, and scrolls inside its area.

---

## Sources

- [TESDA TVET Glossary of Terms, 4th Edition](https://www.tesda.gov.ph/uploads/File/RelatedTvetInfo/The%20TVET%20Glossary%20of%20Terms,%204th%20Edition.pdf). Defines basic competencies (needed in all sectors), common competencies (needed across one sector) and core competencies (specific to the qualification).
- [TESDA 2024 TVET Glossary](https://www.tesda.gov.ph/Uploads/File/Glossary/2024%20TVET%20Glossary.pdf).
- [TESDA Training Regulations](https://tesda.gov.ph/Download/Training_Regulations?page=10). Each qualification's regulation lists its units of competency and is the basis for the curriculum and the competency assessment.
- [Example Training Regulations (Training Methodology Level I)](https://tesda.gov.ph/Downloadables/TR%20Trainers%20Methodology%20Level%20I%20(TrainorAssessor).pdf).

Searched 2026-11-23. The search confirmed the three categories and that the Training Regulations are the basis for competency assessment. It did **not** confirm the exact "Competent / Not Yet Competent" wording or a fixed list of assessment methods. The assessment methods in this file (written, practical, oral) come from the interview with MCCTEST (see the Trainer clearance, MP-61), and the wording is Open Question 5.

---

## Summary: 0 PASS, 50 NOT STARTED (50 criteria), 17 test cases
