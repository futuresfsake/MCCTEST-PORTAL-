# MCCTEST Portal — Backlog Tracking

Structured acceptance criteria extracted from Jira, organized by role and module.
Each `acceptance.md` file contains acceptance criteria with PASS / PARTIAL / FAIL status.

---

## Folder Structure

```
backlogs/
  README.md                                      — This file
  push-log.md                                    — When each feature was pushed to main
  shared/
    authentication/acceptance.md                 — MP-4: Auth & Landing Page
    landing-page/acceptance.md                   — MP-20: Landing Page Chatbot
  admin/
    dashboard/acceptance.md                      — MP-8: Admin Dashboard (placeholder)
    programs/acceptance.md                       — MP-13: Programs Module
    staff-accounts/acceptance.md                 — MP-14: Staff User Accounts
    announcements/acceptance.md                  — MP-21: Announcements Module
    batches/acceptance.md                        — MP-22/23: Batch Management + Trainee Management
    trainee-information/acceptance.md            — MP-24: Trainee Information (shared, view-only)
    enrollment/acceptance.md                     — MP-33: Admin Enrollments Module (IN PROGRESS)
    payments/acceptance.md                       — MP-25: Payments Module (30/30 PASS)
  registrar/
    dashboard/acceptance.md                      — Registrar Dashboard (placeholder)
    batches/acceptance.md                        — MP-15: Batch Configuration Module
    enrollment/acceptance.md                     — MP-16: Enrollment Form Module
    announcements/acceptance.md                  — MP-31: Registrar Announcements
    trainee-information/acceptance.md            — MP-24: Trainee Information (shared, view-only)
  trainer/
    dashboard/acceptance.md                      — Trainer Dashboard (placeholder, 7 pages planned)
    trainee-information/acceptance.md            - Trainee Information (own batches only, view-only)
  trainee/
    dashboard/acceptance.md                      — Trainee Dashboard (placeholder, 7 pages planned)
    dashboard-data-gaps/acceptance.md            — MP-30 follow-up: attendance, competencies, sessions not functional (NOT STARTED)
    account-generation/acceptance.md             — MP-26: Trainee Account Generation
  encoder/
    dashboard/acceptance.md                      — Encoder Dashboard (placeholder, 4 pages planned)
  technical/
    announcements-password-hash-exposure/acceptance.md — SEC-01: password hash exposed by announcements API (FIXED, on dev; staging and main pending)
    multer-dos-advisory/acceptance.md            — SEC-02: multer denial-of-service advisory (LOGGED, not fixed)
    e2e-test-config/acceptance.md                — TECH-01: Jest ESM config fix for e2e tests
```

---

## Status Legend

| Status | Meaning |
|--------|---------|
| PASS | Acceptance criteria verified and working |
| PARTIAL | Partially implemented, gaps documented |
| FAIL | Not working or missing critical functionality |
| NOT TESTED | Code exists but not yet manually verified |
| NOT STARTED | Feature has not been built yet |

---

## Sprint Summary

| Sprint | Dates | Tickets | Status |
|--------|-------|---------|--------|
| MP Sprint 1 | 2026-08-23 → 2026-08-30 | MP-4, MP-8 | All Done |
| MP Sprint 2 | 2026-09-02 → 2026-10-12 | MP-13, MP-14, MP-15, MP-16, MP-20, MP-21, MP-22, MP-23, MP-26, MP-31 | All Done |
| MP Sprint 3 | 2026-10-12 → 2026-10-18 | MP-24, MP-25, MP-33, MP-50, MP-51 | MP-24 Done, MP-25 30/30 PASS, MP-33 In Progress, MP-50/51 merged, browser check pending |

---

## Acceptance Criteria Scorecard

### By Module (features merged to main)

| Ticket | Module | Role | Assignee | Result |
|--------|--------|------|----------|--------|
| MP-4 | Authentication & Landing Page | Shared | Aubrien Fuentes | 8/8 PASS |
| MP-20 | Landing Page Chatbot | Shared | Chelsea Cllj | 3/3 PASS |
| MP-8 | Dashboard (placeholder) | Admin | Vince Jon Gonzalez | 4/4 PASS |
| MP-13 | Programs | Admin | Rhoddz Gerunda | 6/6 PASS |
| MP-14 | Staff Accounts | Admin | Aubrien Fuentes | 6/6 PASS |
| MP-21 | Announcements | Admin | Chelsea Cllj | 19/19 PASS |
| MP-22 | Batch Management | Admin | Chelsea Cllj | 20/20 PASS |
| MP-23 | Batch Trainee Management | Admin | Chelsea Cllj | 18/18 PASS |
| MP-24 | Trainee Information | Admin | Aubrien Fuentes | 29 PASS, 4 PARTIAL |
| MP-15 | Batch Configuration | Registrar | Aubrien Fuentes | 6/6 PASS |
| MP-16 | Enrollment Form | Registrar | Vince Jon Gonzalez | 7/7 PASS |
| MP-31 | Announcements | Registrar | Chelsea Cllj | 28/28 PASS |
| MP-24 | Trainee Information | Registrar | Aubrien Fuentes | 29 PASS, 4 PARTIAL |
| MP-50 | Trainee Information | Trainer | Chelsea Cllj | 21 PASS, 1 PENDING, 10 IMPLEMENTED (browser check pending) |
| MP-51 | Trainee Information | Encoder | Chelsea Cllj | Built, role access tested, browser check pending |
| MP-26 | Account Generation | Trainee | Chelsea Cllj | 12/12 PASS |

### Placeholders (dashboard only, no feature pages)

| Role | Dashboard | Planned Pages |
|------|-----------|---------------|
| Registrar | 4/4 PASS | — |
| Trainer | 4/4 PASS | 7 NOT STARTED |
| Trainee | 4/4 PASS | 7 NOT STARTED |
| Encoder | 4/4 PASS | 4 NOT STARTED |

### In Progress / Not Started

| Ticket | Module | Assignee | Status | Gaps |
|--------|--------|----------|--------|------|
| MP-33 | Admin Enrollments | Chelsea Cllj | In Progress | 8 FAIL, 2 PARTIAL — 7 critical gaps |
| MP-30 follow-up | Trainee dashboard: Attendance Summary, Competency Outcomes, Upcoming Sessions | Unassigned | Not Started | Tables are empty and nothing can write them (0 sessions, 0 attendance, 0 competencies, 0 outcomes). See `trainee/dashboard-data-gaps` |

### Technical Debt

| ID      | Issue                              | Priority | Status      | Notes                                                  |
|---------|------------------------------------|----------|-------------|--------------------------------------------------------|
| TECH-01 | E2E Test Jest ESM Compatibility    | Medium   | Not Started | `@nestjs/config` ESM breaks `jest-e2e.json` transform  |
| SEC-01  | Announcements API exposed the poster's password hash | High | Fixed, on dev. Staging and main pending | `include: { users: true }` returned the whole user row to every role. See `technical/announcements-password-hash-exposure` |
| SEC-02  | `multer` denial-of-service advisory (GHSA-q7qp-rjg7-q26m) in `backend-nestjs` | High | Logged, not fixed | Deferred by choice. `npm audit fix` is available. See `technical/multer-dos-advisory` |

---

## File Format

Every `acceptance.md` follows this structure:

```
# [Ticket]: [Role] — [Module Name]

| Field | Value |
|-------|-------|
| Jira  | ...   |
| ...   | ...   |

---

## Acceptance Criteria

### [Section]

| # | Criteria | Status | Notes |
|---|---------|--------|-------|

---

## Summary: X PASS, Y PARTIAL, Z FAIL
```
