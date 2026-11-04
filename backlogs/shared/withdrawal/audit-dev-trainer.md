# Withdrawal (trainer side): Audit of `dev`

| Field | Value |
|-------|-------|
| **Date** | 2026-11-04 |
| **Audited** | `dev` at `32647e7` (PR #71). It holds the trainer API (#68), the trainer pages (#69), their revert (#70) and the reapply (#71) |
| **Builds on** | `audit-pre-staging.md` and `audit-staging.md`, which cover the schema and the trainee side. This audit covers what changed since: 19 code files for the trainer side |
| **Not audited** | `staging` (it does not have the trainer work yet) and any deployed site |
| **Ticket** | MP-48 (Trainer: Validate Withdrawal Request) |

## Verdict

**`dev` is healthy.** The merged code is identical to the code tested on the two trainer branches (no difference against `bdf2cea` for the backend or `2073f82` for the frontend), so every earlier test result applies. All checks pass again on `dev`. No new findings. The one security failure is the existing `X-Powered-By` finding (A-1). The pages have still not been looked at in a real browser.

---

## 1. Is `dev` the code that was tested

| # | Check | Result |
|---|-------|--------|
| 1 | Backend on `dev` against the trainer API branch tip (`bdf2cea`) | Identical, no difference |
| 2 | Frontend on `dev` against the trainer UI branch tip (`2073f82`) | Identical, no difference. The revert (#70) and the reapply (#71) cancel out exactly |
| 3 | Pages still present on `dev` after the revert and reapply | Yes: trainer page, side panel, shared stepper components, API client, route and sidebar link |

## 2. Code quality and build

| # | Check | Result |
|---|-------|--------|
| 4 | Backend `tsc --noEmit`, ESLint (whole project, no fix), `nest build`, `prisma validate` | PASS, 0 problems |
| 5 | Frontend `tsc -b`, ESLint (whole project), `vite build` | PASS, 0 problems |

## 3. Tests

| # | Check | Result |
|---|-------|--------|
| 6 | Backend unit tests | PASS, 101 of 101 (12 suites) |
| 7 | Trainer end to end over real HTTP, two trainers on a fresh throwaway PostgreSQL 17 | PASS, 53 of 53 |
| 8 | Trainee end to end over real HTTP | PASS, 30 of 30 (still works after the trainer changes to the shared service) |
| 9 | Races: trainee cancel against trainer approve, and trainer approve against trainer reject | PASS. Exactly one winner and a consistent history every time (60 trials in this run, plus the 24-trial timing sweep on the branch) |

What the trainer run covers: only the trainer role gets in (trainee, admin: 403, no token: 401); a trainer sees only their own batches' requests (another trainer: 403 on read and on validate, with nothing changed); the default list, status, search and pagination filters; reject needs a reason (blank: 400); the client cannot set the status, the registrar or admin fields, or another validator; once acted on the request is closed to the trainer (400) and to the trainee (cancel 400, resubmit 409); what the trainee sees afterwards (who validated, and the rejection reason).

## 4. Security and leaks

| # | Check | Result |
|---|-------|--------|
| 10 | Security run over real HTTP (forged and tampered tokens, session checks, mass assignment, injection text, oversized and malformed input, deactivated account, rate limiting) | 25 of 26 PASS. The failure is `X-Powered-By: Express` (finding A-1, existing and app-wide). A 120-request burst got 16 responses of 429 |
| 11 | New trainer endpoints: login guard and trainer-role guard on all three, no public routes | PASS |
| 12 | The client cannot send a trainer id, user id or trainee id in the trainer DTOs | PASS, none accepted |
| 13 | Secrets, tracked key or `.env` files, SQL or HTML injection sinks, `eval`, raw queries, `console.log`, `localStorage` in the 19 changed code files | PASS, none found |
| 14 | What the trainer is shown about the trainee | Name and system ID only. Checked over HTTP that no contact details, address, birth date or password text appear |
| 15 | Dependencies, `npm audit` (production) | Frontend: 0. Backend: the already-logged `multer` advisory (SEC-02, finding A-3) |

## 5. Data on Supabase (read-only)

| # | Check | Result |
|---|-------|--------|
| 16 | `prisma migrate status` | Up to date |
| 17 | Rows | 1 request, 1 history row (the live test, still waiting for the trainer) |
| 18 | Orphans, requests without history, status different from the latest history | 0, 0, 0 |
| 19 | More than one open request on an enrollment | 0 |
| 20 | Requests past the trainer step missing who or when. Trainer rejections without a reason | 0 and 0 |
| 21 | Registrar or admin fields set (not built yet) | 0 |
| 22 | Test accounts of mine left on Supabase | 0 (all testing used a throwaway local database) |
| 23 | Public tables with row level security on | 0 of 38, unchanged (finding A-2) |

## 6. Findings

No new findings. Updates to earlier ones:

| ID | Update |
|----|--------|
| A-1 | Still open. Confirmed again on the trainer code |
| A-2 | Still open. RLS still off on all 38 tables |
| A-3 | Still open. `multer`, deferred |
| A-4 | **Partly improved.** The trainer service now has unit tests (29 new) and a DTO test. Still not in the repo: the controller, the real-database behaviour and the races. The frontend still has no test runner |
| A-8 | Still open. The trainer, like the trainee, can see names of people who acted |

Notes, not findings:

- **Rejected requests can be resubmitted.** After a trainer rejects, the trainee may submit a new request for the same enrollment. Confirm this is wanted.
- **Trainer reads another trainer's request: 403, trainee reads someone else's: 404.** The trainer API follows the ticket (403). The trainee API hides existence (404). Not a leak in practice (ids are random UUIDs), but the two differ.
- **The trainer page has no batch filter** (TR-10): nothing lists a trainer's batches yet.
- **The revert and reapply sit in `dev`'s history** (#69, #70, #71). Harmless: the final content equals the original change.
- **A request now stops at `TRAINER_VALIDATED`.** After the trainer approves, no one can move it on (the registrar step is not built) and the trainee can no longer cancel it. This makes the dead end for real users worse than before. See "Not yet on `staging` or `main`" below.

## 7. Not covered

- A real browser for any page, including the trainer pages: layout, the side panel, keyboard use, phone width.
- The deployed sites.
- Load testing.

## 8. Not yet on `staging` or `main`

`staging` does not have the trainer API or pages (it is 8 commits behind `dev`, and has 6 documentation commits that `dev` lacks). Before promoting:

1. Sync the documents: merge `staging` into `dev` (or the reverse) so the gap log and audits match.
2. Promote only when the registrar step (MP-47) exists, or hide the withdrawal menu items. Until then a trainee request can never finish, and once the trainer approves it the trainee can no longer cancel it.
3. Browser check of the trainer pages.
