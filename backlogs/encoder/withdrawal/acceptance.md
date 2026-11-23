# Encoder Withdrawal: Verification Step and Withdrawal Logs

| Field | Value |
|-------|-------|
| **Jira** | To be created (suggested name: "Withdrawal, Encoder: verify withdrawal request and view logs"). Related: MP-45, MP-46, MP-47, MP-48, MP-49, MP-57 |
| **Type** | Feature (a new step in the withdrawal pipeline, Encoder only, plus the logs for it) |
| **Status** | NOT STARTED |
| **Assignee** | Not assigned |
| **Depends on** | MP-45 (schema), MP-46 to MP-49 (the existing steps). MP-57 (Encoder bell) is not needed. Notifications are out of scope |
| **Interface** | Encoder: new page `/encoder/withdrawal-requests`. Sidebar link "Withdrawals" |
| **Added** | 2026-11-23. Order and role decided by the project leader on the same day |
| **Branch** | Not started. This file lives on the docs branch only |

---

## User Story

**As** an encoder,
**I want** to check a withdrawal request after the Registrar and the Trainer have validated it, and pass it on to the Admin or send it back with a remark,
**so that** the Admin signs off only requests whose trainee records are correct, and every step is logged.

## Background

- Today the withdrawal pipeline is Trainee, Trainer, Registrar, Admin sign-off (decision D-06, `shared/withdrawal/acceptance.md`). The Encoder has no part in it.
- The project leader decided the new order: **Registrar, then Trainer, then Encoder, then Admin sign-off.** The Encoder verifies, then passes the request on or returns it.
- The Encoder is the keeper of the trainee records, so this is the step that checks the records before the Admin signs off and the enrollment becomes WITHDRAWN.
- Every step already writes a row to `withdrawal_status_history` (MP-45). This ticket keeps that rule and shows the history to the Encoder.
- The Encoder does not reject. The Registrar, the Trainer and the Admin keep the right to reject. The Encoder verifies or returns.

## New Status Flow

```
PENDING_VALIDATION --(Registrar validates)--> REGISTRAR_VALIDATED --(Trainer validates)--> TRAINER_VALIDATED --(Encoder verifies)--> PENDING_ADMIN_SIGNOFF --(Admin signs off)--> APPROVED
        |                                            |                                            |
        '-- Registrar rejects --> REJECTED           '-- Trainer rejects --> REJECTED             '-- Encoder returns (remark) --> REGISTRAR_VALIDATED
        '-- trainee cancels before any validation --> CANCELLED                                                                   (back to the Trainer)
                                                                                      Admin rejects (from PENDING_ADMIN_SIGNOFF) --> REJECTED
```

**Rule: each step acts only on the status the step before it leaves.**

| Step | Acts only on | Sets |
|------|--------------|------|
| Registrar (MP-47) | `PENDING_VALIDATION` | `REGISTRAR_VALIDATED` or `REJECTED` |
| Trainer (MP-48) | `REGISTRAR_VALIDATED` | `TRAINER_VALIDATED` or `REJECTED` |
| **Encoder (this ticket)** | **`TRAINER_VALIDATED`** | **`PENDING_ADMIN_SIGNOFF`, or back to `REGISTRAR_VALIDATED` when returned** |
| Admin (MP-49) | `PENDING_ADMIN_SIGNOFF` | `APPROVED` or `REJECTED` |

Any other status returns 400 for the step that tries to act.

## What This Changes in the Tickets Already Built

This order reverses decision D-06 (Trainer first, then Registrar). It touches finished work:

| Ticket | Change |
|--------|--------|
| MP-45 (schema) | Add `REGISTRAR_VALIDATED` to `withdrawal_status_enum` (AC 6a of MP-45 says it must not exist). Add Encoder columns to `withdrawal_request`. One additive migration |
| MP-47 (Registrar) | Acts on `PENDING_VALIDATION` (was `TRAINER_VALIDATED`) and sets `REGISTRAR_VALIDATED` |
| MP-48 (Trainer) | Acts on `REGISTRAR_VALIDATED` (was `PENDING_VALIDATION`) and sets `TRAINER_VALIDATED`. "Waiting for me" default changes |
| MP-46 (Trainee) | The progress view shows Request, Registrar, Trainer, Encoder, Admin. The duplicate-open-request check also covers `REGISTRAR_VALIDATED` |
| MP-49 (Admin) | Unchanged: still acts on `PENDING_ADMIN_SIGNOFF`, which is now reached through the Encoder |

## Open Questions

| # | Question | Assumption until answered |
|---|----------|---------------------------|
| 1 | Where does a returned request go? | **Assumed:** back to the Trainer (`REGISTRAR_VALIDATED`), with the Encoder's remark shown. The Trainer must validate again |
| 2 | Can the Encoder reject? | **Assumed:** no. Verify or return only |
| 3 | What happens to a request that is in flight when the order changes? On 2026-11-23 the shared database has **1 request in `TRAINER_VALIDATED`** (under the old order it was waiting for the Registrar) | **Assumed:** the migration moves it to `PENDING_VALIDATION`, so the Registrar goes first, and a history row notes the reset. Other options: let it finish under the old order, or move it to `TRAINER_VALIDATED` (waiting for the Encoder) |
| 4 | What must the Encoder confirm before verifying? | **Assumed:** one confirmation, "Trainee records checked", required to verify. Remarks optional on verify, required on return |
| 5 | Does the Encoder see every request, or only some? | **Assumed:** every request. The Encoder already sees all trainees (MP-51). The default list shows only the ones waiting for the Encoder |

## Scope

### A. The page (`/encoder/withdrawal-requests`)

- **List.** One row per request: trainee name and system ID, program, batch, reason (shortened), status and the date requested. Default view is "Waiting for me" (`TRAINER_VALIDATED`). A status filter and a name or system ID search. Paged. Filter, search and page are kept in the URL.
- **Side panel.** Request details, the trainee's reason, the approval progress (Registrar, Trainer, Encoder, Admin), the full history, and the buttons **Verify** and **Return**. Verify needs the "Trainee records checked" box ticked. Return cannot be confirmed without a remark.
- **Request history table.** Below the list: the requests this encoder already verified or returned, newest first, with its own search and status filter. Opening one shows the history with no buttons.

### B. The logs

- Every Encoder action writes a `withdrawal_status_history` row in the same transaction as the status change: old status, new status, who, when and the remark.
- The Encoder can read the full history of any request. Each entry shows the person's name and role.
- History is append-only. No screen or endpoint edits or deletes it.

## Design

### Backend

| Piece | Location | Responsibility |
|-------|----------|----------------|
| Module | `src/users/encoder/withdrawal/` | Imports the shared `WithdrawalModule` |
| Controller | `.../encoder-withdrawal.controller.ts` | `@Controller('encoder/withdrawal-requests')`, `@Roles(Role.ENCODER)` |
| Service | shared `WithdrawalService` (add Encoder methods) | List, detail, `encoderDecide`. No copied logic |
| DTOs | `.../dto/` | List query, decision body (`decision`: `VERIFY` or `RETURN`, `recordsChecked`, `remarks`) |

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/encoder/withdrawal-requests` | List with status filter, search and paging |
| GET | `/api/encoder/withdrawal-requests/filter-options` | Status options |
| GET | `/api/encoder/withdrawal-requests/:id` | Detail with the history |
| PATCH | `/api/encoder/withdrawal-requests/:id/verify` | Verify or return |

### Schema (one additive migration)

- `withdrawal_status_enum`: add `REGISTRAR_VALIDATED`.
- `withdrawal_request`: add `encoder_verified_by` (FK to users, nullable), `encoder_verified_at`, `encoder_remarks`, `encoder_records_checked` (boolean, default false).
- No change to `withdrawal_status_history`.

### Frontend

| Piece | Location |
|-------|----------|
| Page | `src/pages/users/encoder/withdrawal/EncoderWithdrawalPage.tsx` and panel component |
| API | `src/api/users/encoder-withdrawal.api.ts` |
| Route | `/encoder/withdrawal-requests`, guarded for `ENCODER` only |
| Sidebar | "Withdrawals" link for the Encoder |

## Out of Scope

- Notifying the Encoder or the trainee (MP-52, MP-57).
- An Encoder-only activity log page with export. The logs are the request history and the Request history table.
- The Encoder rejecting a request.
- Editing a request, a reason, or any history row.
- Clearance and certificate work.

---

## Acceptance Criteria

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| EN-1 | The Encoder can open `/encoder/withdrawal-requests`. The Encoder sidebar has a "Withdrawals" link | NOT STARTED | |
| EN-2 | Admin, registrar, trainer and trainee get 403 from every Encoder endpoint and cannot open the page | NOT STARTED | |
| EN-3 | Every Encoder endpoint returns 401 without a token | NOT STARTED | |

### The Pipeline Order

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| EN-4 | A new request starts as `PENDING_VALIDATION`. Only the Registrar can act on it | NOT STARTED | Changes MP-47 |
| EN-5 | After the Registrar validates, the status is `REGISTRAR_VALIDATED`. Only the Trainer can act on it | NOT STARTED | Changes MP-48 |
| EN-6 | After the Trainer validates, the status is `TRAINER_VALIDATED`. Only the Encoder can act on it | NOT STARTED | |
| EN-7 | After the Encoder verifies, the status is `PENDING_ADMIN_SIGNOFF`. Only the Admin can act on it | NOT STARTED | MP-49 unchanged |
| EN-8 | A step that tries to act on any other status gets 400 and nothing changes. The Encoder cannot act on `PENDING_VALIDATION`, `REGISTRAR_VALIDATED`, `PENDING_ADMIN_SIGNOFF`, `APPROVED`, `REJECTED` or `CANCELLED` | NOT STARTED | |
| EN-9 | The Admin sees only requests the Encoder has verified. A request the Encoder has not verified never reaches the Admin list | NOT STARTED | |
| EN-10 | The trainee's progress view shows the stages in the order Request, Registrar, Trainer, Encoder, Admin, with the current stage | NOT STARTED | Changes MP-46 |
| EN-11 | A duplicate open request returns 409 for every open status, including `REGISTRAR_VALIDATED` | NOT STARTED | Changes MP-46 T-3 |

### The Encoder Page

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| EN-12 | The list shows trainee name and system ID, program, batch, shortened reason, status and date requested | NOT STARTED | |
| EN-13 | The default view is "Waiting for me" (`TRAINER_VALIDATED`). A status filter shows the others, and a name or system ID search matches every word. Paged, with the filter, search and page kept in the URL | NOT STARTED | |
| EN-14 | The side panel shows the request, the trainee's reason, the progress, and the history. Verify and Return have a confirm step | NOT STARTED | |
| EN-15 | The Request history table lists only the requests this encoder verified or returned, newest first, with its own search and status filter. It has no Verify or Return buttons | NOT STARTED | Same pattern as MP-48 TR-11 and TR-12 |
| EN-16 | Loading, empty and error states are shown | NOT STARTED | |

### Verify and Return

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| EN-17 | Verify needs `recordsChecked = true`. Without it the request returns 400 and nothing changes. The Verify button stays disabled until the box is ticked | NOT STARTED | Open question 4 |
| EN-18 | Verify sets `PENDING_ADMIN_SIGNOFF` and saves `encoder_verified_by`, `encoder_verified_at`, `encoder_records_checked` and the optional remark. The client cannot set the status, the Registrar, Trainer or Admin fields, or another encoder as the verifier | NOT STARTED | |
| EN-19 | Return needs a remark. Without one the request returns 400. Return sets the status back to `REGISTRAR_VALIDATED` and saves the remark | NOT STARTED | Open questions 1 and 2 |
| EN-20 | After a return, the Trainer sees the request again under "Waiting for me" with the Encoder's remark visible, and the Trainer must validate again | NOT STARTED | |
| EN-21 | The Encoder has no reject action. A decision other than `VERIFY` or `RETURN` returns 400 | NOT STARTED | Open question 2 |
| EN-22 | The Encoder can act on a request only once. Verifying twice, or verifying after another encoder already did, returns 400 and does not change the history | NOT STARTED | |
| EN-23 | Two encoders acting on the same request at the same moment: one succeeds, the other gets 400. The status and the history stay consistent | NOT STARTED | Conditional update on the current status |
| EN-24 | A trainee cancelling and an Encoder action at the same moment cannot both win. Cancel is allowed only in `PENDING_VALIDATION` | NOT STARTED | Existing rule T-6 |

### The Logs

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| EN-25 | Every Encoder action (verify or return) writes one `withdrawal_status_history` row: old status, new status, the encoder, the time and the remark | NOT STARTED | |
| EN-26 | The status change, the Encoder columns and the history row are saved in one transaction. If any step fails, none is saved | NOT STARTED | |
| EN-27 | The history shown to the Encoder lists every step of the request in order (Registrar, Trainer, Encoder, Admin, and any return), newest first, each with the person's name, role, time and remark | NOT STARTED | |
| EN-28 | History rows are append-only. No Encoder endpoint edits or deletes a row, and a return adds a new row without changing earlier ones | NOT STARTED | Append-only by convention, not by the database |
| EN-29 | The Encoder can open the history of any request, not only those it handled | NOT STARTED | Open question 5 |

### Data and Quality

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| EN-30 | One additive migration: enum value `REGISTRAR_VALIDATED` and the four Encoder columns. It runs on a fresh database and on one that already has withdrawal rows. Existing rows keep their data | NOT STARTED | |
| EN-31 | The migration handles the in-flight request(s) as decided in open question 3, and writes a history row saying so | NOT STARTED | 1 request in `TRAINER_VALIDATED` on 2026-11-23 |
| EN-32 | Responses never include `password_hash` or contact details. The Encoder sees the trainee's name, system ID, program, batch, reason and enrollment status only | NOT STARTED | |
| EN-33 | Backend and frontend lint, type-check and build pass with 0 problems. Unit tests cover verify, return, wrong status, missing records check, missing return remark, concurrency, and the changed Registrar and Trainer order | NOT STARTED | |
| EN-34 | The existing withdrawal tests (Trainee, Trainer, Registrar, Admin) are updated for the new order and still pass | NOT STARTED | |

---

## Test Cases

### TC-01: Verify a request
- **Precondition:** A request in `TRAINER_VALIDATED`.
- **Steps:**
  1. Log in as Encoder and open `/encoder/withdrawal-requests`. The request is in "Waiting for me".
  2. Open it. Tick "Trainee records checked". Click Verify and confirm.
- **Expected:** Status becomes `PENDING_ADMIN_SIGNOFF`. The Admin now sees the request. One history row (`TRAINER_VALIDATED` to `PENDING_ADMIN_SIGNOFF`, the encoder, the time). The request moves to the Request history table.

### TC-02: Verify without the records check
- **Steps:** Open a request. Leave the box unticked. Try to verify (button, then API with `recordsChecked = false`).
- **Expected:** The button is disabled. The API returns 400. Status unchanged. No history row.

### TC-03: Return with a remark
- **Steps:** Open a request. Click Return. Try to confirm with no remark, then enter "ID number does not match the enrollment record" and confirm.
- **Expected:** Confirm is blocked without a remark. With a remark the status becomes `REGISTRAR_VALIDATED`, the remark is saved, and one history row is written. The Trainer sees it in "Waiting for me" with the remark.

### TC-04: Wrong status
- **Precondition:** Requests in each of `PENDING_VALIDATION`, `REGISTRAR_VALIDATED`, `PENDING_ADMIN_SIGNOFF`, `APPROVED`, `REJECTED`, `CANCELLED`.
- **Steps:** Call verify on each by API as the Encoder.
- **Expected:** 400 for every one. Nothing changes.

### TC-05: Order is enforced for the other steps
- **Steps:** Try to validate a `PENDING_VALIDATION` request as the Trainer. Try to validate a `REGISTRAR_VALIDATED` request as the Registrar. Try to sign off a `TRAINER_VALIDATED` request as the Admin.
- **Expected:** 400 for all three. The only valid move from each status is by the step named in the table.

### TC-06: Two encoders at once
- **Precondition:** One request in `TRAINER_VALIDATED`.
- **Steps:** Send two verify calls at the same time.
- **Expected:** One succeeds, one gets 400. One history row. Status `PENDING_ADMIN_SIGNOFF`.

### TC-07: Trainee cancel against Encoder action
- **Precondition:** A request in `PENDING_VALIDATION`, then moved to `TRAINER_VALIDATED` by the earlier steps.
- **Steps:** Trainee tries to cancel after the Registrar has validated.
- **Expected:** 400. Cancel works only in `PENDING_VALIDATION`.

### TC-08: Logs
- **Precondition:** A request that was validated by the Registrar and the Trainer, returned once by the Encoder, validated again by the Trainer, then verified by the Encoder.
- **Steps:** Open the request as the Encoder.
- **Expected:** The history shows every step in order, including the return and its remark, each with name, role and time. No row can be edited or deleted. The Request history table lists the request once.

### TC-09: Role access
- **Steps:** Call every Encoder endpoint as Admin, Registrar, Trainer and Trainee, and with no token.
- **Expected:** 403 for the four roles, 401 without a token.

### TC-10: In-flight request
- **Precondition:** A request in `TRAINER_VALIDATED` under the old order when the migration runs.
- **Steps:** Run the migration. Open the request.
- **Expected:** It follows the decision in open question 3, with a history row that says it was moved because the order changed.
