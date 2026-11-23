# Trainer: Clearance and Certificate Request, First Validation

| Field | Value |
|-------|-------|
| **Jira** | MP-61 |
| **Type** | Feature (Trainer page and endpoints, on top of the shared clearance module) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Depends on** | MP-60 (the form, the status values, `clearance_status_history` and the shared service). Build MP-60 first. The Trainer step of the withdrawal (MP-48) is the pattern to copy |
| **Related** | The Registrar step (MP-62) and the Encoder step (separate ticket, to be created). FUNC-006 and FUNC-007 (attendance and competency, for automatic checks later) |
| **Interface** | Trainer: `/trainer/clearance-requests`. "Clearance" sidebar link under Training |
| **Overview** | `shared/clearance-request/acceptance.md` (CL-19 to CL-22 there are the short version of this file) |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** to see the clearance and certificate requests from my own trainees and confirm that each trainee has really finished the training,
**so that** only trainees who completed everything move on to the Registrar.

## Background

- The Trainer is the **first step** of the clearance pipeline: Trainee submits, **Trainer validates**, Registrar validates, Encoder processes, Released.
- The Trainer is also the first office on the paper form ("Trainer" in the clearance table). The interview says the trainers and the registrar check unreturned equipment and unfinished work before a clearance is signed.
- The Trainer acts only on `PENDING_VALIDATION`. Validate sets `TRAINER_VALIDATED` (the Registrar can then act). Reject sets `REJECTED` and the clearance status `NOT_CLEARED`.
- A trainer sees only requests from trainees in their own batches, the same rule as Trainee Information (MP-50) and the withdrawal (MP-48).

## What the Trainer Validates

The Trainer confirms four things. **All four must be confirmed to validate.** If one is not true the Trainer rejects with a reason.

| # | The Trainer confirms | Why the Trainer | Today |
|---|----------------------|-----------------|-------|
| 1 | **Training hours and attendance are complete** | The Trainer keeps the attendance sheet | Paper and Excel. Ticked by hand until attendance is built (FUNC-006) |
| 2 | **The assessments are done:** the written, practical and oral interview parts needed for completion | The Trainer grades all three (interview, Phase 2.3) | Ticked by hand until competency records are built (FUNC-007) |
| 3 | **The portfolio and required outputs are submitted** | The Trainer collects them (trainee project portfolio, paper Figure 21) | Ticked by hand |
| 4 | **Tools and equipment are returned** | The Trainer lends and takes back the tools (interview: borrowing slips) | Paper slips. Ticked by hand |

**Not the Trainer's checks:** fees settled, ID surrendered and documents submitted. Those belong to the Registrar. The interview says a trainer can see the graduation fee monitoring, but the fee check stays with the Registrar (see open question 2).

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Are these four checks right, or should there be fewer or more? | **Assumed:** these four. All required |
| 2 | Should the Trainer also see whether the graduation fee is paid? | **Assumed:** no. The Registrar checks fees. The Trainer sees only the four checks |
| 3 | When attendance and competency records exist, should the checks fill in by themselves? | **Assumed:** later. Out of scope here. The boxes are ticked by hand |
| 4 | Must a reject name which check failed? | **Assumed:** the reason is free text and required. The checks that were ticked are saved with it |
| 5 | If a batch has an assistant trainer, can they act? | **Assumed:** no. Only the trainer assigned to the batch, as in MP-48 |

## Scope

### A. The page (`/trainer/clearance-requests`)

- **List.** One row per request: control number, trainee name and system ID, program, batch, certificate requested, date requested and status. Default view "Waiting for me" (`PENDING_VALIDATION`), **oldest first**. A status filter, a batch filter, a name or system ID search, paging. All kept in the URL.
- **Side panel.** The whole form, read-only: control number, trainee information, certificates requested (with the "Other" text), purpose, the student's certification date and the date requested. Then the four checks, the approval progress (Trainer, Registrar, Encoder, Release), the history, and **Validate** and **Reject**, each with a confirm step.
- **Request history table.** Below the list: the requests this trainer already validated or rejected, newest first, with its own search and status filter. Opening one shows the timeline and no buttons.

### B. Validate and reject

- **Validate** needs all four checks ticked. Remarks are optional. It sets `TRAINER_VALIDATED` and saves who, when, the remark and the four checks.
- **Reject** needs a reason. The checks do not have to be ticked. It sets `REJECTED` and the clearance status `NOT_CLEARED`. The trainee sees the reason.

### C. The logs

- Every action writes one `clearance_status_history` row in the same transaction as the change: old status, new status, the trainer, the time and the remark. Append-only.

## Design

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Controller | `src/users/trainer/clearance/trainer-clearance.controller.ts` | `@Controller('trainer/clearance-requests')`, `@Roles(Role.TRAINER)` |
| Service | shared `ClearanceService` (MP-60), Trainer methods | List, detail, `trainerDecide`. No copied logic |
| DTOs | `.../dto/` | List query, decision body (`decision`: `VALIDATE` or `REJECT`, the four checks, `remarks`) |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/trainer/clearance-requests` | List with status, batch, search and paging |
| GET | `/api/trainer/clearance-requests/filter-options` | Statuses and this trainer's batches |
| GET | `/api/trainer/clearance-requests/:id` | Detail with the history |
| PATCH | `/api/trainer/clearance-requests/:id/validate` | Validate or reject |

### Schema (in the MP-60 migration, or one small migration here if MP-60 is already merged)

- On `clearance`: `trainer_validated_by` (FK to users), `trainer_validated_at`, `trainer_remarks`, and the four checks `trainer_hours_complete`, `trainer_assessments_complete`, `trainer_portfolio_submitted`, `trainer_tools_returned` (booleans, default false). This replaces the single `trainer_requirements_checked` in the MP-60 overview.

### Frontend

| Piece | Location |
|-------|----------|
| Page | `src/pages/users/trainer/clearance/TrainerClearancePage.tsx` and panel component |
| API | `src/api/users/trainer-clearance.api.ts` |
| Route | `/trainer/clearance-requests`, guarded for `TRAINER` only. Sidebar link "Clearance" |

## Out of Scope

- The trainee form and the shared module (MP-60). The Registrar and Encoder steps.
- Filling the checks from attendance or competency records (FUNC-006, FUNC-007).
- The fee check.
- Notifications (MP-52).
- Editing a submitted form, or any history row.

---

## Acceptance Criteria

### Access and Scope

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CT-1 | A trainer can open `/trainer/clearance-requests`. The Trainer sidebar has a "Clearance" link under Training | NOT STARTED | |
| CT-2 | Trainee, registrar, encoder and admin get 403 from every Trainer endpoint and cannot open the page. Every endpoint returns 401 without a token | NOT STARTED | |
| CT-3 | The trainer sees only requests from trainees in their own batches. A request from another batch returns 403 by id and never appears in a list or a search | NOT STARTED | Same rule as MP-48 TR-1 |
| CT-4 | Responses never include `password_hash`. The trainer sees what the form shows (name, system ID, contact number, address, program, batch, certificate, purpose) and no parents, beneficiary or insurance data | NOT STARTED | |

### The List

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CT-5 | The default view is "Waiting for me" (`PENDING_VALIDATION`), oldest request first. A status filter shows All, Waiting, Validated by me and Rejected by me | NOT STARTED | |
| CT-6 | The list has a batch filter (only this trainer's batches), a name or system ID search where every word must match, and paging. Status, batch, search and page are kept in the URL | NOT STARTED | |
| CT-7 | Each row shows control number, trainee name and system ID, program, batch, certificate requested, date requested and status | NOT STARTED | |
| CT-8 | Loading, empty ("No requests are waiting for you") and error states are shown | NOT STARTED | |

### The Side Panel

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CT-9 | The panel shows the whole form read-only: control number, trainee information, certificates requested (with the "Other" text), purpose, the student's certification date and the date requested | NOT STARTED | |
| CT-10 | The panel shows the approval progress (Trainer, Registrar, Encoder, Release) and the history with who, when and any remark | NOT STARTED | |
| CT-11 | The panel shows the four checks (hours and attendance, assessments, portfolio, tools and equipment) as boxes the trainer ticks | NOT STARTED | |

### Validate and Reject

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CT-12 | Validate needs all four checks ticked. The Validate button stays disabled until they are. The API returns 400 if any is false or missing, and nothing changes | NOT STARTED | |
| CT-13 | Remarks are optional on validate and have a length limit. A reason is **required on reject** (400 without one) | NOT STARTED | Same rule as MP-48 TR-3 |
| CT-14 | Validate sets `TRAINER_VALIDATED` and saves `trainer_validated_by`, `trainer_validated_at`, the remark and the four checks. The client cannot set the status, another trainer as the validator, or the Registrar or Encoder fields | NOT STARTED | |
| CT-15 | Reject sets `REJECTED` and the clearance status `NOT_CLEARED`, and saves the reason and who and when. The checks do not have to be ticked | NOT STARTED | |
| CT-16 | The trainer can act only when the status is `PENDING_VALIDATION`. `TRAINER_VALIDATED`, `REGISTRAR_VALIDATED`, `PROCESSED`, `RELEASED`, `REJECTED` and `CANCELLED` return 400 and change nothing | NOT STARTED | |
| CT-17 | Validate and Reject each have a confirm step. Reject cannot be confirmed without a reason | NOT STARTED | |
| CT-18 | After a validate, the request leaves "Waiting for me", the Registrar can see it, and the trainee's progress moves to the Registrar stage. After a reject the trainee sees the reason | NOT STARTED | |

### The Logs and the History Table

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CT-19 | Every validate or reject writes one `clearance_status_history` row (old status, new status, the trainer, the time, the remark) in the same transaction as the change. If any part fails, none is saved | NOT STARTED | |
| CT-20 | The Request history table lists only the requests this trainer already validated or rejected, newest first, with its own search and status filter kept in the URL. A decided request does not disappear. Opening one shows the timeline and no Validate or Reject buttons | NOT STARTED | Same pattern as MP-48 TR-11 and TR-12 |
| CT-21 | The trainer can read the history of any request in their own batches. No endpoint edits or deletes a history row | NOT STARTED | Append-only by convention, not by the database |

### Concurrency and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CT-22 | A trainee cancelling and the trainer acting on the same request at the same moment: exactly one wins, the other gets 400, and the history matches the final status. The same trainer acting twice (two tabs) validates once | NOT STARTED | Conditional update on the current status |
| CT-23 | Backend and frontend lint, type-check and build pass with 0 problems. Unit tests cover validate, reject, a missing check, a missing reason, every wrong status, batch scope and concurrency | NOT STARTED | |
| CT-24 | The existing Trainer withdrawal page, its endpoints and its tests are not affected | NOT STARTED | |

---

## Test Cases

### TC-01: Validate with all four checks
- **Precondition:** A request in `PENDING_VALIDATION` from a trainee in this trainer's batch.
- **Steps:**
  1. Log in as the trainer. Open `/trainer/clearance-requests`. The request is in "Waiting for me".
  2. Open it. Read the form. Tick the four checks. Click Validate and confirm.
- **Expected:** Status `TRAINER_VALIDATED`. The request leaves "Waiting for me" and appears in the Request history table. One history row. The trainee's progress shows "Waiting for the Registrar". The Registrar can now see it.

### TC-02: Validate blocked when a check is missing
- **Steps:** Open a request. Tick only three of the four. Try to validate (the button, then the API with one check false and with one check missing).
- **Expected:** The button is disabled. The API returns 400 both times. Status unchanged. No history row.

### TC-03: Reject with a reason
- **Steps:** Open a request. Click Reject. Try to confirm with no reason, then enter "Tools not returned" and confirm. Then, as the trainee, open the request.
- **Expected:** Confirm is blocked without a reason. The status is `REJECTED` and the clearance status `NOT_CLEARED`. One history row with the reason. The trainee sees "Tools not returned" and can submit a new request.

### TC-04: Reject by API without a reason
- **Steps:** Send a reject with no remark, then with an empty remark.
- **Expected:** 400 both times. Nothing changes.

### TC-05: Wrong status
- **Precondition:** Requests in each of `TRAINER_VALIDATED`, `REGISTRAR_VALIDATED`, `PROCESSED`, `RELEASED`, `REJECTED`, `CANCELLED`.
- **Steps:** Call validate and reject on each by API as the trainer.
- **Expected:** 400 for every one. Nothing changes. No history row.

### TC-06: Batch scope
- **Precondition:** Two trainers, each with a batch, and one request in each.
- **Steps:** As trainer A, list the requests, search for the name of trainer B's trainee, and open trainer B's request by id.
- **Expected:** Only A's request is listed. The search finds nothing of B's. Opening B's request by id returns 403.

### TC-07: Role access
- **Steps:** Call every Trainer endpoint as Trainee, Registrar, Encoder and Admin, and with no token.
- **Expected:** 403 for the four roles, 401 without a token. The four roles cannot open the page.

### TC-08: Request history and search
- **Precondition:** A trainer with two requests waiting, one validated and one rejected.
- **Steps:** Look at the main list and the history table. Type part of a trainee's name in the history search. Reload with the search and page in the URL.
- **Expected:** The main list shows the two waiting ones. The history shows the validated and the rejected, newest first. The search keeps only matching rows, and a non-matching name shows "No requests match your search". The same view comes back after the reload. Another trainer's decided requests never appear.

### TC-09: Trainee cancels while the trainer validates
- **Precondition:** A request in `PENDING_VALIDATION`.
- **Steps:** Send the trainee's cancel and the trainer's validate for the same request at the same moment.
- **Expected:** Exactly one wins. The loser gets 400. The status is either `CANCELLED` or `TRAINER_VALIDATED`, with exactly one matching history row. The same trainer validating twice from two tabs validates once.

### TC-10: Logs
- **Precondition:** A request validated by this trainer, then taken through the Registrar and Encoder steps.
- **Steps:** Open the request from the Request history table.
- **Expected:** The timeline shows every step in order with name, role, time and remark. There are no Validate or Reject buttons. No endpoint can edit or delete a row.
