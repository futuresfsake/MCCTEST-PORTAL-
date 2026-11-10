# Push Log — Features Merged to Main

## Merged

| Date | Ticket | Feature | Branch / PR | Sprint |
|------|--------|---------|-------------|--------|
| 2026-08-25 | — | Frontend init | PR #1 `frontend-init` | — |
| 2026-08-27 | MP-4 | Authentication & Landing Page | `MP-4` | Sprint 1 |
| 2026-08-28 | MP-8 | Admin Dashboard (placeholder) | `MP-8` | Sprint 1 |
| 2026-09-04 | — | Landing Page, Auth, Admin Dashboard, FE fixes | merge commit | — |
| 2026-09-12 | MP-13, MP-14 | Programs Module, Staff Accounts | PR #6 `testing` | Sprint 2 |
| 2026-09-19 | MP-15 | Batch Configuration (registrar) | PR #7 `testing` | Sprint 2 |
| 2026-09-20 | MP-16 | Enrollment Form (registrar) | PR #8 `testing` | Sprint 2 |
| 2026-09-25 | MP-14, MP-15 | Staff Accounts + Batch Config improvements | commit `Completed MP15 and Improved MP14` | Sprint 2 |
| 2026-09-28 | MP-21, MP-22, MP-23, MP-31 | Announcements + Batches (admin + registrar) | PRs #9, #11, #12, #13 `staging` | Sprint 2 |
| 2026-09-30 | MP-26, MP-31 | Trainee Account Generation + Registrar announcement fixes | PR #14 `staging` | Sprint 2/3 |
| 2026-10-06 | MP-16 | Enrollment: lint, schedule fix, dedup | various commits | Sprint 2 |
| 2026-10-12 | MP-16 | Enrollment: re-enrollment, batch redesign, detail fixes | PR #15 `staging` | Sprint 2 |
| 2026-10-19 | MP-24 | Trainee Information Module (admin + registrar) | PR #16 `feature/MP-24-trainee-information` | Sprint 3 |
| 2026-10-20 | MP-24 | Trainee Information — final (shared module move, backlogs) | PR #17 `dev` → PR #18 `staging` | Sprint 3 |
| 2026-10-20 | — | Backlogs restructure (consistent format + structured test cases) | PR #19, PR #20 `backlogs-restructure` | — |
| 2026-10-20 | MP-33, MP-16 | Admin Enrollment Module + registrar UUID validation | PR #21 `adminEnrollment` → PR #22 `dev` → PR #23 `staging` | Sprint 3 |
| 2026-10-20 | — | Update push log — add PRs #19–#23, move MP-33 to merged | PR #24 `update-push-log` | — |
| 2026-10-20 | TECH-01 | Technical debt backlog for e2e Jest ESM config | PR #25 `backlog-technical-debt` | — |
| 2026-10-20 | MP-37 | Encoder Announcements Module + Dashboard Widgets (Trainer, Trainee, Encoder) | PR #26 `mp-37-encoder-announcements` | Sprint 3 |
| 2026-10-20 | — | Dev sync merge (resolve conflicts in acceptance.md and push-log.md) | PR #27 `merge-dev-sync` | — |
| 2026-10-20 | — | Dev merge (push log PRs #24–#27, announcements role permissions) | PR #28 `dev` | — |
| 2026-10-20 | — | Staging → main (push log updates, role permissions table) | PR #29 `staging` | — |
| 2026-10-22 | MP-39 | Trainer Announcements Module | PR #30 `trainerannouncements` | Sprint 3 |
| 2026-10-22 | MP-25 | Payments Module (admin + registrar) — backend + frontend | PR #34 `feature/MP-25` → `dev` | Sprint 3 |
| 2026-11-03 | MP-50, MP-51 | Trainee Information for Trainer (own batches only, no insurance) and Encoder (all trainees), view-only | PR #39 `feature/MP-50-51-trainee-information-trainer-encoder` → `main` (merged straight to main), then synced to `dev` (PR #40), `staging` (PR #42) | Sprint 3 |
| 2026-11-03 | — | Pre-staging audit fixes (sessions route guarded, chatbot throttle, debug logging removed, dependency updates, type and lint fixes) | PR #41 `fix/predeploy-audit-fixes` → `dev` → PR #42 `staging` | Sprint 3 |
| 2026-11-03 | — | Audit logs for `dev` and `staging` (MP-24, MP-50, MP-51) | `docs/staging-audit-logs` → `staging` | Sprint 3 |
| 2026-11-03 | MP-24, MP-50, MP-51 | `staging` → `main`: Trainee Information for Trainer and Encoder, audit fixes, audit logs (main audited after merge, see `trainer/trainee-information/acceptance.md`) | PR #44 `staging` → `main` | Sprint 3 |
| 2026-11-03 | — | Audit logs for `main` | `docs/main-audit-logs` → `main` | Sprint 3 |
| 2026-11-03 | MP-30, SEC-01 | Trainee Dashboard, trainee announcements page and header bell, and the SEC-01 fix (announcements API no longer returns the poster's password hash) | PR #46 `feature/MP-30-trainee-dashboard` → `dev`, then PR #49 `dev` → `staging` (not yet on `main`) | Sprint 3 |
| 2026-11-03 | — | Audit logs for `staging` (MP-30, SEC-01, SEC-02) | `docs/staging-audit-mp30-sec01` → `staging` | Sprint 3 |
| 2026-11-03 | MP-35 | Uniform Inventory Module (admin + registrar): stock per program and size, restock, adjust with a reason, history of every change, automatic deduction when a trainee is enrolled with the uniform given | PR #52 `MP-35-uniform-inventory` → `dev` | Sprint 3 |
| 2026-11-03 | MP-35 | Default inventory for every program (7 size rows at 0 and a backfill migration), Add Item dialog, XXXL in the size filter | PR #53 `docs/mp35-default-inventory-test-cases` → `dev` | Sprint 3 |
| 2026-11-03 | MP-35 | Inventory list grouped by program with a size strip, program-level Stock Log fixes, Definition of Done audit | PR #54 `feature/MP-35-inventory-program-groups` → `dev` | Sprint 3 |
| 2026-11-03 | — | Audit log for `dev` (MP-35: Definition of Done, migrations, data) | `docs/mp35-dev-audit` → `dev` | Sprint 3 |
| 2026-11-03 | MP-35 | `dev` → `staging`: Uniform Inventory (admin + registrar), default inventory for every program, program-grouped list, audit logs. Four migrations, all already applied to Supabase | PR #56 `dev` → `staging` (PRs #52 to #55 came with it) | Sprint 3 |
| 2026-11-03 | — | Audit logs for `staging` (MP-35: Definition of Done, migrations, data) | `docs/mp35-staging-audit` → `staging` | Sprint 3 |
| 2026-11-04 | MP-45 | Withdrawal pipeline schema: `withdrawal_status_enum`, 13 columns on `withdrawal_request`, `withdrawal_status_history`, backfill. One additive migration, **applied to Supabase 2026-11-04** (table had 0 rows) | PR #62 `feature/MP-45-withdrawal-schema` → `dev` | — |
| 2026-11-04 | MP-46 | Trainee withdrawal API: submit, list, detail, cancel under `/api/trainee/withdrawal-requests`, shared `WithdrawalService`, 20 unit tests | PR #63 `feature/withdrawal-trainee-request-api` → `dev` | — |
| 2026-11-04 | MP-46 | Trainee withdrawal pages: list with filter and pagination, request form, four-stage progress view with history and cancel | PR #64 `feature/withdrawal-trainee-request-ui` → `dev` | — |
| 2026-11-04 | MP-45, MP-46 | `dev` → `staging`: withdrawal schema, trainee API and pages. Reached `staging` through PR #66, which carried `dev`'s commits. Migration was already applied to Supabase, so nothing to apply on deploy | PR #66 `docs/withdrawal-pre-staging-audit` → `staging` | — |
| 2026-11-04 | MP-48 | Trainer withdrawal API (first validation): list, detail and validate under `/api/trainer/withdrawal-requests`, scoped to the trainer's own batches. A reason is required to reject (D-07) | PR #68 `feature/withdrawal-trainer-validation-api` → `dev` | — |
| 2026-11-04 | MP-48 | Trainer withdrawal pages: list, side panel to approve or reject. Merged in PR #69, reverted in PR #70, restored in PR #71 (the content is the same as PR #69) | PR #69 `feature/withdrawal-trainer-validation-ui` → `dev`; PR #70 revert; PR #71 `fix/restore-trainer-withdrawal-pages` → `dev` | — |
| 2026-11-04 | MP-48 | `dev` → `staging`: withdrawal trainer API and pages (merged directly, not through a PR). Nothing to apply on deploy, the migration was already on Supabase | merge commit `16838f9` on `staging` | — |
| 2026-11-04 | MP-48 | Security: `helmet` security headers (finding A-1) and `multer` pinned to 2.5.0 (finding A-3) | PR #75 `fix/security-headers-multer-staging` → `dev` | — |
| 2026-11-04 | MP-48 | Trainer withdrawal Request history table: decided requests (approved or rejected) listed below the main list, newest decision first, with its own trainee search and a status filter. Backend `status=DECIDED` query and unit tests. Checked on merged `dev`: backend 102 of 102 tests, `tsc` clean, frontend build and lint clean. **Not checked in a browser** | PR #76 `feat/withdrawal-trainer-history` → `dev` | — |
| 2026-11-04 | MP-45, MP-46, MP-48 | `staging` → `main`: the withdrawal schema, trainee and trainer work, history table and security headers. Migration already on Supabase, nothing to apply on deploy. Definition of Done audit recorded in `shared/withdrawal/audit-pre-main.md` (PR #79, reworded in PR #82) | PR #80 `staging` → `main` (14:28) | — |
| 2026-11-06 | MP-43 | Requirements Tracking (Registrar and Admin pages): shared backend module with Admin and Registrar controllers, enrollment endpoints now save through the same service, history table (one migration, **applied to Supabase 2026-11-06**), six documents (the commitment fee is not a requirement, D-4). Backend 102 of 102 tests, lint, type-check and build clean. Four criteria changed by decision (D-1, D-4). Unit tests for the new code kept out of the branch (D-8). Audit: `registrar/requirements/audit-dod.md` | PR #88 `feature/MP-43-requirements-tracking` → `dev` (11:09) | Sprint 4 |
| 2026-11-06 | MP-43 | `dev` → `staging`: Requirements Tracking. Nothing to apply on deploy, the migration was already on Supabase. Final Definition of Done check and a smoke test of the API on the merged code recorded in `registrar/requirements/audit-dod.md` section 13. **Not checked in a browser by the auditor** | PR #89 `dev` → `staging` (11:26) | Sprint 4 |
| 2026-11-06 | MP-43 | `staging` → `main`: Requirements Tracking (Registrar and Admin pages, shared backend, history table, six documents). The code on `main` is identical to `staging`. Migration already on Supabase, nothing to apply on deploy. Definition of Done audit recorded in `registrar/requirements/audit-dod.md` | PR #90 `staging` → `main` (11:34) | Sprint 4 |

---

## Release Status by Task

When each task reached `dev`, `staging` and `main`. Times are the time of the merge commit that first brought the task onto that branch, in Philippine time (+08:00), taken from git. The PR number is the PR that carried it there. Audit-log and documentation PRs are not listed here.

| Ticket | Feature | On `dev` | On `staging` | On `main` |
|--------|---------|----------|--------------|-----------|
| MP-24 | Trainee Information (admin, registrar) | 2026-10-20 08:53 (PR #16) | 2026-10-20 09:07 (PR #17) | 2026-10-20 09:12 (PR #18) |
| MP-33 | Admin Enrollments, registrar UUID validation (MP-16) | 2026-10-20 16:04 (PR #21) | 2026-10-20 16:22 (PR #22) | 2026-10-20 16:35 (PR #23) |
| MP-37 | Encoder Announcements and dashboard widgets | 2026-10-20 20:43 (PR #26) | 2026-10-20 20:59 (PR #28) | 2026-10-20 21:08 (PR #29) |
| MP-39 | Trainer Announcements | 2026-10-22 08:34 (PR #30) | 2026-10-22 08:42 (PR #31) | 2026-10-22 08:53 (PR #32) |
| MP-25 | Payments (admin, registrar) | 2026-10-22 10:46 (PR #34) | 2026-10-22 11:01 (PR #36) | 2026-10-22 12:08 (PR #38) |
| MP-50, MP-51 | Trainee Information for Trainer and Encoder | 2026-11-03 08:14 (PR #40, synced from `main`) | 2026-11-03 08:31 (PR #42) | 2026-11-03 08:10 (PR #39, merged straight to `main`) |
| MP-30, SEC-01 | Trainee Dashboard, SEC-01 fix | 2026-11-03 13:53 (PR #46) | 2026-11-03 14:00 (PR #49) | 2026-11-03 14:07 (PR #51) |
| MP-35 | Uniform Inventory (admin, registrar) | 2026-11-03 15:29 (PR #52), 15:57 (PR #53), 16:15 (PR #54) | 2026-11-03 16:21 (PR #56) | 2026-11-03 16:43 (PR #58) |
| MP-45 | Withdrawal schema and migration | 2026-11-04 10:38 (PR #62) | 2026-11-04 11:18 (PR #66) | 2026-11-04 14:28 (PR #80) |
| MP-46 | Withdrawal, trainee request API and pages | 2026-11-04 10:59 (PR #63, API), 11:00 (PR #64, pages) | 2026-11-04 11:18 (PR #66) | 2026-11-04 14:28 (PR #80) |
| MP-48 | Withdrawal, trainer API and pages | 2026-11-04 11:37 (PR #68, API), 11:37 (PR #69, pages), restored 11:40 (PR #71) | 2026-11-04 13:15 (merge commit `16838f9`) | 2026-11-04 14:28 (PR #80) |
| MP-48 | Withdrawal, trainer Request history and security headers (helmet, multer 2.5.0) | 2026-11-04 14:06 (PR #75, security), 14:18 (PR #76, history table) | 2026-11-04 14:22 (PR #78, `dev` → `staging`) | 2026-11-04 14:28 (PR #80). Audited before `main`: `shared/withdrawal/audit-pre-main.md` |
| MP-43 | Requirements Tracking (Registrar and Admin) | 2026-11-06 11:09 (PR #88) | 2026-11-06 11:26 (PR #89) | 2026-11-06 11:34 (PR #90). Audited before `main`: `registrar/requirements/audit-dod.md` |

Tasks before MP-24 (MP-4 to MP-16, MP-21, MP-22, MP-23, MP-26, MP-31) are in the Merged table by date only. They were not recomputed here.

## Announcements — Role Permissions (Admin, Registrar, Encoder)

| Action | Admin | Registrar | Encoder |
|--------|-------|-----------|---------|
| Post Global | Yes | Yes | Yes |
| Post Program | Yes | Yes | Yes |
| Post Batch | Yes | Yes | Yes |
| View all (paginated + filters) | Yes | Yes | Yes |
| Edit own announcements | Yes | Yes | Yes |
| Edit others' announcements | Yes | No | No |
| Delete own announcements | Yes | Yes | Yes |
| Delete others' announcements | No | No | No |

**Note:** Admin page relies on component defaults (no explicit props); Registrar and Encoder pages pass permissions explicitly. Behavior is identical.

---

## Announcements — Trainer Permissions

| Action | Trainer |
|--------|---------|
| Post Global | No (403) |
| Post Program | Yes (own programs only) |
| Post Batch | Yes (own batches only) |
| View all (paginated + filters) | Own posts only |
| Edit own announcements | Yes |
| Edit others' announcements | No |
| Delete | No (excluded from @Delete roles) |
| Dashboard widget | GLOBAL + own programs + own batches |

---

## In Progress

| Ticket | Feature | Branch | Assignee | Status |
|--------|---------|--------|----------|--------|
| MP-25 | Payments Module (admin + registrar) | `feature/MP-25` → `dev` → `staging` → `main` | Vince Jon Gonzalez | Done. On `dev`, `staging` and `main` (PR #38, 2026-10-22 12:08). See Release Status by Task |
| MP-35 | Uniform Inventory Module (admin + registrar) | `MP-35-uniform-inventory` → `dev` (PR #52, #53, #54) | Rhoddz Gerunda | On `dev`, `staging` (PR #56) and `main` (PR #58, 2026-11-03 16:43). All five MP-35 migrations are applied to Supabase (the last, default inventory for every program, on 2026-11-03 15:53). `dev` and `staging` audited 2026-11-03 (checks, migrations and data all pass). Definition of Done: 2 of 6 met, 2 partial, 2 not met. Open: browser walkthrough as Admin and Registrar, concurrency tests, stock in the enrollment form (criterion 13), MP-53. See `admin/inventory/acceptance.md` |
| MP-53 | Uniform Distribution: mark a uniform as distributed after enrollment and deduct stock (Registrar only, its own page) | not started | Rhoddz Gerunda | Not started. Jira ticket and backlog written, depends on MP-35. Depends on MP-35 and MP-52. See `registrar/uniform-distribution/acceptance.md` |
| MP-59 | Uniform Restock Reminder: Registrar reminds the Admin to order more uniforms (split from MP-53) | not started | Chelsea Cllj | Not started. Depends on MP-52, MP-54 and MP-53. See `registrar/uniform-restock-reminder/acceptance.md` |
| MP-58 | Bug: enrollment does not deduct uniform stock when "Uniform distributed" is selected | not started | Rhoddz Gerunda | Not started. In MP Sprint 4. Related to MP-35 and MP-53 |
| MP-41 | Trainee Profile Page (view and edit, photo upload) | `feature/MP-41` | Vince Jon Gonzalez | On `dev` (PR #95, 2026-11-10), `staging` (PR #99) and `main` (PR #100). **Checked by Chelsea Cllj 2026-11-06 and re-checked 2026-11-10.** Definition of Done audit (`trainee/profile/audit-dod.md`): 13 of 19 criteria pass, 6 partial, 0 not met. The `sharp` build blocker is fixed. Two medium bugs stay open: a fake image gives a 500, and a failed old-photo clean-up reports an error after the new photo was saved. No migration. See `open-items.md` |
| MP-42 | Admin Edit Trainee: info, batch and program changes, change history | `feature/MP42-admin-edit-trainee` | Aubrien Fuentes | On `dev` (PR #96, 2026-11-10), `staging` (PR #99) and `main` (PR #100). Migration `20261106_trainee_enrollment_transfers` **applied on Supabase 2026-11-10**. Definition of Done audit re-checked 2026-11-10 (`admin/trainee-edit/audit-dod.md`): 21 of 22 criteria pass. Open: a missing `beneficiary` gives a 500 (F-15), no unit tests (F-1). Decisions D-6 (old uniform stays with the trainee) and D-7 (one-time payment, the withdrawal fee line shows unpaid for a shifted trainee, F-4). See `open-items.md` |
| MP-43 | Requirements Tracking: check and update trainee documents (Registrar and Admin) | `feature/MP-43-requirements-tracking` → `dev` (PR #88) → `staging` (PR #89) | Chelsea Cllj | In Review (Jira). On `dev`, `staging` and `main` (PR #90, 2026-11-06 11:34). Migration applied to Supabase 2026-11-06. Definition of Done audit: 15 of 23 criteria pass, 4 partial, 4 changed by decision (D-1, D-4). Jira description still needs updating (F-2). See `registrar/requirements/audit-dod.md` |
| MP-52 | Notification foundation: shared bell, notifications table and live push (all roles) | not started | Rhoddz Gerunda | Not started. Jira ticket and backlog written, the other four notification tickets depend on it. See `shared/notifications/acceptance.md` |
| MP-54 | Notification bell: Admin events (staff account status, password reset) | not started | Chelsea Cllj (Jira default, reassign if needed) | Not started. Depends on MP-52. See `admin/notifications/acceptance.md` |
| MP-55 | Notification bell: Registrar events (batch changes, trainees added or removed) | not started | Chelsea Cllj (Jira default, reassign if needed) | Not started. Depends on MP-52. See `registrar/notifications/acceptance.md` |
| MP-56 | Notification bell: Trainer events (batch assigned, removed, schedule changed, closed or cancelled) | not started | Chelsea Cllj (Jira default, reassign if needed) | Not started. Depends on MP-52. See `trainer/notifications/acceptance.md` |
| MP-57 | Notification bell: Encoder events (enrollment completed, dropped or withdrawn) | not started | Chelsea Cllj (Jira default, reassign if needed) | Not started. Depends on MP-52. See `encoder/notifications/acceptance.md` |
| MP-45 | Withdrawal pipeline schema and migration | `feature/MP-45-withdrawal-schema` | Chelsea Cllj | On `dev` (PR #62, 2026-11-04 10:38) and `staging` (2026-11-04 11:18) and `main` (PR #80, 2026-11-04 14:28). Migration applied to Supabase 2026-11-04 (23 columns, enum, 2 indexes, history table). See `shared/withdrawal/migration.md` |
| MP-46 | Withdrawal, Trainee: submit request and pipeline view | `feature/withdrawal-trainee-request-api`, `feature/withdrawal-trainee-request-ui` | Chelsea Cllj | On `dev` (PRs #63, #64, 2026-11-04 10:59 and 11:00) and `staging` (2026-11-04 11:18) and `main` (PR #80, 2026-11-04 14:28). A real trainee submitted a request on Supabase 2026-11-04. Pages not yet checked in a browser. See `shared/withdrawal/acceptance.md` |
| MP-47 | Withdrawal, Registrar: validate withdrawal request | `feature/MP-47-registrar-withdrawal` | Chelsea Cllj | Built on 2026-11-06 (backend, frontend, payment history pop-up, tracker step). Checked by 109 requests on a throwaway database. Unit tests kept out of the commit (D-11). Definition of Done audit done 2026-11-06 (shared/withdrawal/audit-mp47-registrar.md): 10 of 15 criteria pass, 5 partial, ready for dev, not yet for main. **Branch pushed 2026-11-06** (4 commits, `52f3fee`, 4 ahead of `dev`, 0 behind). No pull request yet, not merged into `dev`, `staging` or `main`. Not seen in a browser by the auditor (TC-R12 to TC-R17 still to run). Decisions D-08 to D-11: two manual checks (finances, documents), a reason to reject, the ID confirmed by the admin (MP-49), a payment history pop-up, released on its own. No migration. Jira MP-47 and MP-49 and the criteria R-1 to R-11 updated. Acts only on requests the trainer has approved (D-06). Depends on MP-48 |
| MP-48 | Withdrawal, Trainer: validate withdrawal request (first step) | `feature/withdrawal-trainer-validation-api`, `feature/withdrawal-trainer-validation-ui` | Chelsea Cllj | On `dev` (PRs #68, #69, restored in #71, 2026-11-04 11:37 to 11:40) and `staging` (2026-11-04 13:15). Reason required to reject (D-07). Pages not yet checked in a browser. No batch filter on the page yet. Follow-up on `dev` (2026-11-04): Request history table (PR #76) and helmet + multer 2.5.0 (PR #75). The follow-up reached `staging` 2026-11-04 14:22 (PR #78). The whole task, including the follow-up, reached `main` 2026-11-04 14:28 (PR #80). The history table has not been checked in a browser. Definition of Done audit before `main`: `shared/withdrawal/audit-pre-main.md` See `shared/withdrawal/acceptance.md` and `shared/withdrawal/audit-trainer-history.md` |
| MP-49 | Withdrawal, Admin: final sign-off and set trainee inactive | `feature/MP-49-admin-withdrawal-signoff` | Chelsea Cllj | Built and pushed 2026-11-09 in three sections (backend `b3fe592`, frontend `b4c4ad7`, docs `c825ad9`). Not merged, 0 migrations. Checked by 114 requests on a throwaway database. Unit tests kept out of the commit (D-11). Definition of Done audit done 2026-11-09 (`shared/withdrawal/audit-mp49-admin.md`): 12 of 12 criteria pass over the API, browser check and merge still open. Open: what happens to the trainee's account after approval (`to-be-discussed.md` item 9), and whether the admin must give a reason to reject Merged into `dev` (PR #101, 2026-11-10). **Not on `staging` or `main` yet.** Audited again on `dev` (`shared/withdrawal/audit-dev-pre-staging-mp49.md`): 11 of 12 criteria pass, 1 partial, ready for `staging`, no migration |
| MP-39 | Trainer Announcements Module | `trainerannouncements` → `dev` → `staging` → `main` | Chelsea Cllj | Done. On `dev`, `staging` and `main` (PR #32, 2026-10-22 08:53). See Release Status by Task |
| SEC-01 | **Security: announcements API exposed the poster's password hash to every logged-in role** | `feature/MP-30-trainee-dashboard` → `dev` (PR #46) → `staging` (PR #49) | Chelsea Cllj | Fixed. On `dev`, `staging` and `main` (PR #51, 2026-11-03 14:07). Still needs the backend restart and password resets for staff who posted announcements. See `technical/announcements-password-hash-exposure/acceptance.md` |
| SEC-02 | **Security: `multer` denial-of-service advisory (GHSA-q7qp-rjg7-q26m) in `backend-nestjs`** | — | Chelsea Cllj | Logged, not fixed. Deferred by choice. See `technical/multer-dos-advisory/acceptance.md` |

---

## Trainee Information — Role Access

| Action | Admin | Registrar | Trainer | Encoder | Trainee |
|--------|-------|-----------|---------|---------|---------|
| Open Trainees page | Yes | Yes | Yes (own batches only) | Yes | No (403) |
| See all trainees | Yes | Yes | No | Yes | No |
| Insurance filter and insurance details | Yes | Yes | No | Yes | No |
| Edit trainee | No (view-only until MP-42) | No | No | No | No |
| Route | `/admin/trainees` | `/registrar/trainees` | `/trainer/trainees` | `/encoder/trainees` | — |
