# Clearance and Certificate Request: Student Form and Pipeline

| Field | Value |
|-------|-------|
| **Jira** | MP-60 |
| **Type** | Feature (Trainee, Trainer, Registrar and Encoder pages and one shared backend module) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Depends on** | MP-24 (trainee scope), MP-25 (payments, for the fee check). The pattern to copy is the withdrawal pipeline (MP-45 to MP-49, `shared/withdrawal/acceptance.md`) |
| **Related** | MP-52 (notifications, not needed), FUNC-010 (certificate generation) and FUNC-017 (public certificate verification), both later |
| **Interface** | Trainee: `/trainee/clearance-requests`. Trainer: `/trainer/clearance-requests`. Registrar: `/registrar/clearance-requests`. Encoder: `/encoder/clearance-requests`. A "Clearance" sidebar link on each. No Admin page |
| **Source** | The paper "Clearance and Certificate Request Form" (capstone paper, Appendix D, Figure 4) |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainee,
**I want** to fill in the Clearance and Certificate Request Form online and follow its progress,
**so that** I can see my request is pending, who still has to act, and when I can claim my certificate.

## Background

- Today the form is on paper. The trainee carries it from office to office to collect signatures, and the Encoder keeps a spreadsheet and a logbook (paper, Figures 3 and 22).
- The online pipeline is: **Trainee submits, Trainer validates, Registrar validates, Encoder processes, then the request is Released.** It works like the withdrawal pipeline: each step acts only on the status the step before it leaves, every step is logged, and the trainee can follow the request while it is pending.
- The Admin is not in this pipeline and has no page.
- The paper form also lists Accounting/Cashier, Property Custodian and Others as offices to sign. They are **not separate steps** here. The Registrar checks the fees (with the payment history, as in MP-47) and the Trainer checks the tools and equipment.
- **Reuse.** The tables `request_form`, `clearance` and `clearance_certificate` already exist and are empty (checked 2026-11-23), as are the 4 certificate types (COC, COT, NC, OTHER). The `clearance_approval` table (one row per office) is not used, because this pipeline has fixed roles. Nothing needs to be migrated.
- Generating the certificate itself (PDF or PNG with a control number) is a later ticket (FUNC-010). Here the Encoder processes the request, sets the release schedule and logs the release.

## The Form (from the paper)

| On the paper | Online |
|--------------|--------|
| Control No. (MCCTEST00 and a number) | Made by the system when the request is submitted. Shown on the request and on the claim stub |
| Trainee information: full name, contact number, address, course/program, date completed, trainer | Filled in by the system from the enrollment. Read-only |
| Certificate request: Certificate of Completion, Certificate of Training, Other (specify) | Checkboxes. One or more. "Other" needs the text |
| Purpose of request | Text, required |
| Clearance table (Trainer, Registrar, Accounting/Cashier, Property Custodian, Others: cleared by, signature, date, remarks) | The Trainer and Registrar steps. Who, when and the remark come from the history. No signature box |
| Student's certification and signature | One confirmation box the trainee must tick. The date is set by the system |
| For Registrar's office use only: clearance status (Cleared, Pending, Not Cleared), surrendered ID (Yes or No) | Set at the Registrar step (see below). The release schedule, released by and date released are set at the Encoder step |
| Claim stub: name, schedule release date, certificate request, reminders | Shown to the trainee once the request is processed. Printable |

## Status Flow

```
PENDING_VALIDATION --(Trainer validates)--> TRAINER_VALIDATED --(Registrar validates)--> REGISTRAR_VALIDATED --(Encoder processes)--> PROCESSED --(Encoder releases)--> RELEASED
        |                                          |
        '-- Trainer rejects --> REJECTED           '-- Registrar rejects --> REJECTED
        '-- trainee cancels before any validation --> CANCELLED
```

**Rule: each step acts only on the status the step before it leaves.**

| Step | Acts only on | Sets |
|------|--------------|------|
| Trainee (submit) | New request | `PENDING_VALIDATION` |
| Trainee (cancel) | `PENDING_VALIDATION` | `CANCELLED` |
| Trainer | `PENDING_VALIDATION` | `TRAINER_VALIDATED` or `REJECTED` |
| Registrar | `TRAINER_VALIDATED` | `REGISTRAR_VALIDATED` or `REJECTED` |
| Encoder (process) | `REGISTRAR_VALIDATED` | `PROCESSED` |
| Encoder (release) | `PROCESSED` | `RELEASED` |

Any other status returns 400 for the step that tries to act. The Encoder has no reject action.

**Clearance status on the form** (`clearance.clearance_status`): `PENDING` from the moment of submit, `CLEARED` when the Registrar validates, `NOT_CLEARED` when the Trainer or the Registrar rejects.

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Who can submit, and when? | **Assumed:** a trainee, for their own enrollment that is `ENROLLED` or `COMPLETED`. The rule that training hours must be finished waits for attendance (FUNC-006), so it is not checked yet |
| 2 | One certificate type, or several in one request? | **Assumed:** one or more, like the checkboxes on the paper. Stored in `clearance_certificate`. `request_form.certificate_type_id` (required by the schema) holds the first one |
| 3 | What is the control number format? | **Assumed:** system-generated, unique, following the printed pattern `MCCTEST00` and a running number. The exact digits are to be confirmed |
| 4 | What does the Trainer confirm? | **Assumed:** one confirmation that the trainee finished the training requirements and returned the tools and equipment. Required to validate. Remarks optional on validate, required on reject |
| 5 | What does the Registrar check? | **Assumed:** the same three checks as the withdrawal (MP-47): ID surrendered, fees settled, documents submitted. All three are required to validate. Otherwise the Registrar rejects with a reason |
| 6 | What does "processes" mean for the Encoder? | **Assumed:** the Encoder sets the schedule release date (not in the past; the paper says processing takes 3 to 5 business days) and the request becomes `PROCESSED`. Later the Encoder marks it `RELEASED` with who and when. The certificate file itself comes with FUNC-010 |
| 7 | After a rejection, can the trainee send a new request? | **Assumed:** yes. A rejected, cancelled or released request is no longer open |
| 8 | Does the Admin see these requests? | **Assumed:** no page for now |

## Scope

### A. Trainee (`/trainee/clearance-requests`)

- **List.** The trainee's requests: control number, certificate requested, status, date. Status filter, paged, kept in the URL. A "New request" button.
- **Form.** As in the table above. The trainee picks the enrollment if there is more than one.
- **Detail and progress.** The stages Request, Trainer, Registrar, Encoder, Release, with the current stage and "Waiting for the Trainer / Registrar / Encoder". The history with who, when and any remark. A rejection shows its reason.
- **Cancel** while the request is still `PENDING_VALIDATION`.
- **Claim stub** once the request is `PROCESSED` or `RELEASED`: name, control number, schedule release date, certificate requested, and the reminders from the paper. Printable.

### B. Trainer (`/trainer/clearance-requests`)

- Requests from trainees in the trainer's own batches. Default view "Waiting for me" (`PENDING_VALIDATION`). Status filter, name or system ID search, paged, in the URL.
- Side panel: the form, the confirmation box, **Validate** and **Reject** (reason required), the history. A **Request history** table below the list for the requests this trainer already decided.

### C. Registrar (`/registrar/clearance-requests`)

- All requests. Default view "Waiting for me" (`TRAINER_VALIDATED`). Same list features as the Trainer.
- Side panel: the form, the Trainer's validation, the three checks (ID surrendered, fees settled with the payment history, documents submitted), **Validate** and **Reject** (reason required), the history. A **Request history** table.

### D. Encoder (`/encoder/clearance-requests`)

- All requests. Default view "Waiting for me" (`REGISTRAR_VALIDATED`), and a filter for `PROCESSED` (waiting for release).
- Side panel: the form, both validations, **Process** (set the schedule release date) and, later, **Release**. No reject. A **Request history** table.

### E. The logs

- Every action writes one `clearance_status_history` row in the same transaction as the change: old status, new status, who, when and the remark. Append-only.

## Design

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Shared service | `src/clearance/` (module, service, DTOs) | All the rules and the status changes. Copy the structure of `src/withdrawal/` |
| Trainee controller | `src/users/trainee/clearance/` | `@Controller('trainee/clearance-requests')`, `@Roles(Role.TRAINEE)` |
| Trainer controller | `src/users/trainer/clearance/` | `@Controller('trainer/clearance-requests')`, `@Roles(Role.TRAINER)` |
| Registrar controller | `src/users/registrar/clearance/` | `@Controller('registrar/clearance-requests')`, `@Roles(Role.REGISTRAR)` |
| Encoder controller | `src/users/encoder/clearance/` | `@Controller('encoder/clearance-requests')`, `@Roles(Role.ENCODER)` |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/trainee/clearance-requests` | Submit the form |
| GET | `/api/trainee/clearance-requests`, `/:id` | List and detail with history |
| PATCH | `/api/trainee/clearance-requests/:id/cancel` | Cancel |
| GET | `/api/{trainer,registrar,encoder}/clearance-requests`, `/filter-options`, `/:id` | List, filters, detail with history |
| PATCH | `/api/trainer/clearance-requests/:id/validate` | Validate or reject |
| PATCH | `/api/registrar/clearance-requests/:id/validate` | Validate or reject |
| PATCH | `/api/encoder/clearance-requests/:id/process` | Process (set the schedule) |
| PATCH | `/api/encoder/clearance-requests/:id/release` | Release |

### Schema (one additive migration)

- New enum `clearance_request_status_enum`: `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `REGISTRAR_VALIDATED`, `PROCESSED`, `RELEASED`, `REJECTED`, `CANCELLED`.
- `request_form`: add `control_number` (unique) and the pipeline status. Add the trainee's certification fields (`certified`, `certified_at`).
- `clearance`: add Trainer columns (`trainer_validated_by`, `trainer_validated_at`, `trainer_remarks`, `trainer_requirements_checked`), Registrar columns (`registrar_validated_by`, `registrar_validated_at`, `registrar_remarks`, `finances_cleared`, `documents_submitted`; `surrendered_id` already exists) and `encoder_processed_by`, `encoder_processed_at`. The columns `schedule`, `released_by` and `date_released` already exist.
- New table `clearance_status_history` (`request_form_id`, `old_status`, `new_status`, `changed_by`, `changed_at`, `remarks`), indexed by request and time, like `withdrawal_status_history`.
- Control numbers come from `ctrl_num_seq` (a new `sequence_type`, safe under concurrency).

### Frontend

| Piece | Location |
|-------|----------|
| Pages | `src/pages/users/{trainee,trainer,registrar,encoder}/clearance/` |
| API | `src/api/users/{trainee,trainer,registrar,encoder}-clearance.api.ts` |
| Routes | Four routes, each guarded for its own role. Sidebar link "Clearance" for each |

## Out of Scope

- Generating the certificate PDF or PNG (FUNC-010) and the public certificate verification page (FUNC-017).
- Notifications (MP-52, and the per-role bells).
- An Admin page for clearance.
- Accounting/Cashier and Property Custodian as separate steps.
- Checking attendance or training hours before the trainee can submit (FUNC-006).
- Editing a submitted form, or editing or deleting any history row.

---

## Acceptance Criteria

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-1 | Each role can open its own page (Trainee, Trainer, Registrar, Encoder), and each has a "Clearance" sidebar link | NOT STARTED | |
| CL-2 | Every endpoint returns 403 for the roles it is not for (Admin included) and 401 without a token. Other roles cannot open the pages | NOT STARTED | |
| CL-3 | A trainee sees only their own requests. Opening another trainee's request, or an unknown id, returns the same 403 so ids are not revealed | NOT STARTED | Same as MP-46 T-2 |
| CL-4 | A trainer sees only requests from trainees in their own batches. Another batch's request returns 403 | NOT STARTED | Same as MP-48 TR-1 |

### The Student Form

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-5 | The form shows the trainee's full name, contact number, address, program, date completed and trainer, filled in by the system and read-only | NOT STARTED | |
| CL-6 | The trainee picks one or more certificates (Certificate of Completion, Certificate of Training, Other). At least one is required. "Other" needs the text | NOT STARTED | Open question 2 |
| CL-7 | The purpose of request is required and has a length limit | NOT STARTED | |
| CL-8 | The student's certification box must be ticked to submit. The system records the date and time | NOT STARTED | |
| CL-9 | On submit the system makes a unique control number, creates the request as `PENDING_VALIDATION` with the clearance status `PENDING`, and writes the first history row, all in one transaction | NOT STARTED | Open question 3 |
| CL-10 | A trainee can submit only for their own enrollment in `ENROLLED` or `COMPLETED`. Another status returns 400. An enrollment that is not theirs returns 403 | NOT STARTED | Open question 1 |
| CL-11 | A second open request for the same enrollment returns 409. A rejected, cancelled or released request is not open | NOT STARTED | Open question 7 |
| CL-12 | Bad input returns 400 with a clear message: missing fields, a malformed id, an oversized text, an unknown certificate type. Fields the client may not set (status, control number, validators, dates) are ignored | NOT STARTED | |

### Following the Request (Trainee)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-13 | The trainee's list shows control number, certificate requested, status and date, with a status filter and paging, all kept in the URL | NOT STARTED | |
| CL-14 | The progress view shows the stages Request, Trainer, Registrar, Encoder, Release, the current stage, and who the request is waiting for | NOT STARTED | Same idea as MP-46 T-5 |
| CL-15 | The detail shows the history: each step with who, when and any remark. A rejection shows its reason | NOT STARTED | |
| CL-16 | The trainee can cancel only while the request is `PENDING_VALIDATION`. Any other status returns 400. A cancel and a Trainer action at the same moment cannot both win | NOT STARTED | Same as MP-46 T-6 |
| CL-17 | After a rejection or a cancel the trainee can submit a new request | NOT STARTED | Open question 7 |
| CL-18 | When the request is `PROCESSED` or `RELEASED` the trainee sees the claim stub: name, control number, schedule release date, certificate requested and the reminders from the paper. It can be printed | NOT STARTED | |

### Trainer Step

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-19 | The Trainer's list defaults to "Waiting for me" (`PENDING_VALIDATION`) with a status filter, a name or system ID search (every word must match) and paging, all in the URL | NOT STARTED | |
| CL-20 | The Trainer can validate or reject only when the status is `PENDING_VALIDATION` (400 otherwise). Remarks optional on validate, **required on reject** | NOT STARTED | Same rule as MP-48 TR-3 |
| CL-21 | Validate needs the Trainer's confirmation that the training requirements are finished and the tools and equipment returned. Without it the request returns 400 | NOT STARTED | Open question 4 |
| CL-22 | Validate sets `TRAINER_VALIDATED` and saves who, when and the remark. Reject sets `REJECTED` and the clearance status `NOT_CLEARED`. The client cannot set the status or another user as the validator | NOT STARTED | |

### Registrar Step

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-23 | The Registrar's list defaults to "Waiting for me" (`TRAINER_VALIDATED`), with the same filter, search and paging features | NOT STARTED | |
| CL-24 | The Registrar can validate or reject only when the status is `TRAINER_VALIDATED` (400 otherwise). Reject needs a reason | NOT STARTED | |
| CL-25 | Validate needs the three checks: ID surrendered (saved in `surrendered_id`), fees settled, documents submitted. The panel shows the trainee's payment history for the fee check | NOT STARTED | Open question 5. Same checks as MP-47 |
| CL-26 | Validate sets `REGISTRAR_VALIDATED` and the clearance status `CLEARED`, and saves who and when. Reject sets `REJECTED` and `NOT_CLEARED` | NOT STARTED | |

### Encoder Step

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-27 | The Encoder's list defaults to "Waiting for me" (`REGISTRAR_VALIDATED`) and has a filter for `PROCESSED` (waiting for release) | NOT STARTED | |
| CL-28 | The Encoder can process only a `REGISTRAR_VALIDATED` request, by setting the schedule release date (not in the past). The status becomes `PROCESSED` and `encoder_processed_by` and `encoder_processed_at` are saved | NOT STARTED | Open question 6 |
| CL-29 | The Encoder can release only a `PROCESSED` request. Release sets `RELEASED` and saves `released_by` and `date_released` (today) | NOT STARTED | |
| CL-30 | The Encoder has no reject action. Any other action or status returns 400 | NOT STARTED | |

### Pipeline and Logs

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-31 | The order is enforced: Trainer first, Registrar second, Encoder third. No step can act out of order or skip a step. Any step acting on a wrong status gets 400 and nothing changes | NOT STARTED | |
| CL-32 | Every action (submit, validate, reject, cancel, process, release) writes one `clearance_status_history` row with old status, new status, who, when and the remark, in the same transaction as the change. If any part fails, none is saved | NOT STARTED | |
| CL-33 | History is append-only. No endpoint edits or deletes a row | NOT STARTED | By convention, not by the database |
| CL-34 | Each role can read the history of the requests it can see, with the person's name and role on every entry | NOT STARTED | |
| CL-35 | Two actors on the same request at the same moment (two registrars, or a trainee cancel and a Trainer validate): exactly one wins, the other gets 400, and the history is consistent | NOT STARTED | Conditional update on the current status |

### Data and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CL-36 | One additive migration (enum, new columns, `clearance_status_history`). It runs on a fresh database and on one that already has data, and changes no existing row | NOT STARTED | The clearance tables are empty on 2026-11-23 |
| CL-37 | Control numbers are unique and stay unique when many requests are submitted at the same moment | NOT STARTED | `ctrl_num_seq` |
| CL-38 | Responses never include `password_hash`. Each role sees only the fields it needs (no parents, beneficiary or insurance data) | NOT STARTED | |
| CL-39 | Every page has loading, empty and error states, and keeps its filter, search and page in the URL | NOT STARTED | |
| CL-40 | Backend and frontend lint, type-check and build pass with 0 problems. Unit tests cover every step, wrong status, duplicates, cancel, validation limits and concurrency. The withdrawal tests still pass | NOT STARTED | |

---

## Test Cases

### TC-01: Submit a request
- **Precondition:** A trainee with an `ENROLLED` or `COMPLETED` enrollment and no open request.
- **Steps:**
  1. Log in as the trainee and open `/trainee/clearance-requests`. Click New request.
  2. Check that the name, contact number, address, program, date completed and trainer are filled in and cannot be edited.
  3. Tick Certificate of Completion, enter a purpose, tick the certification box, submit.
- **Expected:** A control number is shown. The request is `PENDING_VALIDATION`, the clearance status is `PENDING`, the list shows it as pending and the history has one row.

### TC-02: Form validation
- **Steps:** Submit with no certificate ticked. Submit with Other ticked and no text. Submit with an empty purpose. Submit without the certification box.
- **Expected:** Each is refused with a clear message and nothing is saved.

### TC-03: Duplicate open request
- **Precondition:** TC-01 done.
- **Steps:** Submit a second request for the same enrollment.
- **Expected:** 409. Only one request exists.

### TC-04: The trainee follows the request
- **Steps:** After each step below (Trainer, Registrar, Encoder), refresh the trainee's detail page.
- **Expected:** The progress view moves one stage each time and always says who the request is waiting for. The history lists every step with who and when.

### TC-05: Trainer validates
- **Precondition:** A request in `PENDING_VALIDATION` for a trainee in this trainer's batch.
- **Steps:** Open `/trainer/clearance-requests`, open the request, tick the confirmation, click Validate and confirm.
- **Expected:** `TRAINER_VALIDATED`. The request leaves "Waiting for me" and appears in the Request history table. One history row.

### TC-06: Trainer rejects
- **Steps:** Open a request. Click Reject. Try to confirm with no reason, then give "Tools not returned" and confirm. Then, as the trainee, look at the request and submit a new one.
- **Expected:** Confirm is blocked without a reason. The status is `REJECTED`, the clearance status `NOT_CLEARED`. The trainee sees the reason and can submit again.

### TC-07: Registrar validates
- **Precondition:** A request in `TRAINER_VALIDATED`.
- **Steps:** Open `/registrar/clearance-requests`, open the request, look at the payment history, tick ID surrendered, fees settled and documents submitted, click Validate. Try first with one box unticked.
- **Expected:** With a box unticked Validate is blocked (API 400). With all three: `REGISTRAR_VALIDATED`, clearance status `CLEARED`, `surrendered_id` saved, one history row.

### TC-08: Registrar rejects
- **Steps:** Reject a `TRAINER_VALIDATED` request with a reason.
- **Expected:** `REJECTED`, `NOT_CLEARED`, the reason is visible to the trainee, one history row.

### TC-09: Encoder processes
- **Precondition:** A request in `REGISTRAR_VALIDATED`.
- **Steps:** Open `/encoder/clearance-requests`, open the request, try a schedule date in the past, then set a date 3 business days ahead and click Process.
- **Expected:** The past date is refused. With a valid date the status is `PROCESSED`. The trainee now sees the claim stub with the schedule release date. One history row.

### TC-10: Encoder releases
- **Precondition:** A `PROCESSED` request.
- **Steps:** Click Release and confirm.
- **Expected:** `RELEASED`, with `released_by` and `date_released` saved and one history row. The trainee still sees the claim stub.

### TC-11: Wrong status and order
- **Steps:** By API: validate a `TRAINER_VALIDATED` request as the Trainer. Validate a `PENDING_VALIDATION` request as the Registrar. Process a `TRAINER_VALIDATED` request as the Encoder. Release a `REGISTRAR_VALIDATED` request. Reject as the Encoder.
- **Expected:** 400 for all. Nothing changes and no history row is written.

### TC-12: Cancel rules and the cancel race
- **Steps:** Cancel a `PENDING_VALIDATION` request. Try to cancel one that is `TRAINER_VALIDATED`. Then send a trainee cancel and a Trainer validate for the same request at the same moment.
- **Expected:** The first cancel works and the trainee can submit again. The second is 400. In the race, exactly one wins and the history matches the final status.

### TC-13: Roles and scope
- **Steps:** Call every endpoint as every other role and with no token. As a trainer, open a request from a trainee in another trainer's batch. As a trainee, open another trainee's request.
- **Expected:** 403 for the wrong roles, 401 without a token, 403 for the other batch and the other trainee.

### TC-14: Logs and two registrars at once
- **Precondition:** A request taken through every step, and a second request in `TRAINER_VALIDATED`.
- **Steps:** Open the first request as each role. On the second, send two Registrar validate calls at the same time.
- **Expected:** Every role sees the full history in order, newest first, with name, role, time and remark. No row can be edited or deleted. In the race, one validate wins, the other gets 400, and there is one history row.
