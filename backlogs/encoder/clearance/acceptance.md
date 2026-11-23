# Encoder: Clearance and Certificate Request, Processing, Release and Release Log

| Field | Value |
|-------|-------|
| **Jira** | MP-63 |
| **Type** | Feature (Encoder page and endpoints, on top of the shared clearance module) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Depends on** | MP-60 (the form, the status values, `clearance_status_history`, the shared service), MP-62 (the Registrar step that feeds this one), MP-61 (the Trainer step). The Encoder pages of MP-51 (Trainee Information) are in the same portal |
| **Related** | **MP-64 (generating the certificate: template, print and PDF export).** FUNC-017 (public certificate verification), later |
| **Interface** | Encoder: `/encoder/clearance-requests`. "Clearance" sidebar link |
| **Overview** | `shared/clearance-request/acceptance.md` (CL-27 to CL-30 there are the short version of this file) |
| **Source** | Paper, Figure 4 (claim stub), Figures 25 to 29 (Encoder interfaces: approval queue, release and monitoring log) and Figure 3 (the Encoder's tracking spreadsheet and physical logbook) |
| **Added** | 2026-11-23 |

---

## User Story

**As** an encoder,
**I want** to process the clearance and certificate requests the Registrar has validated, set when the trainee can claim, and log the release,
**so that** the trainee knows when to claim the document and MCCTEST has a record of every release.

## Background

- The Encoder is the **last step**: Trainee submits (MP-60), Trainer validates (MP-61), Registrar validates (MP-62), **Encoder processes**, Released.
- Today the Encoder keeps an isolated Excel sheet and a physical logbook with the requested documents, release dates and status, and the trainee signs the logbook when claiming (paper, Figure 3). This ticket replaces that sheet and the date tracking.
- The Encoder acts only on `REGISTRAR_VALIDATED` (process) and `PROCESSED` (release). The Encoder sees **all** requests.
- The Encoder **does not reject**, and nothing is sent back. The Trainer and the Registrar decide whether the trainee is cleared. If the Encoder finds a problem, the Encoder contacts them directly.
- The claim stub on the form says: present it when claiming, the document is released only on the scheduled date, and processing takes 3 to 5 business days. The control number on the stub is how the Encoder finds and checks the request.
- Generating the certificate file is **not** part of this ticket. It is **MP-64** (`encoder/certificate-generation/acceptance.md`): once the Trainer and the Registrar have validated, the Encoder clicks Generate certificate and prints or exports it. Until MP-64 ships the document is prepared outside the system and this step records the processing and the release.
- Table mapping: `clearance.schedule` is the "Schedule release date", `clearance.released_by` is "Released by", `clearance.date_released` is "Date released". `clearance.release_date` is not used.

## What the Encoder Does

| Action | Acts only on | What it needs | Result |
|--------|--------------|---------------|--------|
| **Process** | `REGISTRAR_VALIDATED` | A schedule release date (today or later). Remarks optional | `PROCESSED`. The trainee sees the claim stub with the date |
| **Change date** | `PROCESSED` | A new date (today or later) and a remark | Stays `PROCESSED`. The trainee's stub shows the new date |
| **Release** | `PROCESSED` | The control number from the claim stub, which must match | `RELEASED`, with who released it and the date released |

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Must the Encoder type the control number to release? | **Assumed:** yes, it must match the request. It ties the release to the stub the trainee presents |
| 2 | Can the release date be changed after processing? | **Assumed:** yes, while `PROCESSED`, with a remark. Each change is logged |
| 3 | What if the Encoder finds a problem with a request? | **Assumed:** nothing in the system. No reject, no hold, no send-back. The Encoder contacts the Trainer or the Registrar |
| 4 | Is the certificate file made here? | **Answered 2026-11-23:** no. It is MP-64. Whether Process also requires every requested certificate (COC, COT) to be generated first is **TBA** (MP-64 CG-24). Until it is decided, Process works without it |
| 5 | Should the release log be exportable to Excel? | **Assumed:** later. A printable record per request for now |
| 6 | Can someone else claim for the trainee? | **Assumed:** not handled. The request is released against the control number on the stub |

## Scope

### A. The page (`/encoder/clearance-requests`)

- **Summary.** Three counts at the top: Waiting to process, Processed (pending claim) and Released.
- **List.** One row per request: control number, trainee name and system ID, program, batch, certificate requested, status, the scheduled release date and the date released. Default view "Waiting to process" (`REGISTRAR_VALIDATED`), **oldest first**. A status filter (Waiting to process, Processed and waiting for claim, Released, All), program and batch filters, a name, system ID or control number search, paging. All kept in the URL.
- **Side panel.** The whole form read-only, the Trainer's and the Registrar's validations, the approval progress (Trainer, Registrar, Encoder, Release), the history, and **Process**, **Change date** and **Release**, each with a confirm step.

### B. The release log

- A table of every processed and released request: control number, trainee, program, certificate requested, date processed, scheduled release date, date released and released by. Newest first, with a search and a status filter, paged, in the URL.
- A **printable record** per request: trainee name, program, certificate requested, control number, date processed, scheduled date, released by and date released (paper, Figure 29).

### C. The logs

- Every action (process, change date, release) writes one `clearance_status_history` row in the same transaction as the change: old status, new status, the encoder, the time and the remark. Changing the date keeps the status `PROCESSED` and puts the old and new date in the remark. Append-only.

## Design

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Controller | `src/users/encoder/clearance/encoder-clearance.controller.ts` | `@Controller('encoder/clearance-requests')`, `@Roles(Role.ENCODER)` |
| Service | shared `ClearanceService` (MP-60), Encoder methods | List, summary, detail, `process`, `reschedule`, `release`, release log. No copied logic |
| DTOs | `.../dto/` | List query, process body (`scheduleDate`, `remarks`), reschedule body (`scheduleDate`, `remarks`), release body (`controlNumber`, `remarks`) |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/encoder/clearance-requests` | List with status, program, batch, search and paging |
| GET | `/api/encoder/clearance-requests/summary` | The three counts |
| GET | `/api/encoder/clearance-requests/filter-options` | Statuses, programs and batches |
| GET | `/api/encoder/clearance-requests/:id` | Detail with both validations and the history |
| PATCH | `/api/encoder/clearance-requests/:id/process` | Process (set the schedule release date) |
| PATCH | `/api/encoder/clearance-requests/:id/reschedule` | Change the date while `PROCESSED` |
| PATCH | `/api/encoder/clearance-requests/:id/release` | Release (control number must match) |
| GET | `/api/encoder/clearance-requests/release-log` | The release log table |

### Schema (in the MP-60 migration, or one small migration here if MP-60 is already merged)

- On `clearance`: `encoder_processed_by` (FK to users), `encoder_processed_at`. The columns `schedule`, `released_by` and `date_released` already exist.

### Frontend

| Piece | Location |
|-------|----------|
| Page | `src/pages/users/encoder/clearance/EncoderClearancePage.tsx`, the side panel and the release log |
| Print view | A print-styled record page or dialog |
| API | `src/api/users/encoder-clearance.api.ts` |
| Route | `/encoder/clearance-requests`, guarded for `ENCODER` only. Sidebar link "Clearance" |

## Out of Scope

- The trainee form and the shared module (MP-60), the Trainer and Registrar steps (MP-61, MP-62).
- Generating the certificate file (MP-64) and the public verification page (FUNC-017).
- Rejecting, holding or sending back a request.
- Exporting the log to Excel.
- Notifications (MP-52). An Admin page for clearance.
- Editing a submitted form, or any history row.

---

## Acceptance Criteria

### Access

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CE-1 | An encoder can open `/encoder/clearance-requests`. The Encoder sidebar has a "Clearance" link | NOT STARTED | |
| CE-2 | Trainee, trainer, registrar and admin get 403 from every Encoder endpoint and cannot open the page. Every endpoint returns 401 without a token | NOT STARTED | |
| CE-3 | The encoder sees all requests. Responses never include `password_hash`, and show only what the form, the validations and the release need (no parents, beneficiary or insurance data) | NOT STARTED | |

### The List and the Summary

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CE-4 | The default view is "Waiting to process" (`REGISTRAR_VALIDATED`), oldest first. A status filter has Waiting to process, Processed and waiting for claim, Released and All | NOT STARTED | |
| CE-5 | The list has program and batch filters, a name, system ID or control number search where every word must match, and paging. All kept in the URL | NOT STARTED | |
| CE-6 | A summary at the top shows the three counts: Waiting to process, Processed (pending claim) and Released. They match the data | NOT STARTED | |
| CE-7 | Each row shows control number, trainee name and system ID, program, batch, certificate requested, status, the scheduled release date and the date released | NOT STARTED | |
| CE-8 | Loading, empty ("No requests are waiting to be processed") and error states are shown | NOT STARTED | |

### The Side Panel

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CE-9 | The panel shows the whole form read-only: control number, trainee information, certificates requested (with the "Other" text), purpose, the student's certification date and the date requested | NOT STARTED | |
| CE-10 | The panel shows the Trainer's validation (who, when, remarks, the four checks) and the Registrar's validation (who, when, remarks, the three checks), the clearance status `CLEARED` and "Surrendered ID: Yes" | NOT STARTED | |
| CE-11 | The panel shows the approval progress (Trainer, Registrar, Encoder, Release) and the history with who, when and any remark | NOT STARTED | |

### Process, Change Date and Release

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CE-12 | The encoder can process only a `REGISTRAR_VALIDATED` request. `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `PROCESSED`, `RELEASED`, `REJECTED` and `CANCELLED` return 400 and change nothing. The Trainer and the Registrar cannot be skipped | NOT STARTED | |
| CE-13 | Process needs a schedule release date that is today or later. A missing, malformed or past date returns 400. Remarks are optional and have a length limit. Whether Process also needs the certificate generated first is TBA | NOT STARTED | TBA, see MP-64 CG-24 |
| CE-14 | Process sets `PROCESSED` and saves `schedule`, `encoder_processed_by` and `encoder_processed_at`. The client cannot set the status, another user as the processor, or the Trainer, Registrar or release fields | NOT STARTED | |
| CE-15 | After processing, the trainee sees the claim stub with the schedule release date (MP-60 CL-18) | NOT STARTED | |
| CE-16 | While the request is `PROCESSED` the encoder can change the date to today or later, with a remark. The status stays `PROCESSED`, the trainee's stub shows the new date, and the change is logged. A request in any other status returns 400 | NOT STARTED | Open question 2 |
| CE-17 | The encoder can release only a `PROCESSED` request. `REGISTRAR_VALIDATED`, `RELEASED` and every other status return 400 and change nothing | NOT STARTED | |
| CE-18 | Release needs the control number from the claim stub, and it must match the request. A missing or wrong number returns 400. A match sets `RELEASED` and saves `released_by` (the logged-in encoder) and `date_released` (today) | NOT STARTED | Open question 1 |
| CE-19 | The encoder has no reject, hold or send-back action. Any other action returns 400 or 404, and nothing changes | NOT STARTED | Open question 3 |

### The Release Log and the Logs

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CE-20 | The release log table lists every processed and released request with control number, trainee, program, certificate requested, date processed, scheduled release date, date released and released by. Newest first, with a search and a status filter, paged, all in the URL | NOT STARTED | Paper, Figures 27 and 28 |
| CE-21 | A printable record per request shows trainee name, program, certificate requested, control number, date processed, scheduled date, released by and date released | NOT STARTED | Paper, Figure 29 |
| CE-22 | Every process, change of date and release writes one `clearance_status_history` row (old status, new status, the encoder, the time, the remark) in the same transaction as the change. If any part fails, none is saved. History is append-only, and the encoder can read the history of any request | NOT STARTED | Append-only by convention, not by the database |

### Concurrency and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CE-23 | Two encoders acting on the same request at the same moment (two processes, two releases, or a change of date and a release): exactly one wins, the other gets 400, and the history matches the final status. The same encoder in two tabs acts once | NOT STARTED | Conditional update on the current status |
| CE-24 | Backend and frontend lint, type-check and build pass with 0 problems. Unit tests cover process, change date, release, a wrong control number, a past date, every wrong status and concurrency. The Encoder trainee pages (MP-51) and their tests are not affected | NOT STARTED | |

---

## Test Cases

### TC-01: Process a request
- **Precondition:** A request in `REGISTRAR_VALIDATED`.
- **Steps:**
  1. Log in as the encoder. Open `/encoder/clearance-requests`. The request is in "Waiting to process", and the summary counts it.
  2. Open it. Read the Trainer's and the Registrar's validations. Set the schedule release date to 3 business days ahead. Click Process and confirm.
- **Expected:** Status `PROCESSED`, `schedule` saved with the encoder and the time. The request leaves "Waiting to process" and shows under "Processed and waiting for claim". The summary updates. One history row. The trainee now sees the claim stub with that date.

### TC-02: Process validation
- **Steps:** Try to process with no date, with yesterday's date and with a malformed date (button, then API). Then try to process a request that is `TRAINER_VALIDATED` and one that is `PENDING_VALIDATION`.
- **Expected:** 400 for every one. Nothing changes. No history row.

### TC-03: Wrong status and no reject
- **Steps:** By API as the encoder: release a `REGISTRAR_VALIDATED` request. Process a `PROCESSED` one. Release a `RELEASED` one. Try a reject, a hold and a send-back call.
- **Expected:** 400 for the first three. The reject, hold and send-back calls fail (400 or 404). Nothing changes.

### TC-04: Change the release date
- **Precondition:** A `PROCESSED` request.
- **Steps:** Click Change date. Try a past date, then a date two days later with the remark "Printer is down", and confirm. Then try it on a `RELEASED` request.
- **Expected:** The past date is refused. The valid change keeps the status `PROCESSED`, updates the date on the trainee's stub and writes a history row that holds the old date, the new date and the remark. The change on the released request returns 400.

### TC-05: Release with the control number
- **Precondition:** A `PROCESSED` request with control number X.
- **Steps:** Click Release. Enter a wrong number, then no number, then X, and confirm.
- **Expected:** The wrong and the empty number return 400 with nothing saved. X sets `RELEASED`, `released_by` (this encoder) and `date_released` (today), and writes one history row. The summary moves the request from "Processed" to "Released".

### TC-06: What the trainee sees
- **Steps:** As the trainee, open the request after each of: the Registrar's validation, Process, Change date, Release.
- **Expected:** The progress moves to "Waiting for the Encoder" after the Registrar. After Process the claim stub appears with the date. After Change date the stub shows the new date. After Release the status is Released and the stub is still there.

### TC-07: Summary, filters and search
- **Precondition:** Two waiting, one processed, two released across two programs.
- **Steps:** Read the summary. Use the status filter, the program filter, and search by a trainee name and by a control number. Reload with the filters in the URL.
- **Expected:** The summary shows 2, 1 and 2. Each filter and search shows the right rows, and a non-matching term shows an empty state. The same view comes back after the reload.

### TC-08: Release log and printable record
- **Steps:** Open the release log. Search for a released trainee. Open that request's printable record.
- **Expected:** The log lists the processed and released requests with all the columns, newest first. The record shows trainee name, program, certificate, control number, date processed, scheduled date, released by and date released, and prints cleanly.

### TC-09: Role access
- **Steps:** Call every Encoder endpoint as Trainee, Trainer, Registrar and Admin, and with no token.
- **Expected:** 403 for the four roles, 401 without a token. The four roles cannot open the page.

### TC-10: Two encoders at once, and the logs
- **Precondition:** One `REGISTRAR_VALIDATED` request and one `PROCESSED` request.
- **Steps:** Send two process calls for the first at the same moment. Send a release and a change of date for the second at the same moment. Then open both requests and read the history.
- **Expected:** One call wins in each pair and the other gets 400. The final status matches the winner. The history has exactly one row per successful action, in order, each with name, role, time and remark, and no row can be edited or deleted.
