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
| MP-25 | Payments Module | — | Vince Jon Gonzalez | Not Started |
| MP-39 | Trainer Announcements Module | `staging` | Chelsea Cllj | Code Review Done (34/34 AC) |
