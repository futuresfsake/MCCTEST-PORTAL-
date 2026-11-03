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

---

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
| MP-25 | Payments Module (admin + registrar) | `feature/MP-25` → `dev` → `staging` | Vince Jon Gonzalez | On staging — PR to main pending |
| MP-35 | Uniform Inventory Module (admin + registrar) | `MP-35-uniform-inventory` → `dev` (PR #52, #53, #54) | Rhoddz Gerunda | On `dev` and `staging` (PR #56). **Not on `main`.** All five MP-35 migrations are applied to Supabase (the last, default inventory for every program, on 2026-11-03 15:53). `dev` and `staging` audited 2026-11-03 (checks, migrations and data all pass). Definition of Done: 2 of 6 met, 2 partial, 2 not met. Open: browser walkthrough as Admin and Registrar, concurrency tests, stock in the enrollment form (criterion 13), MP-53. See `admin/inventory/acceptance.md` |
| MP-53 | Uniform Distribution: mark a uniform as distributed after enrollment and deduct stock (reusable module, Admin and Registrar) | not started | Chelsea Cllj (Jira default, reassign if needed) | Not started. Jira ticket and backlog written, depends on MP-35. See `admin/uniform-distribution/acceptance.md` |
| MP-39 | Trainer Announcements Module | `staging` | Chelsea Cllj | On staging — PR to main pending |
| SEC-01 | **Security: announcements API exposed the poster's password hash to every logged-in role** | `feature/MP-30-trainee-dashboard` → `dev` (PR #46) → `staging` (PR #49) | Chelsea Cllj | Fixed and on `dev` and `staging`. **Not yet on `main`.** Still needs the backend restart and password resets for staff who posted announcements. See `technical/announcements-password-hash-exposure/acceptance.md` |
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
