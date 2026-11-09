# MP-45 to MP-49: Withdrawal Approval Pipeline

| Field | Value |
|-------|-------|
| **Jira** | MP-45 (schema), MP-46 (Trainee), MP-47 (Registrar), MP-48 (Trainer), MP-49 (Admin) |
| **Type** | Feature |
| **Status** | MP-45 IN PROGRESS, MP-46 to MP-48 built, MP-49 BUILT on `feature/MP-49-admin-withdrawal-signoff` (not released) |
| **Branch (MP-45)** | `feature/MP-45-withdrawal-schema` |
| **Added** | 2026-11-04 |

A trainee asks to withdraw. The request must be validated by the **Registrar** and the **Trainer**, and only then does the **Admin** sign off. On approval the enrollment becomes `WITHDRAWN`.

---

## Build Order

MP-45 first (the others need its columns and status enum). MP-46 next. Then MP-48 (Trainer), then MP-47 (Registrar), because the Registrar can only act after the Trainer. MP-49 last.

## Status Flow (decision D-06, sequential)

```
PENDING_VALIDATION --(Trainer validates)--> TRAINER_VALIDATED --(Registrar validates)--> PENDING_ADMIN_SIGNOFF --(Admin signs off)--> APPROVED
        |                                          |                                              |
        '-- Trainer rejects --> REJECTED           '-- Registrar rejects --> REJECTED             '-- Admin rejects --> REJECTED
        '-- trainee cancels before completion --> CANCELLED
```

**Rule: the request goes to the Admin only after BOTH the Trainer and the Registrar have validated, in that order.**
- MP-48 (Trainer) acts only on `PENDING_VALIDATION`.
- MP-47 (Registrar) acts only on `TRAINER_VALIDATED`.
- MP-49 (Admin) acts only on `PENDING_ADMIN_SIGNOFF`.
- Any other status returns 400.

Decision and reasons: `registrar/decisions.md` D-06. The earlier parallel design (and its race condition) was dropped.

## MP-45 Schema (this branch)

- New enum `withdrawal_status_enum`.
- `withdrawal_request` gets the registrar checklist (`surrendered_id` (existing column, reused), `finances_cleared`, `documents_submitted`), the registrar, trainer and admin sign-off columns, and `withdrawal_status`.
- New table `withdrawal_status_history` (audit log of every status change).
- One additive migration: `20261104_withdrawal_pipeline_schema`. Legacy columns (`reviewed_by`, `date_reviewed`, `remarks`) are kept, and `surrendered_id` is reused for the registrar's "ID surrendered" check. Existing rows are backfilled from `request_status`.

---

## Race condition: no longer applies

The parallel design had a race condition (two validators approving in the same second could leave a request stuck). The sequential flow removes it, because only one validator can act at a time. Still use one transaction for the status change and its history row.

---

## Acceptance Criteria (MP-45)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | The migration runs cleanly on a database that already has `withdrawal_request` rows | PASS | Tested 2026-11-04 on a local PostgreSQL 17 with 4 seeded legacy rows. Applied to Supabase 2026-11-04 (table was empty). See `migration.md` |
| 2 | `npx prisma generate` produces no errors | PASS | Generated 2026-11-04 |
| 3 | All new enums and tables are accessible through the Prisma client | PASS | Client regenerated |
| 4 | Existing rows keep their data (additive, not destructive) | PASS | Verified on the local test database. Legacy columns kept |
| 5 | Indexes exist on `withdrawal_status` and `withdrawal_status_history(withdrawal_request_id, changed_at DESC)` | PASS | In the migration SQL |
| 6 | Exactly one migration for all schema changes | PASS | |
| 6a | `withdrawal_status_enum` has exactly `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `PENDING_ADMIN_SIGNOFF`, `APPROVED`, `REJECTED`, `CANCELLED` (no `REGISTRAR_VALIDATED`) | PASS | D-06. Added to the Jira ticket 2026-11-04 |

## Acceptance Criteria (MP-46, Trainee)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| T-1 | Trainee can submit a withdrawal request for their own `ENROLLED` enrollment | PASS (API) | Backend branch `feature/withdrawal-trainee-request-api`. Tested against a real local database |
| T-2 | Submitting for a non-enrolled or non-own enrollment returns 400/403 | PASS (API) | Not enrolled: 400. Not own or missing: 403 (same answer, so ids are not revealed) |
| T-3 | Submitting a duplicate open request (`PENDING_VALIDATION`, `TRAINER_VALIDATED` or `PENDING_ADMIN_SIGNOFF`) returns 409 | PASS (API) | Widened from "pending" because of the longer pipeline. Two simultaneous submits: 60 of 60 races gave one winner and a 409 |
| T-4 | Trainee sees all their requests with enrollment and program context | PASS (API) | List is scoped to the caller, paginated, optional status filter |
| T-5 | The pipeline view shows the stages in the order Request, Trainer, Registrar, Admin, with real-time status | PASS (not yet checked in a browser) | Stepper built. Stage logic checked on 10 cases (every status, rejection at each stage, cancel). Components server-rendered for all 6 states. The page re-checks every 30 s while a request is open. **Not yet looked at in a real browser** |
| T-6 | Trainee can cancel only while `PENDING_VALIDATION`; otherwise 400 | PASS (API) | Conditional update, so a cancel and a trainer action at the same moment cannot both win |
| T-7 | All responses exclude `password_hash`; non-trainee roles get 403 | PASS (API) | Responses select named fields only. Role guard `@Roles(TRAINEE)` on the controller. Another trainee's request returns 404 |
| T-8 | Pages type-check, build and lint with 0 problems | PASS | Backend: tsc, build, eslint, 72 of 72 unit tests, plus a 30-check real HTTP run. Frontend: `tsc -b`, `vite build` and `eslint .` all pass |

## Acceptance Criteria (MP-48, Trainer, first validation)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TR-1 | Trainer sees only requests from trainees in their own batches; other batches return 403 | PASS (API) | List is scoped by `batch.trainer.user_id` (the same rule as Trainee Information). Another trainer's request: read and validate both 403, and nothing changes. Missing id: 404 |
| TR-2 | Default view shows `PENDING_VALIDATION` | PASS (API) | `status=ALL` shows everything. Also filters by status, batch and trainee name or system ID (every word must match), paginated |
| TR-3 | Trainer can approve or reject, only when the status is `PENDING_VALIDATION` (400 otherwise). Remarks are optional on approve and **required on reject** | PASS (API) | D-07. Reject without or with blank remarks: 400. The status guard is inside the update, so a cancel at the same moment cannot also succeed |
| TR-4 | Approval sets `TRAINER_VALIDATED`. Rejection sets `REJECTED` | PASS (API) | Records who validated and when. The client cannot set the status, the registrar or admin fields, or another validator: those fields in the request are ignored |
| TR-5 | Every action writes a history row, in one transaction | PASS (API) | Checked in 60 simultaneous trainer-versus-trainee and trainer-versus-trainer races: exactly one winner and a consistent history every time |
| TR-6 | Responses exclude `password_hash`; non-trainer roles get 403 | PASS (API) | The trainer sees the trainee's name and system ID only: no contact details or other personal data. Trainee, admin: 403 |
| TR-7 | Pages type-check, build and lint with 0 problems | PASS | Backend: `tsc`, build and ESLint pass, 101 of 101 tests, 53 of 53 real-HTTP checks. Frontend: `tsc -b`, `eslint .` and `vite build` pass |
| TR-8 | Trainer page `/trainer/withdrawal-requests`: list with "Waiting for me" default, status filter, name or system ID search, pagination, all kept in the URL. Sidebar link under Training | PASS (not yet checked in a browser) | Built. The open request is also kept in the URL, so a reload or a shared link reopens the panel |
| TR-9 | Side panel: request details, the trainee's reason, the approval progress, history, and Approve and Reject with a confirm step. Reject cannot be confirmed without a reason | PASS (not yet checked in a browser) | D-07. Panel renders its initial state with dialog semantics and a labelled close button. Closes with Escape. After a decision it shows the new status and the list refreshes |
| TR-10 | Batch filter on the trainer page | NOT DONE | The API supports `batchId`. The page has no batch filter because there is no endpoint yet that lists a trainer's batches (the trainer API client is an empty stub). **Open gap:** to be added to `to-be-discussed.md` once `dev` has been synced with `staging` (the gap log on `dev` lacks items 10 to 14, so a new item now would clash on merge). Options: a small endpoint that lists the trainer's batches (a "My Batches" ticket would need it too), or accept name and system ID search as enough for now |
| TR-11 | A decided request does not disappear. Below the main list the trainer page has a **Request history** table with only the requests this trainer already approved or rejected (including ones now with the registrar or admin), newest decision first. New requests (`PENDING_VALIDATION`) stay in the main list at the top and never appear in the history. Cancelled-before-review requests are not in the history | PASS (API, 45 of 45 real-HTTP checks on a throwaway database) / page not yet checked in a browser | API: `status=DECIDED` = this trainer's batches and `trainer_validated_by` is set, ordered by `trainer_validated_at` desc (unit test added, 102 of 102). Page: second table with its own pagination (`logPage` in the URL). Both tables refresh after a decision |
| TR-12 | The Request history has its own **Search trainee** box (first, middle or last name, or system ID; every word must match), separate from the main list's search. It is kept in the URL (`logSearch`), resets the history to page 1, and shows "No requests match your search" when empty | PASS (API: name, last name, system ID, two words, no match, SQL text) / search box not yet checked in a browser | Reuses the server-side search. Searching the history does not change the main list, and the other way round |

### Test cases for TR-11 and TR-12 (manual, trainer with at least two requests)

1. With one request waiting and none decided: the main list shows it, the history says "You have not approved or rejected any request yet."
2. Open the request, approve it. The main list no longer shows it and the history now does, with status "Waiting for registrar" and the trainee's name on top.
3. Do the same with another request and reject it (with a reason). The history shows it as "Rejected", above the first one.
4. A new request submitted by a trainee appears at the top (main list) only, never in the history.
5. A request the trainee cancelled before the trainer acted is in neither the history nor the waiting list (it shows under "All requests" in the main filter).
6. Type part of a trainee's name (or system ID) in the history search: only matching decided requests remain; a non-matching name shows "No requests match your search"; clear it and all come back. The main list is unaffected.
7. Reload with `logSearch` and `logPage` in the URL: the same view comes back.
8. Another trainer's decided requests never appear in this trainer's history (API 403 on opening one by id).
9. "View" on a history row opens the side panel with the full timeline and no Approve or Reject buttons.

## Acceptance Criteria (MP-47, Registrar, after the Trainer)

Decisions: D-08, D-09, D-10 and D-11 in `registrar/decisions.md`. "API" means checked by real requests against a throwaway database (109 checks). "Browser" means a person using the screens.

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| R-1 | Default view shows only requests waiting for the registrar (`TRAINER_VALIDATED`). "All requests" and each status can be chosen | PASS (API). Browser not run | TC-R2, TC-R12 |
| R-2 | The registrar can act only when the status is `TRAINER_VALIDATED`. Any other status, including `PENDING_VALIDATION`, returns 400 | PASS (API) | TC-R4 |
| R-3 | Approve needs both checks ticked (finances cleared, documents submitted), enforced on the server. Reject saves them as they are. Both are manual ticks. ID surrendered is not a registrar item | PASS (API) | TC-R5, TC-R8. D-09 |
| R-3a | A reason is required to reject (blank counts as none, up to 1000 characters) and is optional to approve | PASS (API) | TC-R5. D-08 |
| R-3b | The panel shows whether the enrollment fee is paid (receipt number, date and amount when paid). Only an enrollment-fee receipt counts. It never ticks or blocks anything | PASS (API). Browser not run | TC-R9, TC-R14. D-09 |
| R-3c | A pop-up shows the trainee's whole payment history from the Enrollment fee box: date, receipt number, what for, method and amount, oldest first, at most 50. Read only. Closes with the button, the backdrop or Escape. Amounts show centavos | PASS (API data). Browser not run | TC-R9, TC-R14. D-10 |
| R-4 | Approval sets `PENDING_ADMIN_SIGNOFF`. Rejection sets `REJECTED` and is final for that request. The trainee may submit a new one | PASS (API) | TC-R6, TC-R7 |
| R-5 | The panel shows the trainer's validation (who, when, remarks) and the full timeline | PASS (API data). Browser not run | TC-R3, TC-R13 |
| R-5a | The panel shows the trainee's document progress (N / 6) for information only. It does not block approval | PASS (API data). Browser not run | TC-R3, TC-R13 |
| R-6 | Every action writes one history row in the same transaction. Two registrars acting together get one winner and one 400 | PASS (API) | TC-R6 |
| R-7 | Responses never include a password or the commitment fee. Other roles get 403 and no token gets 401 | PASS (API) | TC-R1, TC-R3 |
| R-7a | The registrar sees all requests, not only one batch. An unknown id gives 404 and a malformed id gives 400 | PASS (API) | TC-R3, TC-R4 |
| R-7b | There is no separate decided-requests table. The status filter finds past decisions | PASS (by design) | D-08 |
| R-8 | Backend and frontend type-check, build and lint with 0 problems | PASS | Backend: `tsc`, `nest build`, `eslint`. Frontend: `tsc -b`, `eslint .`, `vite build` |
| R-9 | Unit tests cover the service method, the DTO and the controller, including the unhappy paths | PARTIAL | 3 spec files, 64 tests, passed with the suite (166 of 166). **Kept out of the commit by decision D-11** (a local git stash), so the repo has no unit tests for the registrar step |
| R-10 | Released on its own (per task). The sidebar link is visible. Until MP-49 ships, an approved request waits at `PENDING_ADMIN_SIGNOFF` | BUILT, not released | D-08 #6 |
| R-11 | After the registrar approves, the trainee's progress view shows the last step: surrender your ID to the admin. No instruction at any other status. Staff panels show a neutral line | PASS (logic, 11 checks). Browser not run | TC-R11, TC-R15. D-09 |

### Test cases (MP-47)

No accounts, passwords or data are listed here. Use any registrar, trainer and trainee on a throwaway database.

**Automated, run on a throwaway database (109 checks, all passed)**

| TC | What is checked | Expected | Result |
|----|-----------------|----------|--------|
| TC-R1 | Access to the four registrar endpoints (list, filter options, detail, validate) with no token and with each other role | No token: 401. Admin, trainer, trainee, encoder: 403 | PASS |
| TC-R2 | List: default, all statuses, one status, search by name, by system ID and with SQL-looking text, program and batch filters, pagination, bad values (limit 51 or 0, page 0, unknown status, bad ids, search over 100 characters) | Default shows only waiting requests. Filters combine. Search is plain text. Bad values give 400 | PASS |
| TC-R3 | Detail: trainer remarks and who/when, document progress (N / 6, and 0 / 6 with no checklist), fee status, timeline order, unknown id, malformed id | Correct data. Unknown id 404. Malformed id 400. No password or commitment fee anywhere | PASS |
| TC-R4 | Validate a request that is still with the trainer, already with the admin, rejected by the trainer, rejected by the registrar or cancelled, as approve and as reject. Unknown id with ticks missing. Malformed id | 400 for every wrong status. Unknown id 404 even with ticks missing. Malformed id 400 | PASS |
| TC-R5 | Approve with finances missing, documents missing or neither. Reject with no reason, a blank reason, over 1000 characters. Bad or missing action. Ticks sent as text. An extra status field. Then read the request again | Each is refused with 400. The request is unchanged | PASS |
| TC-R6 | Two approvals of the same waiting request at the same moment | One succeeds (200), one is refused (400). Exactly one history row. A later approval is refused | PASS |
| TC-R7 | Reject a waiting request with a reason surrounded by spaces | Status `REJECTED`. Reason trimmed and saved. Checks saved as sent. History row names the registrar and the reason. A second attempt is refused. It leaves the default list | PASS |
| TC-R8 | Send `surrendered_id` as true while approving. Check a rejection. Check a request already waiting for the admin | The registrar cannot set it. It stays unset in all three cases | PASS |
| TC-R9 | Fee status and payment data for a trainee with an enrollment receipt plus another fee, one with only a non-enrollment receipt, one with none, and a cancelled request | Paid only with an enrollment receipt. All payments listed oldest first with date, amount, method and reason. Exactly five fields each. Paid does not tick finances | PASS |
| TC-R10 | After the registrar acts, the trainer and the trainee read the request | Both see the new status. The trainee's view shows no registrar remarks, checks or password | PASS |
| TC-R11 | The tracker wording as a pure function, for every status and both audiences | Instruction only at the Admin step while `PENDING_ADMIN_SIGNOFF`. Trainee wording tells them what to do. Staff wording says what is awaited. Nothing at any other status | PASS (11 checks) |

**Manual, in a browser (not run yet)**

| TC | Steps | Expected | Result |
|----|-------|----------|--------|
| TC-R12 | Log in as the registrar. Open Withdrawal Requests from the sidebar. Change the status, program, batch and search. Reload the page | The list opens on "Waiting for me". Filters and page survive the reload (URL) | NOT RUN |
| TC-R13 | Click Review on a waiting request. Scroll the panel. Try Approve with nothing ticked, then with one tick, then both. Try Reject with no reason | Approve stays disabled until both are ticked. Reject cannot be confirmed without a reason. After a decision the list refreshes and the panel shows the result | NOT RUN |
| TC-R14 | In the Enrollment fee box, open View payment history. Close it with the button, with the backdrop and with Escape. Check a trainee with no enrollment receipt | The pop-up lists every payment with centavos. Escape closes the pop-up first and the panel second. A trainee without an enrollment receipt shows "Not paid" but still lists other payments. Finances is never ticked for you | NOT RUN |
| TC-R15 | Approve a request as the registrar. Log in as that trainee and open the request. Check a trainee whose request is at another status | After approval the trainee sees "surrender your ID to the admin" on the last step. No such line at other statuses | NOT RUN |
| TC-R16 | Open the same waiting request in two browsers as two registrars. Approve in one, then act in the other | The second gets a clear message and the panel reloads to the real state | NOT RUN |
| TC-R17 | As a trainee, use the list, the detail page and Cancel on requests from the earlier tickets | They still work. The shared progress view only gained the one line | NOT RUN |

## Acceptance Criteria (MP-49, Admin, final sign-off)

Decisions: D-06 and D-09 in `registrar/decisions.md`. "API" means checked by real requests against a throwaway database (114 checks, 2026-11-09). Full Definition of Done audit: `audit-mp49-admin.md` (12 of 12 Jira criteria PASS over the API, browser run and merge still open). "Browser" means a person using the screens. Branch: `feature/MP-49-admin-withdrawal-signoff`.

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| A-1 | Default view shows `PENDING_ADMIN_SIGNOFF`. "All requests" and each status can be chosen. Filters by status, program, batch and trainee name, with server-side pagination | PASS (API). Browser not run | TC-A2 |
| A-2 | Sign-off only when `PENDING_ADMIN_SIGNOFF`; otherwise 400 (still with the trainer, still with the registrar, approved, rejected, cancelled) | PASS (API) | TC-A4 |
| A-3 | Approval sets `APPROVED` and the enrollment to `WITHDRAWN` in one transaction. Rejection leaves the enrollment unchanged | PASS (API) | TC-A5, TC-A6, TC-A8. A forced failure at the history step and at the enrollment step each rolled everything back. The account stays as is (gap item 1) |
| A-3a | **Approval needs the ID surrendered tick (the trainee gives the ID to the admin).** The sign-off body carries `surrendered_id`, saved in the existing column. Rejecting does not need it and saves the value as sent | PASS (API) | TC-A5. D-09 #2. Missing or false gives 400 and changes nothing |
| A-4 | The panel shows the trainer validation (first), the registrar checks (finances, documents, second), the ID confirmation and the full timeline | PASS (API data). Browser not run | TC-A3. Also shows the enrollment fee and document progress, for information only |
| A-5 | Responses exclude `password_hash`; non-admin roles get 403 and no token gets 401 | PASS (API) | TC-A1 |
| A-6 | End-to-end test of the pipeline, rejection at each stage, registrar blocked before the trainer (400), and cancellation | PASS (API) | TC-A5, TC-A6, TC-A7 |
| A-7 | Backend and frontend type-check, build and lint with 0 problems | PASS | Backend: `tsc`, `nest build`, `eslint`. Frontend: `tsc -b`, `eslint .`, `vite build` |
| A-8 | Two admins signing off together get one winner and one clear 400. A request or enrollment that changed in between is handled | PASS (API) | TC-A9, TC-A10 |
| A-9 | Unit tests cover the service methods, the DTOs and the controller, including the unhappy paths | PARTIAL | 2 spec files, 65 tests, passed with the suite (167 of 167). A break-it run caught 19 of 19. **Kept out of the commit, as for MP-47 (decision D-11)** |
| A-10 | The pages work in a browser (list, side panel, ID tick, approve and reject) | NOT RUN | TC-A11 to TC-A14 |
| A-11 | Released on its own (per task). The sidebar link is visible | BUILT, not released | |

### Test cases (MP-49)

No accounts, passwords or data are listed here. Use any admin, registrar, trainer and trainee on a throwaway database.

**Automated, run on a throwaway database (114 checks, all passed)**

| TC | What is checked | Expected | Result |
|----|-----------------|----------|--------|
| TC-A1 | The four admin endpoints (list, filter options, detail, sign-off) with no token and with registrar, trainer, encoder and trainee. Malformed and unknown ids | No token: 401. Other roles: 403, nothing changed. Malformed id 400. Unknown id 404 | PASS |
| TC-A2 | List: default, all statuses, one status, search by name and system ID, program and batch filters, pagination, bad values (unknown status, limit 51, page 0, bad ids) | Default is only `PENDING_ADMIN_SIGNOFF`. Not scoped to a batch. Each row shows the trainer and registrar decision. Bad values 400 | PASS |
| TC-A3 | Detail of a request the trainer and registrar approved | Trainee, enrollment, reason, trainer (who, when, remarks), registrar checks (who, when, remarks), ID confirmation (not yet), 3-entry timeline. No password | PASS |
| TC-A4 | Sign-off, approve and reject, on requests at every other status | 400 each time, nothing changed, no history row | PASS |
| TC-A5 | The whole pipeline: trainee submits, trainer approves, registrar approves, admin approves. Before that, approve without the ID tick (missing and false) | 400 until the tick. Then request `APPROVED`, enrollment `WITHDRAWN`, ID flag, admin, time and trimmed remarks saved, one history row. Fields for who signed off, the status and the enrollment in the body are ignored. A second sign-off is 400. The trainee account stays active | PASS |
| TC-A6 | Admin rejects (with no ID value, and with the ID value sent) | `REJECTED`, enrollment unchanged, value saved as sent, one history row | PASS |
| TC-A7 | Rejection at the trainer stage, at the registrar stage, and cancellation by the trainee | Request ends. The admin sees who rejected. Admin sign-off is 400. The registrar acting before the trainer is 400 | PASS |
| TC-A8 | Force a failure at the last step (history) and at the enrollment update | Both: the request is still waiting, no admin columns, no history row, enrollment unchanged. Afterwards the same request signs off normally | PASS |
| TC-A9 | Five sign-offs of the same request at the same moment. Approve and reject at the same moment | One winner. The others get 400. One history row. The enrollment matches the winner | PASS |
| TC-A10 | Approve when the enrollment is already `COMPLETED`, `DROPPED` or `WITHDRAWN` | COMPLETED and DROPPED: 409, nothing changed (reject still works). WITHDRAWN: approves | PASS |

**Manual, in a browser (not run yet)**

| TC | Steps | Expected | Result |
|----|-------|----------|--------|
| TC-A11 | Log in as the admin. Open Withdrawal Requests from the sidebar. Change the status, program, batch and search. Reload the page | The list opens on "Waiting for my sign-off". Filters and page survive the reload (URL) | NOT RUN |
| TC-A12 | Click Review on a waiting request. Scroll the panel. Try Approve with the ID unticked, then ticked. Reject with no remarks | Approve stays disabled until the ID is ticked. Reject works without remarks. A confirm step comes first | NOT RUN |
| TC-A13 | Approve one request. Check the list and the trainee's own view | The message says the enrollment is withdrawn. The list refreshes. The trainee sees APPROVED | NOT RUN |
| TC-A14 | Open the same request in two browsers as two admins. Sign off in one, then in the other | The second gets a clear message and the panel reloads to the real state | NOT RUN |
| TC-A15 | Log in as registrar, trainer, encoder and trainee and try `/admin/withdrawal-requests` | Each is kept out | NOT RUN |

### Decisions made while building (MP-49)

These were not in the ticket. Change them if the team disagrees.

| # | Decision | Why |
|---|----------|-----|
| 1 | Remarks are optional for both approve and reject, as the ticket says. The trainer and the registrar must give a reason to reject | The ticket lists remarks as optional. The trainee will not see why an admin rejection happened unless the admin writes it. **Ask whether the admin should also need a reason to reject** |
| 2 | Approving an enrollment that is already `COMPLETED` or `DROPPED` returns 409 and changes nothing. One that is already `WITHDRAWN` is accepted | A finished or dropped enrollment must not be turned back into `WITHDRAWN`. An already withdrawn one (for example after an MP-42 program change) needs no change |
| 3 | Rejecting saves `surrendered_id` as sent and leaves it unchanged if it is not sent | Ticket: "saves the value as sent" |
| 4 | The admin list reuses the registrar's list code and filters. Only the default status and the extra trainer and registrar columns differ | One copy of the filter and paging rules |
| 5 | `exit_reason` on the enrollment is not set when a withdrawal is approved | The ticket only sets `enrollment_status`. MP-42 does set it for a program change |

### Known gaps (MP-49)

| # | Gap | Effect |
|---|-----|--------|
| 1 | The account after approval is not decided (gap item 1 below). Only the enrollment is withdrawn, with a TODO in `signOffByAdmin` | The trainee can still log in |
| 2 | The pages were not run in a browser | TC-A11 to TC-A15 are open |
| 3 | A request that stays open after an MP-42 program change is attached to the old, already withdrawn enrollment | Approving it changes nothing for the new enrollment. See the MP-42 audit |

## Acceptance Criteria (pipeline rules across tickets)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 7 | The request reaches `PENDING_ADMIN_SIGNOFF` only after the Trainer and then the Registrar have validated | PASS (API) | D-06. Run end to end in the MP-49 check (TC-A5) |
| 8 | The Registrar cannot validate unless the status is `TRAINER_VALIDATED`, and the Trainer cannot validate unless it is `PENDING_VALIDATION` (400) | PASS (API) | MP-47, MP-48. The registrar side was run again in the MP-49 check (TC-A7) |
| 9 | The Admin cannot sign off unless the status is `PENDING_ADMIN_SIGNOFF` (400) | PASS (API) | MP-49, TC-A4 |
| 10 | Every status change writes a `withdrawal_status_history` row | PASS (API) | Checked for every step of the pipeline in the MP-49 run (TC-A5 to TC-A7) |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-11-04 | Trainer pages (MP-48, UI half) built on `feature/withdrawal-trainer-validation-ui`: list, side panel with approve and reject (reason required to reject), route and sidebar link. The shared stepper, status badge and pipeline helper moved to `frontend/src/components/withdrawal/` so the registrar and admin pages can reuse them. Checked: `tsc -b`, `eslint .`, `vite build`, the 10 pipeline cases, server-rendered components and panel. **Not checked in a browser.** No batch filter in the page yet (TR-10) |
| 2026-11-04 | Trainer backend (MP-48, API half) built on `feature/withdrawal-trainer-validation-api`: trainer list, detail and validate under `/api/trainer/withdrawal-requests` (D-07: reason required on reject). 29 new unit tests (101 in total), 53 real-HTTP checks with two trainers on a throwaway database, and a race sweep (24 trials, both outcomes occurred, all consistent). UI half still to do |
| 2026-11-04 | MP-48 follow-up, **now on `dev`** (helmet and multer in PR #75 at 14:06, history table in PR #76 at 14:18; checked on merged `dev`: backend 102 of 102 tests, `tsc`, frontend build and lint clean; not on `staging`; not checked in a browser). Originally built on `fix/security-headers-multer-staging`: trainer **Request history** table and its own search (`status=DECIDED`, TR-11, TR-12), `helmet` (finding A-1), `multer` override to 2.5.0 (finding A-3), MP-48 ticket text updated (remarks required on reject, new criteria 13 and 14). Checked: backend `tsc`, ESLint, `prisma validate`, `nest build`, 102 of 102 unit tests, **45 of 45 real-HTTP checks on a throwaway local PostgreSQL**, frontend `tsc -b`, ESLint, `vite build`, both `npm audit` at 0, Supabase read-only checks. **Not run:** races, browser. New findings A-12 (fresh database cannot be built: BOM in `0_init`), A-13, A-14. See `audit-trainer-history.md` |
| 2026-11-04 | Trainee UI (MP-46, UI half) built on `feature/withdrawal-trainee-request-ui`: list page with status filter and pagination in the URL, request form (own ENROLLED enrollments only), detail page with the four-stage stepper, history and cancel, sidebar link. Checked: pipeline logic (10 cases), server-rendered components, full frontend build and lint, and the API over real HTTP (30 checks). **Not checked in a browser** |
| 2026-11-04 | Trainee backend (MP-46, API half) built on `feature/withdrawal-trainee-request-api`: shared `WithdrawalService`, trainee controller, 20 unit tests, plus a throwaway real-database run (10 scenarios and a 60-race stress test). Found and fixed an error-mapping bug in that run. UI half still to do |
| 2026-11-04 | Pipeline changed from parallel to sequential (Trainer, then Registrar, then Admin), decision D-06. Jira tickets MP-45 to MP-49 rewritten to match. `REGISTRAR_VALIDATED` removed. MP-48 is now ticket 3 of 5 and MP-47 ticket 4 of 5 |
| 2026-11-06 | Registrar step (MP-47) decided and built on `feature/MP-47-registrar-withdrawal` (backend, page, side panel, 64 unit tests, 97 end-to-end checks on a throwaway database), decision D-08: manual ticks, a reason required to reject, a rejection final for that request, the registrar sees all requests, no history table, released on its own. Then **changed by D-09 the same day**: the registrar checks **finances cleared and documents submitted only** and sees whether the enrollment fee is paid (from the `ENROLLMENT` receipts); **ID surrendered moves to the Admin sign-off (MP-49)**, because the trainee hands in the ID after the registrar accepts the request. Jira MP-47 and MP-49 and these criteria updated. The MP-47 code was then changed to match (two checks, enrollment fee status, the tracker step), and **D-10** added a read-only payment history pop-up in the Enrollment fee box. 109 end-to-end checks on a throwaway database and 166 unit tests pass |
| 2026-11-09 | Admin final sign-off (MP-49) built on `feature/MP-49-admin-withdrawal-signoff`: admin list, detail and sign-off under `/api/admin/withdrawal-requests`, the admin page and side panel, route and sidebar link. No migration (the columns came with MP-45). 65 unit tests kept local, 114 end-to-end checks on a throwaway database, 19 of 19 break-it checks. Browser checks still open |

---

## Audit of `dev` after the trainee API and UI merge (2026-11-04)

A fuller audit (code, tests, security, leaks, dependencies, data) is in `audit-pre-staging.md`. This section is the shorter first pass. The same checks run again on the `staging` branch after the merge are in `audit-staging.md`.

`dev` at `a8e0c33` (PRs #62, #63, #64). Run from a fresh pull.

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `tsc --noEmit`, `eslint` (whole project), `nest build` | PASS, 0 problems |
| 2 | Backend unit tests | PASS, 72 of 72 (10 suites) |
| 3 | Frontend `tsc -b`, `eslint .`, `vite build` | PASS, 0 problems |
| 4 | Supabase `prisma migrate status` | PASS, up to date. `20261104_withdrawal_pipeline_schema` finished, not rolled back |
| 5 | No withdrawal-related drift between Supabase and `schema.prisma` | PASS |
| 6 | `withdrawal_request` and `withdrawal_status_history` row counts | 0 and 0 at the time of the audit. Became 1 and 1 after the live test in the next section |
| 7 | Status and legacy `request_status` mismatches, requests without a history row | 0 and 0 |
| 8 | Test accounts left on Supabase | 0. All testing used throwaway local databases |
| 9 | API over real HTTP (earlier run, branch tip equals the merged code) | PASS, 30 of 30 |
| 10 | Pipeline stage logic (10 cases) and server-rendered components (6 states) | PASS |
| 11 | **Pages in a real browser** | **PARTLY DONE.** No browser was available to me. A trainee then submitted a request through the UI and it reached Supabase correctly (see the live test below). The visual checks (layout, stepper look, phone width, keyboard) are still the checklist below |

### Live test on Supabase (2026-11-04, after the migration and the merge)

A real trainee account, `tes.trainee_mcctest` (Test Trainee, TRAINEE, active, one `ENROLLED` enrollment: Bread and Pastry Production, BPP-4Th Batch), submitted a withdrawal request through the trainee page. Read back from Supabase (read-only):

| Item | Result |
|------|--------|
| Requests for this trainee | 1: `ce316375-0817-469a-acf0-d46aaf64951f`, status `PENDING_VALIDATION`, requested 2026-11-04 |
| Reason stored | "I am withdrawing due to time constraint" |
| Trainer, registrar and admin fields | All empty, as expected before anyone acts |
| History rows | 1: `NULL` to `PENDING_VALIDATION`, 2026-11-04 03:03:25 UTC (11:03 Philippine time), no remarks |
| Totals on Supabase | 1 request, 1 history row. This is the only withdrawal data |

What this proves: the form, the API, the request row and its history row all work against the real database with a real login.

What it does not prove: how the pages look, and every stepper state. The request is stuck at "Waiting for trainer" until the trainer step (MP-48) is built.

**This is a real row on the shared database.** Leave it as the first record for testing the trainer step, or cancel it from the trainee page (that writes a second history row, `PENDING_VALIDATION` to `CANCELLED`).

### Manual browser checklist (trainee with an `ENROLLED` enrollment)

1. `/trainee/withdrawal` shows the empty state when there are no requests. The sidebar link is under My Training.
2. "New withdrawal request" opens the form. With one enrollment it is preselected. With none it says so. Submit stays disabled until a reason is typed.
3. Submit goes to the detail page. The stepper reads Request, Trainer, Registrar, Admin. Request is done, Trainer is in progress, the other two are not reached yet.
4. A second submit for the same enrollment shows the "already in progress" message in the form.
5. The list shows the request, the filter by status works, and the page, limit and status are kept in the URL after a reload.
6. On the detail page, "Cancel this request" asks to confirm. After "Yes, cancel it" the status is Cancelled and the history shows both steps.
7. After a cancel a new request can be submitted for the same enrollment.
8. Open the detail URL while logged in as a different trainee: "Withdrawal request not found".
9. Logged out or as another role: the routes redirect or are refused.
10. Narrow the window to phone width: the table scrolls sideways and nothing overlaps. Tab through the form and the cancel buttons by keyboard.
11. Trainer, registrar and admin steps cannot be completed yet (their tickets are not built), so a request stays at Waiting for trainer. Test the other stepper states by changing `withdrawal_status` on a test row in a non-shared database.

---

## Open Gaps

| # | Gap | Where |
|---|-----|-------|
| 1 | After approval, is the trainee's account deactivated? Options A (enrollment only), B (deactivate), C (deactivate only if no other active enrollment). Current plan is A, with a TODO in the service | `to-be-discussed.md` item 9 |
| 2 | ~~Duplicate `surrendered_id` / `id_surrendered`~~ **Resolved 2026-11-04:** the existing `surrendered_id` is kept and reused (since D-09, 2026-11-06, as the Admin sign-off item, not the registrar's). No `id_surrendered` column is added | Closed |
