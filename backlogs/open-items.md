# Open Items

Everything still open on 2026-11-09, in one place. Questions that need an answer are numbered in `to-be-discussed.md`. Audits are in `admin/trainee-edit/audit-dod.md` (MP-42) and `shared/withdrawal/audit-mp49-admin.md` (MP-49). Update this list as items close.

Type: **Decide** = needs an answer from the team or product owner. **Do** = a task. **Check** = something to test or confirm. **Tidy** = housekeeping.

---

## MP-42, Admin Edit Trainee (branch `feature/MP42-admin-edit-trainee`, commit `ae7d9c5`, not merged)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-1 | Do | Fix the missing-beneficiary 500: `PATCH /admin/trainees/:id` with no `beneficiary` field returns 500 instead of 400 | Add `@IsDefined()` on `beneficiary` in `TraineeDetailsDto`. Makes AC 2 pass. Audit F-15 |
| O-2 | Check | Does the enrollment form have the same weakness? It shares `TraineeDetailsDto` | Not tested. Audit F-15 |
| O-3 | Do | Apply the migration `20261106_trainee_enrollment_transfers` to Supabase | Run `npx prisma migrate deploy` from the `feature/MP42-admin-edit-trainee` branch, then `migrate status` should say "up to date". Before the merge into `dev`. Tested on Docker only. Audit F-2, gap G-42-5 |
| O-4 | Do | Confirm a pull request exists from `feature/MP42-admin-edit-trainee` into `dev`, then merge | PR state could not be checked (`gh` is not installed here). Trial merge into `dev` and `main` is clean. Audit F-3 |
| O-5 | Decide | Jira says Done but the branch is not merged | Gap G-42-4 |
| O-6 | Decide | Is "record a new payment instead" still needed on a program change | Gap G-42-2 |
| O-7 | Decide | A shifted trainee's new enrollment has no receipt, so the withdrawal page reads the enrollment fee as unpaid | Gap G-42-3. Before `main` |
| O-8 | Decide | Should unit tests be written for the MP-42 code | The branch has none. The 215 I wrote were deleted at the owner's request. Audit F-1 |
| O-9 | Check | Run the MP-42 pages in a browser (edit, change batch, change program, history) on `dev` after the merge | The author reports 30 browser checks; I did not see them |
| O-10 | Do | Add the Docker migration result and the apply order to the MP-42 audit report, and a follow-up Jira comment | The Docker run (real Prisma tool applied the new migration, "up to date") and "which branch to run it from" are only in the chat so far |
| O-11 | Do | Open the pull request for `docs/mp42-dod-audit` (audit, acceptance statuses, TECH-05, README) into `dev` | The audit docs are pushed but not in `dev` |

## MP-49, Admin Final Sign-off (branch `feature/MP-49-admin-withdrawal-signoff`, not merged)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-12 | Do | Open the pull request into `dev` and merge | 0 behind `dev`, no migration, trial merges clean |
| O-13 | Check | Run the browser cases TC-A11 to TC-A15, including one real sign-off, on `dev` after the merge. Then re-run the read-only Supabase checks | The pages were checked by code reading and through the API only. Audit F-1, F-8 |
| O-14 | Decide | Must the admin give a reason to reject | Item 15. Audit F-3 |
| O-15 | Decide | Copy the trainee's reason into `exit_reason` on approval | Item 16. Audit F-4 |
| O-16 | Decide | What happens to the trainee's account after approval (A, B or C) | Item 9. Built as option A with a TODO in `signOffByAdmin` |
| O-17 | Decide | MP-42 program change while a withdrawal request is open | Item 17. Before MP-42 and MP-49 both reach `main` |
| O-18 | Decide | Keep or retire the old `request_status` | Item 14. Now due: MP-49 leaves it at `PENDING` on every finished request |
| O-19 | Do | Update the Jira status and add the release to `push-log.md` once merged | |

## Tracked elsewhere (existing)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-20 | Do | TECH-01 to TECH-04 and SEC-02 | See `README.md` (Technical Debt). TECH-05 (ID card number clash returns a 500) is new from the MP-42 audit |
| O-21 | Decide | Supabase row level security is off on every table | Item 10 |
| O-22 | Do | Make sure the build and CI run `prisma generate` before `tsc` | The generated client is git-ignored, so `tsc` fails on a fresh checkout (7 errors on MP-42) until it runs. Audit F-9 |
| O-23 | Check | One real request on Supabase is waiting for the registrar (`TRAINER_VALIDATED`). Nothing is at the admin step yet | Informational |

## Housekeeping

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-24 | Tidy | Local `dev` has one commit that is not pushed: `eb2ffa5`, "MP-47: audit of dev after the merge and push log entries" | It edits `push-log.md` and `shared/withdrawal/acceptance.md`, which MP-49 also edited, so expect a small merge conflict. Push it or drop it |
| O-25 | Tidy | The stray file `text.txt` at the repository root is untracked | Delete it, or keep it out of commits |
| O-26 | Tidy | The MP-49 unit test files are untracked in the working tree | `withdrawal.admin.service.spec.ts` and `admin-withdrawal.controller.spec.ts`. Kept local on purpose (D-11). Do not commit |
| O-27 | Tidy | Docker Desktop is still running | I started it for the migration checks. Quit it from the tray if you do not want it |
