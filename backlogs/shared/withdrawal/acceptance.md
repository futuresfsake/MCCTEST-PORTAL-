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
| TR-1 | Trainer sees only requests from trainees in their own batches; other batches return 403 | NOT STARTED | |
| TR-2 | Default view shows `PENDING_VALIDATION` | NOT STARTED | |
| TR-3 | Trainer can approve or reject with optional remarks, only when the status is `PENDING_VALIDATION` (400 otherwise) | NOT STARTED | |
| TR-4 | Approval sets `TRAINER_VALIDATED`. Rejection sets `REJECTED` | NOT STARTED | |
| TR-5 | Every action writes a history row, in one transaction | NOT STARTED | |
| TR-6 | Responses exclude `password_hash`; non-trainer roles get 403 | NOT STARTED | |
| TR-7 | Pages type-check, build and lint with 0 problems | NOT STARTED | |

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
| 2026-11-04 | Trainee UI (MP-46, UI half) built on `feature/withdrawal-trainee-request-ui`: list page with status filter and pagination in the URL, request form (own ENROLLED enrollments only), detail page with the four-stage stepper, history and cancel, sidebar link. Checked: pipeline logic (10 cases), server-rendered components, full frontend build and lint, and the API over real HTTP (30 checks). **Not checked in a browser** |
| 2026-11-04 | Trainee backend (MP-46, API half) built on `feature/withdrawal-trainee-request-api`: shared `WithdrawalService`, trainee controller, 20 unit tests, plus a throwaway real-database run (10 scenarios and a 60-race stress test). Found and fixed an error-mapping bug in that run. UI half still to do |
| 2026-11-04 | Pipeline changed from parallel to sequential (Trainer, then Registrar, then Admin), decision D-06. Jira tickets MP-45 to MP-49 rewritten to match. `REGISTRAR_VALIDATED` removed. MP-48 is now ticket 3 of 5 and MP-47 ticket 4 of 5 |

---

## Open Gaps

| # | Gap | Where |
|---|-----|-------|
| 1 | After approval, is the trainee's account deactivated? Options A (enrollment only), B (deactivate), C (deactivate only if no other active enrollment). Current plan is A, with a TODO in the service | `to-be-discussed.md` item 9 |
| 2 | ~~Duplicate `surrendered_id` / `id_surrendered`~~ **Resolved 2026-11-04:** the existing `surrendered_id` is kept and reused as the registrar checklist item. No `id_surrendered` column is added | Closed |
