# Open Items

Everything still open on 2026-11-10, in one place. Questions that need an answer are numbered in `to-be-discussed.md`. Audits are in `trainee/profile/audit-dod.md` (MP-41), `admin/trainee-edit/audit-dod.md` (MP-42), `shared/withdrawal/audit-mp47-registrar.md` (MP-47) and `shared/withdrawal/audit-mp49-admin.md` (MP-49). Update this list as items close.

Type: **Decide** = needs an answer from the team or product owner. **Do** = a task. **Check** = something to test or confirm. **Tidy** = housekeeping.

**Release state on 2026-11-10:** MP-41, MP-42 and MP-47 are on `dev`, `staging` and `main` (promotion PR #100). MP-49 is still on its own branch.

---

## MP-41, Trainee Profile Page (on `main`)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-1 | Do | A file that says it is a PNG but is not an image gives a 500, not a 400 | `sharp` throws on the bad bytes and nothing catches it. Audit finding F-2, criterion 8 |
| O-2 | Do | A failed clean-up of the old photo reports an error after the new photo was saved | The user sees a failure, the header does not update, the old file stays. Audit F-3, criterion 17 |
| O-3 | Tidy | Unrelated edits came in with the branch | `@prisma/adapter-pg` is no longer an exact pin, `pg` is `^8.23.1`, `@types/helmet` is not needed, a personal file name in `.gitignore`, comments removed from `AuthContext`. Decide whether to revert them |
| O-4 | Decide | Public or private photo bucket | `to-be-discussed.md` item 1. The bucket is public today, so anyone with the link can see a photo (criterion 18) |
| O-5 | Decide | Should the photo appear on the ID card or the registrar's enrollment view | `to-be-discussed.md` item 1, row 8 |
| O-6 | Check | Photo upload from the page, cancel, replace a photo, and the phone and tablet layout | Criteria 7, 13, 14 and 17 are PARTIAL until seen. Photo upload to real storage has never been run from the page |
| O-7 | Decide | Should a trainee be asked to change `traineedefault` at first login | Audit F-11. Every new account has the same fixed password |
| O-8 | Do | Write unit tests for the profile code | The branch added none |

## MP-42, Admin Edit Trainee (on `main`)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-9 | Do | Fix the missing-beneficiary 500: `PATCH /admin/trainees/:id` with no `beneficiary` field returns 500, not 400 | Add `@IsDefined()` on `beneficiary` in `TraineeDetailsDto`. Makes AC 2 pass. Audit F-15. No screen can trigger it today |
| O-10 | Check | Does the enrollment form have the same weakness? It shares `TraineeDetailsDto` | Not tested. Audit F-15 |
| O-11 | Decide | Should unit tests be written for the MP-42 code | The branch has none. The 215 that were written were deleted at the owner's request. Audit F-1 |
| O-12 | Decide | Known gap: the withdrawal page shows the enrollment fee as unpaid for a trainee who changed program | Decision D-7 (2026-11-10): the payment is one-time, kept as a known gap. Later options: follow the transfer chain in MP-47, or write a zero-amount carried receipt. Audit F-4 |
| O-13 | Decide | Known gap: the old uniform is not returned to stock when a trainee changes program | Decision D-6 (2026-11-10): the trainee keeps it. Audit F-16 |
| O-14 | Decide | Is "record a new payment instead" still needed on a program change | Gap G-42-2 |
| O-15 | Decide | MP-42 program change while a withdrawal request is open | Item 17. A batch change with an open request was tested on 2026-11-10 and the request follows the trainee to the new batch. A program change with an open request is not tested |
| O-16 | Check | Re-check one real batch change and one program change on `main` | Checked in a browser by the owner on 2026-11-10. Re-read the Supabase history rows after the first real change |

Closed since 2026-11-09: the migration `20261106_trainee_enrollment_transfers` was applied on Supabase on 2026-11-10 (`migrate status`: up to date). The pull request was merged into `dev` (PR #96) and promoted to `staging` and `main`. The audit docs were merged (PR #97). Jira says Done and the code is on `main`.

## MP-47, Registrar Withdrawal (on `main`)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-17 | Check | Browser cases TC-R12 to TC-R17 | Not seen in a browser by me. See `shared/withdrawal/acceptance.md` |
| O-18 | Decide | Should the trainee see the approval notes (finding F-13) | `audit-mp47-registrar.md` |
| O-19 | Do | Update the Jira status for MP-47 | Jira still said To Do on 2026-11-10 |

## MP-49, Admin Final Sign-off (branch `feature/MP-49-admin-withdrawal-signoff`, not merged)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-20 | Do | Bring the branch up to date with `dev` and merge | 20 behind `dev` on 2026-11-10. One conflict, `backlogs/push-log.md`. No migration |
| O-21 | Check | Browser cases TC-A11 to TC-A15, including one real sign-off, on `dev` after the merge. Then re-run the read-only Supabase checks | The pages were checked by code reading and through the API only. Audit F-1, F-8 |
| O-22 | Decide | Must the admin give a reason to reject | Item 15. Audit F-3 |
| O-23 | Decide | Copy the trainee's reason into `exit_reason` on approval | Item 16. Audit F-4 |
| O-24 | Decide | What happens to the trainee's account after approval (A, B or C) | Item 9. Built as option A with a TODO in `signOffByAdmin` |
| O-25 | Decide | Keep or retire the old `request_status` | Item 14. MP-49 leaves it at `PENDING` on every finished request. Audit F-11 |
| O-26 | Do | Update the Jira status and add the release to `push-log.md` once merged | |

## Tracked elsewhere (existing)

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-27 | Do | TECH-01 to TECH-05 and SEC-02 | See `README.md` (Technical Debt). TECH-05 is the ID card number clash that returns a 500 |
| O-28 | Decide | Supabase row level security is off on every table | Item 10 |
| O-29 | Do | Make sure the build and CI run `prisma generate` before `tsc` | The generated client is git-ignored, so `tsc` fails on a fresh checkout until it runs |
| O-30 | Do | Update the dev tools that `npm audit` now flags | Audit F-17 (MP-42): backend 28 and frontend 10 advisories, none high or critical, all in test and lint tools. `npm audit --omit=dev` is 0. Most fixes are major upgrades, so test them first. Do not run `npm audit fix --force` |
| O-31 | Check | If a separate staging or production database is ever used, run `npx prisma migrate deploy` there | Today there is one Supabase project and all 14 migrations are applied |

## Housekeeping

| ID | Type | Item | Detail |
|----|------|------|--------|
| O-32 | Tidy | Local `dev` has one commit that is not pushed: "MP-47: audit of dev after the merge and push log entries" | It edits `push-log.md` and `shared/withdrawal/acceptance.md`, which MP-49 also edited. Push it through a docs branch and merge it before MP-49 |
| O-33 | Tidy | The stray file `text.txt` at the repository root is untracked | Delete it, or keep it out of commits |
| O-34 | Tidy | The MP-49 unit test files are untracked in the working tree | `withdrawal.admin.service.spec.ts` and `admin-withdrawal.controller.spec.ts`. Kept local on purpose (D-11). Do not commit |
| O-35 | Tidy | Old branches that are now merged | `docs/mp42-dod-audit`, `docs/mp42-dod-audit-uniform`, `docs/fix-mp41-acceptance-header`, `feature/MP-41`, `feature/MP42-admin-edit-trainee`, `feature/MP-47-registrar-withdrawal` |
