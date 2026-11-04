# MP-45 to MP-49: Withdrawal Approval Pipeline

| Field | Value |
|-------|-------|
| **Jira** | MP-45 (schema), MP-46 (Trainee), MP-47 (Registrar), MP-48 (Trainer), MP-49 (Admin) |
| **Type** | Feature |
| **Status** | MP-45 IN PROGRESS, MP-46 to MP-49 NOT STARTED |
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

## Acceptance Criteria (MP-47, Registrar, after the Trainer)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| R-1 | Default view shows `TRAINER_VALIDATED` | NOT STARTED | |
| R-2 | Registrar can act only when the status is `TRAINER_VALIDATED`; `PENDING_VALIDATION` and every other status return 400 | NOT STARTED | D-06 |
| R-3 | Approve needs all 3 checklist items true (server-side). Reject saves the checklist as is | NOT STARTED | |
| R-4 | Approval sets `PENDING_ADMIN_SIGNOFF`. Rejection sets `REJECTED` | NOT STARTED | |
| R-5 | The panel shows the trainer's validation and the full timeline | NOT STARTED | |
| R-6 | Every action writes a history row, in one transaction | NOT STARTED | |
| R-7 | Responses exclude `password_hash`; non-registrar roles get 403 | NOT STARTED | |
| R-8 | Pages type-check, build and lint with 0 problems | NOT STARTED | |

## Acceptance Criteria (MP-49, Admin)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| A-1 | Default view shows `PENDING_ADMIN_SIGNOFF` | NOT STARTED | |
| A-2 | Sign-off only when `PENDING_ADMIN_SIGNOFF`; otherwise 400 | NOT STARTED | |
| A-3 | Approval sets `APPROVED` and the enrollment to `WITHDRAWN` in one transaction. Rejection leaves the enrollment unchanged | NOT STARTED | Account stays as is (gap item 1) |
| A-4 | The panel shows the trainer validation (first), the registrar checklist (second) and the full timeline | NOT STARTED | |
| A-5 | Responses exclude `password_hash`; non-admin roles get 403 | NOT STARTED | |
| A-6 | End-to-end test of the pipeline, rejection at each stage, registrar blocked before the trainer (400), and cancellation | NOT STARTED | Definition of Done |
| A-7 | Pages type-check, build and lint with 0 problems | NOT STARTED | |

## Acceptance Criteria (pipeline rules across tickets)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 7 | The request reaches `PENDING_ADMIN_SIGNOFF` only after the Trainer and then the Registrar have validated | NOT STARTED | D-06 |
| 8 | The Registrar cannot validate unless the status is `TRAINER_VALIDATED`, and the Trainer cannot validate unless it is `PENDING_VALIDATION` (400) | NOT STARTED | MP-47, MP-48 |
| 9 | The Admin cannot sign off unless the status is `PENDING_ADMIN_SIGNOFF` (400) | NOT STARTED | MP-49 |
| 10 | Every status change writes a `withdrawal_status_history` row | NOT STARTED | |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-11-04 | Trainer pages (MP-48, UI half) built on `feature/withdrawal-trainer-validation-ui`: list, side panel with approve and reject (reason required to reject), route and sidebar link. The shared stepper, status badge and pipeline helper moved to `frontend/src/components/withdrawal/` so the registrar and admin pages can reuse them. Checked: `tsc -b`, `eslint .`, `vite build`, the 10 pipeline cases, server-rendered components and panel. **Not checked in a browser.** No batch filter in the page yet (TR-10) |
| 2026-11-04 | Trainer backend (MP-48, API half) built on `feature/withdrawal-trainer-validation-api`: trainer list, detail and validate under `/api/trainer/withdrawal-requests` (D-07: reason required on reject). 29 new unit tests (101 in total), 53 real-HTTP checks with two trainers on a throwaway database, and a race sweep (24 trials, both outcomes occurred, all consistent). UI half still to do |
| 2026-11-04 | Trainee UI (MP-46, UI half) built on `feature/withdrawal-trainee-request-ui`: list page with status filter and pagination in the URL, request form (own ENROLLED enrollments only), detail page with the four-stage stepper, history and cancel, sidebar link. Checked: pipeline logic (10 cases), server-rendered components, full frontend build and lint, and the API over real HTTP (30 checks). **Not checked in a browser** |
| 2026-11-04 | Trainee backend (MP-46, API half) built on `feature/withdrawal-trainee-request-api`: shared `WithdrawalService`, trainee controller, 20 unit tests, plus a throwaway real-database run (10 scenarios and a 60-race stress test). Found and fixed an error-mapping bug in that run. UI half still to do |
| 2026-11-04 | Pipeline changed from parallel to sequential (Trainer, then Registrar, then Admin), decision D-06. Jira tickets MP-45 to MP-49 rewritten to match. `REGISTRAR_VALIDATED` removed. MP-48 is now ticket 3 of 5 and MP-47 ticket 4 of 5 |

---

## Audit of `dev` after the trainee API and UI merge (2026-11-04)

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
| 2 | ~~Duplicate `surrendered_id` / `id_surrendered`~~ **Resolved 2026-11-04:** the existing `surrendered_id` is kept and reused as the registrar checklist item. No `id_surrendered` column is added | Closed |
