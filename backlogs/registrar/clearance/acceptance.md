# Registrar: Clearance and Certificate Request, Second Validation

| Field | Value |
|-------|-------|
| **Jira** | MP-62 |
| **Type** | Feature (Registrar page and endpoints, on top of the shared clearance module) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Depends on** | MP-60 (the form, the status values, `clearance_status_history`, the shared service), MP-61 (the Trainer step that feeds this one), MP-25 and MP-47 (payment history), MP-43 (requirements checklist), MP-53 (uniform distribution, for the info line). The Registrar step of the withdrawal (MP-47) is the pattern to copy |
| **Related** | The Encoder step (MP-63) |
| **Interface** | Registrar: `/registrar/clearance-requests`. "Clearance" sidebar link |
| **Overview** | `shared/clearance-request/acceptance.md` (CL-23 to CL-26 there are the short version of this file) |
| **Added** | 2026-11-23 |

---

## User Story

**As** a registrar,
**I want** to see the clearance and certificate requests the Trainer has validated and confirm the trainee's ID, fees and documents,
**so that** only trainees who settled everything with the registrar's office are cleared and move on to the Encoder.

## Background

- The Registrar is the **second step**: Trainee submits (MP-60), Trainer validates (MP-61), **Registrar validates**, Encoder processes, Released.
- On the paper form this is the box **"For Registrar's office use only"**: Clearance Status (Cleared, Pending, Not Cleared) and Surrendered ID (Yes or No). The Registrar is also a line in the clearance table.
- The Registrar acts only on `TRAINER_VALIDATED`. Validate sets `REGISTRAR_VALIDATED` and the clearance status `CLEARED` (the Encoder can then act). Reject sets `REJECTED` and `NOT_CLEARED`.
- The Registrar sees **all** requests. There is no batch scope, as in the withdrawal (MP-47).
- The interview says the Registrar's office checks pending payments and unsettled documents with its own sheets before signing a clearance. The Registrar also takes back the ID.

## What the Registrar Validates

The Registrar confirms three things. **All three must be confirmed to validate.** If one is not true the Registrar rejects with a reason.

| # | The Registrar confirms | Saved as | Where the Registrar looks |
|---|------------------------|----------|---------------------------|
| 1 | **ID surrendered** | `clearance.surrendered_id = true` (the "Surrendered ID: Yes" box on the paper form) | The trainee hands the ID over at the counter |
| 2 | **Fees settled** | `clearance.finances_cleared` | The trainee's payment history (official receipts, MP-25 and the MP-47 pop-up) |
| 3 | **Documents submitted** | `clearance.documents_submitted` | The requirements checklist (MP-43) and the enrollment record |

**Not the Registrar's checks:** training hours and attendance, assessments, portfolio, and tools and equipment. Those are the Trainer's (MP-61).

**Shown to help, not extra checks:** the Trainer's validation (who, when, remarks, the four checks), the payment history, the requirements checklist and the uniform and ID distribution status (MP-53).

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Are these three checks right? | **Assumed:** yes, the same three as the withdrawal (MP-47). All required |
| 2 | How is "fees settled" decided? There is no balance or fee schedule in the system | **Assumed:** the Registrar judges from the payment history and confirms by hand. An automatic check can come when a fee schedule exists |
| 3 | Should Validate be blocked when the requirements checklist (MP-43) is incomplete? | **Assumed:** no. The checklist is shown and the Registrar confirms. Documents were required at enrollment, so a gap is rare |
| 4 | Does the uniform have to be returned for clearance? | **Assumed:** no. The uniform status is shown as information only |
| 5 | What if the trainee lost the ID? | **Assumed:** the Registrar rejects with a reason. The trainee sorts it out and submits a new request. No "ID lost" option for now |

## Scope

### A. The page (`/registrar/clearance-requests`)

- **List.** One row per request: control number, trainee name and system ID, program, batch, certificate requested, date requested, status. Default view "Waiting for me" (`TRAINER_VALIDATED`), **oldest first**. A status filter, program and batch filters, a name, system ID or control number search, paging. All kept in the URL.
- **Side panel.** The whole form read-only, the Trainer's validation, the payment history, the requirements checklist and uniform status (read-only), the three checks, the approval progress (Trainer, Registrar, Encoder, Release), the history, and **Validate** and **Reject**, each with a confirm step.
- **Request history table.** Below the list: the requests this registrar already validated or rejected, newest first, with its own search and status filter. Opening one shows the timeline and no buttons.

### B. Validate and reject

- **Validate** needs the three checks ticked. Remarks are optional. It sets `REGISTRAR_VALIDATED`, the clearance status `CLEARED`, and saves who, when, the remark, `surrendered_id`, `finances_cleared` and `documents_submitted`.
- **Reject** needs a reason. The checks do not have to be ticked. It sets `REJECTED` and `NOT_CLEARED`. The trainee sees the reason.

### C. The logs

- Every action writes one `clearance_status_history` row in the same transaction as the change: old status, new status, the registrar, the time and the remark. Append-only.

## Design

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Controller | `src/users/registrar/clearance/registrar-clearance.controller.ts` | `@Controller('registrar/clearance-requests')`, `@Roles(Role.REGISTRAR)` |
| Service | shared `ClearanceService` (MP-60), Registrar methods | List, detail, `registrarDecide`. No copied logic. The payment history reuses the code behind the MP-47 pop-up |
| DTOs | `.../dto/` | List query, decision body (`decision`: `VALIDATE` or `REJECT`, `surrenderedId`, `financesCleared`, `documentsSubmitted`, `remarks`) |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/registrar/clearance-requests` | List with status, program, batch, search and paging |
| GET | `/api/registrar/clearance-requests/filter-options` | Statuses, programs and batches |
| GET | `/api/registrar/clearance-requests/:id` | Detail with the Trainer's validation, payment history and history |
| PATCH | `/api/registrar/clearance-requests/:id/validate` | Validate or reject |

### Schema (in the MP-60 migration, or one small migration here if MP-60 is already merged)

- On `clearance`: `registrar_validated_by` (FK to users), `registrar_validated_at`, `registrar_remarks`, `finances_cleared`, `documents_submitted` (booleans, default false). `surrendered_id` and `clearance_status` already exist.

### Frontend

| Piece | Location |
|-------|----------|
| Page | `src/pages/users/registrar/clearance/RegistrarClearancePage.tsx` and panel component. Reuse the payment history dialog from the withdrawal page |
| API | `src/api/users/registrar-clearance.api.ts` |
| Route | `/registrar/clearance-requests`, guarded for `REGISTRAR` only. Sidebar link "Clearance" |

## Out of Scope

- The trainee form and the shared module (MP-60), the Trainer step (MP-61), the Encoder step.
- A fee schedule or a balance.
- Notifications (MP-52). Certificate generation (FUNC-010).
- Editing a submitted form, or any history row.

---

## Acceptance Criteria

### Access

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CR-1 | A registrar can open `/registrar/clearance-requests`. The Registrar sidebar has a "Clearance" link | NOT STARTED | |
| CR-2 | Trainee, trainer, encoder and admin get 403 from every Registrar endpoint and cannot open the page. Every endpoint returns 401 without a token | NOT STARTED | |
| CR-3 | The registrar sees all requests (no batch scope). Responses never include `password_hash`, and show only what the form and the checks need (no parents, beneficiary or insurance data) | NOT STARTED | |

### The List

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CR-4 | The default view is "Waiting for me" (`TRAINER_VALIDATED`), oldest request first. A status filter shows All, Waiting, Validated by me and Rejected by me | NOT STARTED | |
| CR-5 | The list has program and batch filters (a batch only lists the selected program's batches), a name, system ID or control number search where every word must match, and paging. All kept in the URL | NOT STARTED | |
| CR-6 | Each row shows control number, trainee name and system ID, program, batch, certificate requested, date requested and status | NOT STARTED | |
| CR-7 | Loading, empty ("No requests are waiting for you") and error states are shown | NOT STARTED | |

### The Side Panel

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CR-8 | The panel shows the whole form read-only: control number, trainee information, certificates requested (with the "Other" text), purpose, the student's certification date and the date requested | NOT STARTED | |
| CR-9 | The panel shows the Trainer's validation: who, when, the remark and the four checks | NOT STARTED | |
| CR-10 | The panel shows the trainee's payment history (OR number, date, amount, reason, method), reusing the code behind the MP-47 pop-up | NOT STARTED | |
| CR-11 | The panel shows the requirements checklist (MP-43) and the uniform and ID distribution status (MP-53), read-only | NOT STARTED | Information only |
| CR-12 | The panel shows the approval progress (Trainer, Registrar, Encoder, Release) and the history with who, when and any remark | NOT STARTED | |

### Validate and Reject

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CR-13 | Validate needs all three checks true: ID surrendered, fees settled, documents submitted. The Validate button stays disabled until they are ticked. The API returns 400 if any is false or missing, and nothing changes | NOT STARTED | Open question 1 |
| CR-14 | Remarks are optional on validate and have a length limit. A reason is **required on reject** (400 without one) | NOT STARTED | Same rule as MP-47 |
| CR-15 | Validate sets `REGISTRAR_VALIDATED` and the clearance status `CLEARED`, and saves `surrendered_id`, `finances_cleared`, `documents_submitted`, who, when and the remark. The client cannot set the status, another registrar as the validator, or the Trainer or Encoder fields | NOT STARTED | |
| CR-16 | Reject sets `REJECTED` and the clearance status `NOT_CLEARED`, and saves the reason and who and when. The checks do not have to be ticked. The trainee sees the reason | NOT STARTED | |
| CR-17 | The registrar can act only when the status is `TRAINER_VALIDATED`. `PENDING_VALIDATION` (the Trainer has not acted yet), `REGISTRAR_VALIDATED`, `PROCESSED`, `RELEASED`, `REJECTED` and `CANCELLED` return 400 and change nothing | NOT STARTED | The Trainer cannot be skipped |
| CR-18 | Validate and Reject each have a confirm step. Reject cannot be confirmed without a reason | NOT STARTED | |
| CR-19 | After a validate, the request leaves "Waiting for me", the Encoder can see it, and the trainee's progress moves to the Encoder stage | NOT STARTED | |

### The Logs and the History Table

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CR-20 | Every validate or reject writes one `clearance_status_history` row (old status, new status, the registrar, the time, the remark) in the same transaction as the change. If any part fails, none is saved | NOT STARTED | |
| CR-21 | The Request history table lists only the requests this registrar already validated or rejected, newest first, with its own search and status filter kept in the URL. A decided request does not disappear. Opening one shows the timeline and no Validate or Reject buttons | NOT STARTED | Same pattern as MP-48 TR-11 and TR-12 |
| CR-22 | The registrar can read the history of any request. No endpoint edits or deletes a history row | NOT STARTED | Append-only by convention, not by the database |

### Concurrency and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CR-23 | Two registrars acting on the same request at the same moment (two validates, or a validate and a reject), or one registrar in two tabs: exactly one wins, the other gets 400, and the history matches the final status | NOT STARTED | Conditional update on the current status |
| CR-24 | Backend and frontend lint, type-check and build pass with 0 problems. Unit tests cover validate, reject, a missing check, a missing reason, every wrong status (including skipping the Trainer) and concurrency. The Registrar withdrawal page, the payments page and their tests are not affected | NOT STARTED | |

---

## Test Cases

### TC-01: Validate with all three checks
- **Precondition:** A request in `TRAINER_VALIDATED`.
- **Steps:**
  1. Log in as the registrar. Open `/registrar/clearance-requests`. The request is in "Waiting for me".
  2. Open it. Read the Trainer's validation and look at the payment history. Tick ID surrendered, fees settled and documents submitted. Click Validate and confirm.
- **Expected:** Status `REGISTRAR_VALIDATED`, clearance status `CLEARED`, `surrendered_id` saved. The request leaves "Waiting for me" and appears in the Request history table. One history row. The Encoder can now see it. The trainee's progress shows "Waiting for the Encoder".

### TC-02: Validate blocked when a check is missing
- **Steps:** Open a request. Tick two of the three. Try to validate (the button, then the API with one check false and with one check missing).
- **Expected:** The button is disabled. The API returns 400 both times. Status unchanged. No history row.

### TC-03: Reject with a reason
- **Steps:** Open a request. Click Reject. Try to confirm with no reason, then enter "ID not surrendered" and confirm. Then, as the trainee, open the request.
- **Expected:** Confirm is blocked without a reason. The status is `REJECTED` and the clearance status `NOT_CLEARED`. One history row with the reason. The trainee sees the reason and can submit a new request.

### TC-04: The Trainer cannot be skipped, and wrong statuses
- **Precondition:** Requests in each of `PENDING_VALIDATION`, `REGISTRAR_VALIDATED`, `PROCESSED`, `RELEASED`, `REJECTED`, `CANCELLED`.
- **Steps:** Call validate and reject on each by API as the registrar.
- **Expected:** 400 for every one, including `PENDING_VALIDATION`. Nothing changes. No history row.

### TC-05: Payment history and context
- **Precondition:** A trainee with two official receipts, a requirements checklist with one document missing and a uniform not yet given.
- **Steps:** Open the request as the registrar.
- **Expected:** The panel lists both receipts (OR number, date, amount, reason, method), the checklist with the missing document, and the uniform status "Not given". Validate is still possible once the three boxes are ticked, because these are information only.

### TC-06: Role access
- **Steps:** Call every Registrar endpoint as Trainee, Trainer, Encoder and Admin, and with no token.
- **Expected:** 403 for the four roles, 401 without a token. The four roles cannot open the page.

### TC-07: Request history and search
- **Precondition:** A registrar with two requests waiting, one validated and one rejected.
- **Steps:** Look at the main list and the history table. Type part of a trainee's name or a control number in the history search. Reload with the search and page in the URL.
- **Expected:** The main list shows the two waiting ones. The history shows the validated and the rejected, newest first. The search keeps only matching rows, and a non-matching term shows "No requests match your search". The same view comes back after the reload.

### TC-08: Two registrars at once
- **Precondition:** One request in `TRAINER_VALIDATED`.
- **Steps:** Send two validate calls at the same time. Then on a second request send a validate and a reject at the same time.
- **Expected:** One succeeds in each pair, the other gets 400. One history row each. The final status matches the winner.

### TC-09: Logs
- **Precondition:** A request validated by the Trainer and then the Registrar, and carried on by the Encoder.
- **Steps:** Open the request from the Request history table.
- **Expected:** The timeline shows every step in order with name, role, time and remark. There are no Validate or Reject buttons. No endpoint can edit or delete a row.

### TC-10: What the Encoder sees after the Registrar
- **Steps:** Validate a request as the registrar. Open it as the encoder.
- **Expected:** The Encoder sees the Registrar's validation (who, when), the clearance status `CLEARED`, "Surrendered ID: Yes", and the Trainer's validation. The request is in the Encoder's "Waiting for me".
