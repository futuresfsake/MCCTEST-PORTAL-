# Sprint Acceptance Tickets: MP-7, MP-17, MP-27, MP-34

These Jira tickets hold the acceptance criteria of a whole sprint or module. Copied from Jira on 2026-11-27. Per-module results stay in each module folder.

**Status key:** NOT VERIFIED means the criterion has not been checked for this file. It does not mean it fails.

---

## Acceptance Criteria

## MP-7: Acceptance Criteria After MP 4,5,6

Jira status on 2026-11-27: **Done**. 8 criteria.

### Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---|---|---|
| S1-1 | Landing page renders with login form embedded | NOT VERIFIED | |
| S1-2 | Successful login redirects to the correct role dashboard | NOT VERIFIED | |
| S1-3 | Wrong credentials shows an error message on the form | NOT VERIFIED | |
| S1-4 | Page refresh keeps the user logged in | NOT VERIFIED | |
| S1-5 | Expired token is silently refreshed without logging the user out | NOT VERIFIED | |
| S1-6 | Logout clears everything and returns to landing page | NOT VERIFIED | |
| S1-7 | A non-admin trying to access `/admin/dashboard` gets redirected | NOT VERIFIED | |
| S1-8 | Admin can log in using the seeded account and sees the Admin Dashboard | NOT VERIFIED | |

## MP-17: TASK 6 - Acceptance Criteria

Jira status on 2026-11-27: **Done**. 50 criteria.

### Authentication & Access Control

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-1 | No page is accessible without a valid JWT session — all protected routes redirect to `/login` when unauthenticated | NOT VERIFIED | |
| S2-2 | Each role can only access their own role's routes — cross-role access redirects to `/403` | NOT VERIFIED | |
| S2-3 | Deactivated staff accounts cannot log in even with valid credentials | NOT VERIFIED | |
| S2-4 | JWT guard + RolesGuard is enforced on every single backend endpoint across all 5 tasks — no unguarded route exists | NOT VERIFIED | |
| S2-5 | Tokens are not exposed in URLs, localStorage plaintext, or console logs | NOT VERIFIED | |

### 🧭 Navigation & Routing

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-6 | Sidebar renders correctly for all 5 roles — each role only sees their own nav links, no bleed between roles | NOT VERIFIED | |
| S2-7 | Active route is visually highlighted in the sidebar on every page | NOT VERIFIED | |
| S2-8 | All role routes are registered in `AppRouter.tsx` and resolve without 404 | NOT VERIFIED | |
| S2-9 | `/403` page renders and does not loop or crash | NOT VERIFIED | |
| S2-10 | Browser back/forward navigation does not break auth state or route guards | NOT VERIFIED | |
| S2-11 | Page refresh on any protected route does not log the user out if session is still valid | NOT VERIFIED | |

### 🖥️ Frontend — General

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-12 | No page crashes or throws a console error on load, navigation, or form interaction | NOT VERIFIED | |
| S2-13 | All tables show an empty state when no data exists — no blank white boxes | NOT VERIFIED | |
| S2-14 | All modals open, close, and re-open without stale data from a previous session | NOT VERIFIED | |
| S2-15 | All dropdowns (program, trainer, batch) pull live data from the API — no hardcoded values | NOT VERIFIED | |
| S2-16 | All form validations fire before any API call is made — required fields, format checks | NOT VERIFIED | |
| S2-17 | Success and error toasts appear for every create, update, and status change action | NOT VERIFIED | |
| S2-18 | UI is consistent across all role pages — same layout shell, same sidebar, same spacing | NOT VERIFIED | |

### ⚙️ Backend — General

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-19 | All endpoints return correct HTTP status codes — `200`, `201`, `400`, `401`, `403`, `404`, `409` where applicable | NOT VERIFIED | |
| S2-20 | No endpoint returns a raw Prisma error or stack trace to the client | NOT VERIFIED | |
| S2-21 | All DTOs validate input — invalid payloads return `400` with a readable message | NOT VERIFIED | |
| S2-22 | Filters work correctly on all list endpoints — no filter returns unfiltered full data | NOT VERIFIED | |

### 📋 Programs (Task 2)

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-23 | Program list loads with correct data and pagination | NOT VERIFIED | |
| S2-24 | Create and edit use the same modal — edit pre-fills all existing fields correctly | NOT VERIFIED | |
| S2-25 | Archiving a program does not delete it — it remains in the list with `archived` status | NOT VERIFIED | |
| S2-26 | Archived programs cannot be selected in the Batch Creation dropdown | NOT VERIFIED | |

### 👥 Staff Accounts (Task 3)

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-27 | Creating a staff account creates both a Supabase Auth user and a `users` table row — both exist or neither does | NOT VERIFIED | |
| S2-28 | If Supabase Auth creation succeeds but DB insert fails, the Supabase user is deleted (compensating logic) | NOT VERIFIED | |
| S2-29 | Duplicate email on create returns a `409` — no partial records are left in either Supabase or the DB | NOT VERIFIED | |
| S2-30 | Password reset email is actually sent and arrives — verified in at least one end-to-end test | NOT VERIFIED | |
| S2-31 | Role dropdown on staff form only shows `registrar`, `trainer`, `encoder` — admin and trainee are not options | NOT VERIFIED | |

### 📦 Batch Configuration (Task 4)

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-32 | Batch code is generated by the DB trigger — the service does not generate or accept it as input | NOT VERIFIED | |
| S2-33 | Batch status cannot go backward — attempting `ongoing → upcoming` returns `400` | NOT VERIFIED | |
| S2-34 | Slot counter reflects real-time enrollment count, not a cached or stale value | NOT VERIFIED | |
| S2-35 | Batches with status `completed` cannot be enrolled into | NOT VERIFIED | |
| S2-36 | Trainer dropdown only shows active staff with role `trainer` | NOT VERIFIED | |

### 📝 Enrollment Form (Task 5)

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-37 | Wizard state is fully preserved when navigating between all 5 steps in any direction | NOT VERIFIED | |
| S2-38 | Trainee search queries the DB — it does not search a local/cached list | NOT VERIFIED | |
| S2-39 | Selecting an existing trainee pre-fills all trainee fields — fields are editable after pre-fill | NOT VERIFIED | |
| S2-40 | OR number is generated server-side — it is never editable on the frontend | NOT VERIFIED | |
| S2-41 | `id_card_number` is stored on the `enrollments` table, not the `trainee` table | NOT VERIFIED | |
| S2-42 | Full enrollment (trainee upsert + enrollment row + requirement rows) is atomic — if any part fails, nothing is saved | NOT VERIFIED | |
| S2-43 | Enrolling into a full batch (0 slots remaining) returns `400` — slot count is checked at submit time, not just on load | NOT VERIFIED | |
| S2-44 | Duplicate enrollment (same trainee + same batch) returns `409` with a clear message | NOT VERIFIED | |

### 🌿 Branch & Deployment

| # | Criteria | Status | Notes |
|---|---|---|---|
| S2-45 | All 5 feature branches have been merged to `qa` with at least one PR review approval | NOT VERIFIED | |
| S2-46 | No merge conflicts exist on `qa` | NOT VERIFIED | |
| S2-47 | All features work end-to-end on the `qa` environment — frontend hits the correct backend URLs | NOT VERIFIED | |
| S2-48 | No `.env` secrets are committed to any branch | NOT VERIFIED | |
| S2-49 | `staging` branch is updated from `qa` only after full QA sign-off above | NOT VERIFIED | |
| S2-50 | `main` is not touched until `staging` UAT is confirmed | NOT VERIFIED | |

## MP-27: Acceptance Criteria For SPRINT 3

Jira status on 2026-11-27: **Done**. 96 criteria.

### Applies to ALL tasks (TASK-06 to TASK-10)

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-1 | No page is accessible without a valid JWT session — all protected routes redirect to `/login` when unauthenticated | NOT VERIFIED | |
| S3-2 | Each role can only access their own role's routes — cross-role access redirects to `/403` | NOT VERIFIED | |
| S3-3 | JWT guard + RolesGuard is enforced on every single backend endpoint across all 5 tasks — no unguarded route exists | NOT VERIFIED | |
| S3-4 | Tokens are not exposed in URLs, localStorage plaintext, or console logs | NOT VERIFIED | |
| S3-5 | Deactivated accounts cannot access any endpoint even with a valid token | NOT VERIFIED | |
| S3-6 | Sidebar renders correctly for `ADMIN` and `REGISTRAR` roles — each role only sees their own nav links, no bleed between roles | NOT VERIFIED | |
| S3-7 | Active route is visually highlighted in the sidebar on every page | NOT VERIFIED | |
| S3-8 | All role routes are registered in `AppRouter.tsx` and resolve without 404 | NOT VERIFIED | |
| S3-9 | Browser back/forward navigation does not break auth state or route guards | NOT VERIFIED | |
| S3-10 | Page refresh on any protected route does not log the user out if session is still valid | NOT VERIFIED | |
| S3-11 | No page crashes or throws a console error on load, navigation, or form interaction | NOT VERIFIED | |
| S3-12 | All tables show an empty state when no data exists — no blank white boxes | NOT VERIFIED | |
| S3-13 | All modals open, close, and re-open without stale data from a previous session | NOT VERIFIED | |
| S3-14 | All dropdowns pull live data from the API — no hardcoded values | NOT VERIFIED | |
| S3-15 | All form validations fire before any API call is made — required fields, format checks | NOT VERIFIED | |
| S3-16 | Success and error toasts appear for every create, update, and status change action | NOT VERIFIED | |
| S3-17 | UI is consistent across all role pages — same layout shell, same sidebar, same spacing | NOT VERIFIED | |
| S3-18 | All endpoints return correct HTTP status codes — `200`, `201`, `400`, `401`, `403`, `404`, `409` where applicable | NOT VERIFIED | |
| S3-19 | No endpoint returns a raw Prisma error or stack trace to the client | NOT VERIFIED | |
| S3-20 | All DTOs validate input — invalid payloads return `400` with a readable message | NOT VERIFIED | |
| S3-21 | Filters work correctly on all list endpoints — no filter returns unfiltered full data | NOT VERIFIED | |

### 📋 TASK-06 — Admin: Batch Management: 🖥️ Frontend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-22 | Batch list table shows: batch name, program, trainer, capacity, start/end date, status, actions | NOT VERIFIED | |
| S3-23 | Empty state renders when no batches exist — no blank white box | NOT VERIFIED | |
| S3-24 | Create batch modal has: program dropdown, trainer dropdown, capacity, start date, end date, remarks | NOT VERIFIED | |
| S3-25 | Program and trainer dropdowns pull live data from the API — no hardcoded values | NOT VERIFIED | |
| S3-26 | `batch_name` field is optional in the form — if left blank, DB trigger auto-generates it; generated name reflects immediately after save | NOT VERIFIED | |
| S3-27 | Batch status chip renders correctly: `OPEN` / `ONGOING` / `CLOSED` / `CANCELLED` with distinct colors | NOT VERIFIED | |
| S3-28 | Edit modal pre-fills all existing fields correctly | NOT VERIFIED | |
| S3-29 | Status can be manually updated via dropdown — triggers a confirmation dialog before saving | NOT VERIFIED | |
| S3-30 | All form validations fire before API call — required fields, date range checks (end date must be after start date) | NOT VERIFIED | |

### 📋 TASK-06 — Admin: Batch Management: ⚙️ Backend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-31 | `POST /admin/batch` — creates batch; `batch_name` optional, trigger handles generation | NOT VERIFIED | |
| S3-32 | `GET /admin/batch` — paginated list with filters: program, trainer, status | NOT VERIFIED | |
| S3-33 | `GET /admin/batch/:id` — single batch detail | NOT VERIFIED | |
| S3-34 | `PATCH /admin/batch/:id` — update batch fields and/or status | NOT VERIFIED | |
| S3-35 | Invalid date range (end before start) returns `400` with readable message | NOT VERIFIED | |
| S3-36 | Assigning a trainer not in the `trainer` table returns `404` | NOT VERIFIED | |
| S3-37 | Assigning a program that is archived/inactive returns `400` | NOT VERIFIED | |

### 👥 TASK-07 — Admin: Batch Trainee Management: 🖥️ Frontend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-38 | Page is scoped to a specific batch — navigated to from the batch list via "View Trainees" action | NOT VERIFIED | |
| S3-39 | Trainee list table shows: full name, ID card number, enrollment status, uniform size, requirement checklist status, distribution checklist status | NOT VERIFIED | |
| S3-40 | Empty state renders when batch has no trainees yet | NOT VERIFIED | |
| S3-41 | Enrollment status chip renders correctly: `PENDING` / `ENROLLED` / `WITHDRAWN` / `COMPLETED` / `DROPPED` with distinct colors | NOT VERIFIED | |
| S3-42 | Admin can update enrollment status per trainee via dropdown — confirmation dialog before save | NOT VERIFIED | |
| S3-43 | `id_card_number` is read-only — auto-generated by DB trigger on enrollment insert, never editable | NOT VERIFIED | |
| S3-44 | Clicking a trainee row opens a detail drawer/modal showing full trainee profile fields from `trainee` table | NOT VERIFIED | |
| S3-45 | Requirement checklist status shown as complete/incomplete per enrollment | NOT VERIFIED | |
| S3-46 | Distribution checklist status shown as given/not given per enrollment | NOT VERIFIED | |

### 👥 TASK-07 — Admin: Batch Trainee Management: ⚙️ Backend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-47 | `GET /admin/batch/:batchId/trainees` — paginated list of enrolled trainees in batch with filters: enrollment status | NOT VERIFIED | |
| S3-48 | `GET /admin/batch/:batchId/trainees/:enrollmentId` — full detail: trainee profile + enrollment + checklists | NOT VERIFIED | |
| S3-49 | `PATCH /admin/batch/:batchId/trainees/:enrollmentId/status` — update `enrollment_status` | NOT VERIFIED | |
| S3-50 | Changing status to `WITHDRAWN` or `DROPPED` requires `exit_reason` in body — returns `400` if missing | NOT VERIFIED | |
| S3-51 | Filtering by enrollment status returns only matching rows — no unfiltered full data leak | NOT VERIFIED | |

### 🎓 TASK-08 — Registrar: Student Information Interface: 🖥️ Frontend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-52 | Searchable trainee list table shows: full name, contact number, municipality, employment status, gender | NOT VERIFIED | |
| S3-53 | Search filters: name (partial match), municipality, gender, employment status | NOT VERIFIED | |
| S3-54 | Empty state renders when no trainee matches search — no blank white box | NOT VERIFIED | |
| S3-55 | Clicking a trainee opens a full detail page (not modal) showing all `trainee` table fields | NOT VERIFIED | |
| S3-56 | Age is computed and displayed using `trainee_age(date_of_birth)` — never editable, never stored | NOT VERIFIED | |
| S3-57 | Enrollment history section shows all past and current enrollments: program, batch name, enrollment status, ID card number, enrolled date | NOT VERIFIED | |
| S3-58 | Beneficiaries section shows all rows from `trainee_beneficiaries` for that trainee | NOT VERIFIED | |
| S3-59 | Registrar can edit trainee profile fields — all fields pre-filled on edit | NOT VERIFIED | |

### 🎓 TASK-08 — Registrar: Student Information Interface: ⚙️ Backend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-60 | `GET /registrar/students` — paginated + searchable list; filters: name, municipality, gender, employment status | NOT VERIFIED | |
| S3-61 | `GET /registrar/students/:traineeId` — full trainee profile + enrollment history + beneficiaries | NOT VERIFIED | |
| S3-62 | `PATCH /registrar/students/:traineeId` — update trainee profile fields | NOT VERIFIED | |
| S3-63 | Age is never accepted as a field in the DTO — computed server-side only via SQL function | NOT VERIFIED | |
| S3-64 | `GET` on non-existent trainee returns `404` | NOT VERIFIED | |
| S3-65 | `PATCH` with invalid enum value (e.g. bad `civil_status`) returns `400` with readable message | NOT VERIFIED | |

### 💰 TASK-09 — Registrar: Payment / Official Receipt Interface: 🖥️ Frontend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-66 | Receipt list table shows: OR number, trainee name, batch, payment reason, amount, payment method, payment date, confirmed by | NOT VERIFIED | |
| S3-67 | Filters: payment reason, payment method, batch, date range | NOT VERIFIED | |
| S3-68 | Empty state renders when no receipts exist for selected filters | NOT VERIFIED | |
| S3-69 | Create receipt form fields: enrollment (searchable dropdown), base fee, amount, payment date, payment method, reason of dues, remarks | NOT VERIFIED | |
| S3-70 | Enrollment dropdown searches by trainee name or batch name — no hardcoded values | NOT VERIFIED | |
| S3-71 | `or_number` is not shown on the create form — system-generated by NestJS service, displayed only after save | NOT VERIFIED | |
| S3-72 | Payment method renders as: `CASH` / `GCASH` / `BANK_TRANSFER` / `CHECK` | NOT VERIFIED | |
| S3-73 | Payment reason renders as: `ENROLLMENT` / `PROCESSING_FEE` / `UNIFORM_ID_FEE` / `ASSESSMENT_DEPOSIT` / `EXTERNAL_FEES` | NOT VERIFIED | |
| S3-74 | Registrar can confirm a receipt (`confirmed_by`) — confirmation triggers a status update, not a delete/re-create | NOT VERIFIED | |
| S3-75 | Clicking a receipt row opens a read-only detail modal — OR number is never editable | NOT VERIFIED | |

### 💰 TASK-09 — Registrar: Payment / Official Receipt Interface: ⚙️ Backend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-76 | `POST /registrar/payment` — creates official receipt; NestJS generates `or_number` before insert using format `OR-{YYYY}-{SEQ:000006}` | NOT VERIFIED | |
| S3-77 | `GET /registrar/payment` — paginated list with filters: reason, method, batch, date range | NOT VERIFIED | |
| S3-78 | `GET /registrar/payment/:id` — single receipt detail | NOT VERIFIED | |
| S3-79 | `PATCH /registrar/payment/:id/confirm` — sets `confirmed_by` to current user; only registrar can confirm | NOT VERIFIED | |
| S3-80 | `or_number` is never accepted from the request body — always server-generated; DTO must exclude it | NOT VERIFIED | |
| S3-81 | Duplicate OR number returns `409` — no partial records left | NOT VERIFIED | |
| S3-82 | Non-existent `enrollment_id` returns `404` | NOT VERIFIED | |
| S3-83 | Amount of `0` or negative returns `400` | NOT VERIFIED | |

### 👤 TASK-10 — Trainee Account Generation After Enrollment: 🖥️ Frontend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-84 | "Generate Account" button appears on trainee detail page only when: enrollment exists with `status = ENROLLED` AND `trainee.users_id IS NULL` | NOT VERIFIED | |
| S3-85 | Button is hidden/disabled if trainee already has an account (`users_id` is not null) | NOT VERIFIED | |
| S3-86 | Clicking "Generate Account" triggers a confirmation dialog before proceeding | NOT VERIFIED | |
| S3-87 | After successful generation, button is replaced with a read-only "Account Active" indicator | NOT VERIFIED | |
| S3-88 | Generated credentials (temporary password) are shown in a one-time modal after creation — registrar is responsible for handing this to the trainee | NOT VERIFIED | |
| S3-89 | Credentials modal cannot be reopened after close — one-time display only | NOT VERIFIED | |

### 👤 TASK-10 — Trainee Account Generation After Enrollment: ⚙️ Backend

| # | Criteria | Status | Notes |
|---|---|---|---|
| S3-90 | `POST /registrar/trainee-account/:traineeId/generate` — generates Supabase Auth user + `users` table row + links `trainee.users_id` | NOT VERIFIED | |
| S3-91 | Account generation only proceeds if trainee has at least one enrollment with `status = ENROLLED` — returns `400` otherwise | NOT VERIFIED | |
| S3-92 | If trainee already has a `users_id`, returns `409` — no duplicate account creation | NOT VERIFIED | |
| S3-93 | Supabase Auth user is created first; if `users` table insert fails, Supabase Auth user is deleted (compensating logic — same pattern as TASK-03) | NOT VERIFIED | |
| S3-94 | Generated account has: `role = TRAINEE`, `is_active = TRUE`, temporary password system-generated, returned once in response, never stored in plaintext | NOT VERIFIED | |
| S3-95 | Temporary password is never logged server-side | NOT VERIFIED | |
| S3-96 | Non-existent `traineeId` returns `404` | NOT VERIFIED | |

## MP-34: Enrollment Acceptance Criteria

Jira status on 2026-11-27: **Done**. 35 criteria.

### 1. Trainee information

| # | Criteria | Status | Notes |
|---|---|---|---|
| EN-1 | The registrar can enter all required trainee information. | NOT VERIFIED | |
| EN-2 | Required fields must be validated before submission. | NOT VERIFIED | |
| EN-3 | The date of birth must: Use the format `YYYY-MM-DD`.; Be a valid calendar date.; Not be a future date. | NOT VERIFIED | |
| EN-4 | Contact numbers must use the accepted Philippine contact-number format. | NOT VERIFIED | |
| EN-5 | Invalid or incomplete information prevents enrollment submission and displays an error. | NOT VERIFIED | |

### 2. Beneficiary information

| # | Criteria | Status | Notes |
|---|---|---|---|
| EN-6 | The registrar can enter one beneficiary for the trainee. | NOT VERIFIED | |
| EN-7 | Required beneficiary fields must be completed. | NOT VERIFIED | |
| EN-8 | The beneficiary is saved using the existing `trainee_beneficiaries` table. | NOT VERIFIED | |
| EN-9 | If the trainee already has a beneficiary, the existing beneficiary record is updated instead of creating a duplicate record. | NOT VERIFIED | |
| EN-10 | No new database table or schema structure is required. | NOT VERIFIED | |

### 3. Training batch selection

| # | Criteria | Status | Notes |
|---|---|---|---|
| EN-11 | The system fetches available batches from the database when the batch-selection step loads. | NOT VERIFIED | |
| EN-12 | Only batches meeting all of the following criteria are displayed: `batch_status = OPEN`; The batch end date is today or later.; The batch has remaining capacity.; The batch does not conflict with the trainee’s existing enrollment schedule.; The trainee is not already enrolled in the selected batch. | NOT VERIFIED | |
| EN-13 | The registrar can manually refresh the available batch list. | NOT VERIFIED | |
| EN-14 | Newly created eligible batches appear after refreshing the list or reopening the batch-selection step. | NOT VERIFIED | |

### 4. Enrollment submission

| # | Criteria | Status | Notes |
|---|---|---|---|
| EN-15 | The registrar cannot submit an enrollment without selecting a training batch. | NOT VERIFIED | |
| EN-16 | The enrollment is saved in a single database transaction. | NOT VERIFIED | |
| EN-17 | If any required operation fails, the transaction is rolled back and no incomplete enrollment is created. | NOT VERIFIED | |
| EN-18 | The enrollment includes: Trainee; Selected batch; Requirements checklist; Uniform information; Beneficiary; Payment information, if applicable; Enrollment remarks | NOT VERIFIED | |
| EN-19 | Every newly created enrollment must have: ENROLLED STATUS | NOT VERIFIED | |
| EN-20 | The application explicitly saves the status as `ENROLLED`. | NOT VERIFIED | |
| EN-21 | The database default is also `ENROLLED`. | NOT VERIFIED | |
| EN-22 | Existing `PENDING` enrollment records are converted to `ENROLLED` by the migration. | NOT VERIFIED | |
| EN-23 | The batch start date does not cause the enrollment to remain pending. | NOT VERIFIED | |
| EN-24 | `PENDING` must not be used for newly accepted enrollments. | NOT VERIFIED | |

### 6. ID card number

| # | Criteria | Status | Notes |
|---|---|---|---|
| EN-25 | Every successfully created enrollment receives an ID card number. | NOT VERIFIED | |
| EN-26 | The format is: CURRENT_YEAR-PROGRAM_PREFIX-SEQUENCE | NOT VERIFIED | |
| EN-27 | The sequence: Is maintained per program.; Is maintained per year.; Starts at `001`.; Increments for each new enrollment in that program and year.; Is generated inside the same transaction as the enrollment. | NOT VERIFIED | |
| EN-28 | The ID card number must be unique. | NOT VERIFIED | |
| EN-29 | The ID card number is stored in `enrollments.id_card_number`. | NOT VERIFIED | |
| EN-30 | The generated ID card number is returned after successful enrollment. | NOT VERIFIED | |
| EN-31 | The ID card number appears in: The enrollment success screen.; The enrollment table.; The enrollment details. | NOT VERIFIED | |

### 7. Trainee account creation

| # | Criteria | Status | Notes |
|---|---|---|---|
| EN-32 | For a new trainee: The system creates a linked user account. | NOT VERIFIED | |
| EN-33 | The account role is `TRAINEE`. | NOT VERIFIED | |
| EN-34 | The account is active by default. | NOT VERIFIED | |
| EN-35 | The system ID follows: MCCTEST_<FIRST_NAME_INITIALS><LAST_NAME> | NOT VERIFIED | |
