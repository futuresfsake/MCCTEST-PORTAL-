# Withdrawal Pipeline: How It Works

A guide to the trainee withdrawal feature for the team: what it does, who does what, how the data is stored, what is built, what is not, and where to find the details.

| Field | Value |
|-------|-------|
| **Tickets** | MP-45 (schema), MP-46 (trainee), MP-48 (trainer), MP-47 (registrar, not built), MP-49 (admin, not built) |
| **Written** | 2026-11-05, from the code on `dev`, `staging` and `main` |
| **Status in one line** | The trainee and trainer steps are built and on `main`. The registrar and admin steps are not, so **a request cannot finish yet** |

---

## 1. What it is

A trainee who wants to leave a program submits a withdrawal request. The request goes through three people in a fixed order before the enrollment is closed:

```
Trainee submits
      |
      v
 Trainer validates  ------ rejects ------> REJECTED (ends)
      |
      v
 Registrar validates ----- rejects ------> REJECTED (ends)      [not built]
      |
      v
 Admin signs off  -------- rejects ------> REJECTED (ends)      [not built]
      |
      v
 APPROVED: the enrollment becomes WITHDRAWN                      [not built]
```

The trainee can also **cancel** while the trainer has not acted yet.

The order is deliberate (decision D-06): one validator at a time, so there is no race between validators, and the Registrar never does the paperwork for a request the Trainer rejected.

## 2. Who does what

| Role | What they do | Status |
|------|--------------|--------|
| **Trainee** | Submits a request for one of their own enrolled enrollments, follows its progress, can cancel before the trainer acts | Built (MP-46) |
| **Trainer** | Reviews requests from trainees in **their own batches**. Approves, or rejects with a reason | Built (MP-48) |
| **Registrar** | Confirms two things on requests the trainer approved: finances cleared and documents submitted. Sees whether the enrollment fee is paid. Approves or rejects (D-09) | **Built, not released** (MP-47). Being changed from three checks to two |
| **Admin** | Final sign-off on requests both have approved. Approval sets the enrollment to `WITHDRAWN` | **Not built** (MP-49) |

## 3. Statuses

One field, `withdrawal_status`, says where a request is.

| Status | Meaning | Who can act next |
|--------|---------|------------------|
| `PENDING_VALIDATION` | Submitted, waiting for the trainer | Trainer (approve or reject), trainee (cancel) |
| `TRAINER_VALIDATED` | Trainer approved, waiting for the registrar | Registrar (not built). The trainee can no longer cancel |
| `PENDING_ADMIN_SIGNOFF` | Registrar approved, waiting for the admin | Admin (not built) |
| `APPROVED` | Admin signed off. Enrollment is `WITHDRAWN` | Nobody, final |
| `REJECTED` | A validator rejected it | Nobody, final. The trainee may submit a new request |
| `CANCELLED` | The trainee cancelled | Nobody, final. The trainee may submit a new request |

A request is **open** while it is `PENDING_VALIDATION`, `TRAINER_VALIDATED` or `PENDING_ADMIN_SIGNOFF`. An enrollment can have only one open request at a time.

A status can only move forward along the arrows in section 1. Every move is a guarded update: it only succeeds if the request is still in the expected status, so two actions at the same moment cannot both win.

## 4. The rules

### Trainee (`/api/trainee/withdrawal-requests`)
- Can only submit for **their own** enrollment, and only if it is `ENROLLED`.
- One open request per enrollment. A second one is refused (409), including two submits at the same instant.
- The reason is required, up to 1000 characters.
- Can cancel only while the status is `PENDING_VALIDATION`.
- Sees only their own requests. Another trainee's request looks like a missing one (404).

### Trainer (`/api/trainer/withdrawal-requests`)
- Sees only requests from batches assigned to them. Another trainer's request is refused (403).
- Can act only while the status is `PENDING_VALIDATION`.
- **Approve:** remarks are optional. The status becomes `TRAINER_VALIDATED`.
- **Reject:** a reason is **required** (decision D-07), so the trainee always sees why. The status becomes `REJECTED`.
- Sees the trainee's **name and system ID only**, no contact details.
- The list defaults to "waiting for me". It can also show every request, or the trainer's own past decisions, and can be filtered by status and searched by trainee name or system ID.

### Registrar and Admin (planned, from the Jira tickets)
- **Registrar** acts only on `TRAINER_VALIDATED`. Approving needs both checklist items ticked (finances cleared, documents submitted). Result: `PENDING_ADMIN_SIGNOFF`. The Admin then confirms the ID was surrendered when signing off (D-09).
- **Admin** acts only on `PENDING_ADMIN_SIGNOFF`. Approving sets the request to `APPROVED` and the enrollment to `WITHDRAWN` in **one** database transaction.

## 5. What is stored

All in the existing `withdrawal_request` table plus one new table.

**`withdrawal_request`** (one row per request):

| Group | Columns |
|-------|---------|
| Request | `withdrawal_request_id`, `enrollment_id`, `requested_reason`, `date_requested` |
| Pipeline status | `withdrawal_status` |
| Trainer | `trainer_validated`, `trainer_validated_by`, `trainer_validated_at`, `trainer_remarks` |
| Registrar | `surrendered_id` (the existing column, reused), `finances_cleared`, `documents_submitted`, `registrar_validated_by`, `registrar_validated_at`, `registrar_remarks` |
| Admin | `admin_signed_off_by`, `admin_signed_off_at`, `admin_remarks` |
| Old, kept | `request_status`, `reviewed_by`, `date_reviewed`, `remarks`, `flagged_by_system` |

**`withdrawal_status_history`** (one row for **every** status change, never edited):
`withdrawal_request_id`, `old_status`, `new_status`, `changed_by`, `changed_at`, `remarks`.

A status change and its history row are always written in the same transaction, so the history can never disagree with the request. The trainee's progress page is built from this table.

The migration is `20261104_withdrawal_pipeline_schema`. It is additive: nothing was dropped or changed, and old requests were backfilled from the old status. Details: `migration.md`.

## 6. The screens

| Page | Who | What it shows |
|------|-----|---------------|
| `/trainee/withdrawal` | Trainee | Their requests, a status filter, pagination, and the form to start a new one |
| `/trainee/withdrawal/:id` | Trainee | The four-stage progress view (Request, Trainer, Registrar, Admin) with who acted and when, the rejection reason, the history, and Cancel |
| `/trainer/withdrawal-requests` | Trainer | Requests from their batches, status filter and search, and a side panel to approve or reject (reject needs a reason, both ask to confirm) |

The progress view, the status badge and the stage logic live in `frontend/src/components/withdrawal/` and are shared, so the registrar and admin pages can reuse them.

## 7. Where the code is

| Part | Location |
|------|----------|
| Shared rules (all roles) | `backend-nestjs/src/withdrawal/withdrawal.service.ts` |
| Request validation | `backend-nestjs/src/withdrawal/dto/` |
| Trainee API | `backend-nestjs/src/users/trainee/withdrawal/` |
| Trainer API | `backend-nestjs/src/users/trainer/withdrawal/` |
| Schema | `backend-nestjs/prisma/schema.prisma` and `prisma/migrations/20261104_withdrawal_pipeline_schema/` |
| Shared screens | `frontend/src/components/withdrawal/` |
| Trainee pages | `frontend/src/pages/users/trainee/withdrawal/` |
| Trainer page | `frontend/src/pages/users/trainer/withdrawal/` |

The pattern is the same as `enrollments/`: one shared service with all the rules, and a thin controller per role that only checks the login and the role and passes the logged-in user to the service. A role's controller **never** accepts a user or trainee id from the request.

## 8. Security and safety

- Every endpoint needs a valid login **and** the right role. There are no public withdrawal endpoints.
- A request's owner always comes from the login token, never from the request body.
- Clients cannot set the status, the validators, or the sign-off fields. Extra fields in a request are ignored.
- Responses list named fields only. They never contain a password hash or contact details.
- Text typed by users is stored and returned as plain text.
- Another user's data answers 404 (trainee) or 403 (trainer) and changes nothing.
- The server sends standard security headers (`helmet`) and no `X-Powered-By`.

## 9. How it was tested

| Check | Result |
|-------|--------|
| Backend unit tests | 101 of 101 (the withdrawal service has 100% line coverage) |
| Real HTTP on a throwaway database: trainee flow | 30 of 30 |
| Real HTTP on a throwaway database: trainer flow, two trainers | 53 of 53 |
| Security run (forged tokens, mass assignment, injection text, oversized input, rate limiting) | 26 of 26 |
| Races: trainee cancel against trainer approve, and two trainer actions at once | Always exactly one winner and a consistent history |
| Build, type-check and lint, backend and frontend | 0 problems |
| Dependencies | `npm audit` reports 0 vulnerabilities in both |
| **Pages in a real browser** | **Not done.** Please test by hand |

The audits are in this folder: `audit-pre-staging.md`, `audit-staging.md`, `audit-dev-trainer.md`, `audit-trainer-history.md` and `audit-pre-main.md`. The acceptance criteria are in `acceptance.md`.

## 10. Where it has reached

All merge times are Philippine time on 2026-11-04.

| Part | `dev` | `staging` | `main` |
|------|-------|-----------|--------|
| Schema (MP-45) | 10:38 (PR #62) | 11:18 (PR #66) | 14:27 (PR #79) |
| Trainee API and pages (MP-46) | 10:59 and 11:00 (PRs #63, #64) | 11:18 (PR #66) | 14:27 (PR #79) |
| Trainer API and pages (MP-48) | 11:37 to 11:40 (PRs #68, #69, #71) | 13:15 | 14:27 (PR #79) |
| Trainer history view | 14:18 (PR #76) | 14:22 (PR #78) | 14:27 (PR #79) |
| Security headers and `multer` fix | 14:06 (PR #75) | 14:22 (PR #78) | 14:27 (PR #79) |

The database migration was applied to the shared Supabase database on 2026-11-04. Per-task release times for the whole project are in `backlogs/push-log.md`.

## 11. Known limits and open questions

**A request cannot finish.** Once the trainer approves, the request waits for a registrar step that does not exist. The trainee can no longer cancel it. This is live on `main`: the menu items are visible and a real request is already stuck at `TRAINER_VALIDATED` on the shared database. It stays that way until MP-47 and MP-49 are built.

Open decisions (logged in `backlogs/to-be-discussed.md`):
- What happens to the trainee's **login account** after an approval: leave it, deactivate it, or deactivate it only if they have no other active enrollment (item 9). The Admin step is blocked on this.
- Whether a **reason is required** when the registrar and admin reject, as it is for the trainer.
- Whether to **keep or retire** the old `request_status` column. New code ignores it, so it stays at `PENDING` on every new request and can disagree with `withdrawal_status`.
- Whether the trainee should see the **names of staff** who acted.

Other limits:
- The trainer page has no batch filter, because nothing yet lists a trainer's batches.
- Requests made on the same day sort in no fixed order (no `created_at` on the table).
- There is no limit on how often a trainee can submit and cancel.
- Row level security is off on every Supabase table (not caused by this feature, still to confirm).
- The controllers, the real-database behaviour and the frontend logic have no tests in the repo yet.

## 12. After pulling this code

Everyone, on the shared Supabase database (do **not** run a migration):

```bash
git pull origin dev
cd backend-nestjs
npm install
npx prisma generate
npx prisma migrate status
npm run start:dev
```

`migrate status` should say "Database schema is up to date". Use `migrate deploy` only on a database of your own. Never use `migrate dev`, `migrate reset` or `db push`.
