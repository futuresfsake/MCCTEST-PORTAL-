# Trainee — Dashboard (MP-30)

| Field | Value |
|-------|-------|
| **Jira** | MP-30 |
| **Status** | In Review |
| **Branch** | `feature/MP-30-trainee-dashboard` |
| **Route** | `/trainee/dashboard` |
| **Backend** | `GET /api/trainee/dashboard` |
| **Sprint** | MP Sprint 3 |

---

## Acceptance Criteria

### Authentication & Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-01 | Only TRAINEE role can access — all others redirected to `/403` | PASS | Frontend: ProtectedRoute `allowedRoles={['TRAINEE']}`. Backend: `@Roles(Role.TRAINEE)`. Tested: Admin → 403, Registrar → 403 |
| AC-02 | JWT guard + RolesGuard enforced on all endpoints | PASS | `@UseGuards(JwtAuthGuard, RolesGuard)` on controller class. No token → 401 |
| AC-03 | Trainee can only see their own data — no cross-trainee access | PASS | `@CurrentUser()` extracts user.id from JWT. Two trainees return different enrollment sets |
| AC-04 | All endpoints scoped to trainee_id from JWT — no query param override | PASS | Controller accepts no `@Query()` or `@Body()`. `?trainee_id=fake` → returns own data |

### Frontend — Enrollment & Batch Info

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-05 | Dashboard shows enrollment: program name, batch name, batch status, start/end date, trainer | PASS | EnrollmentCard renders all fields |
| AC-06 | Enrollment status chip: PENDING/ENROLLED/WITHDRAWN/COMPLETED/DROPPED with distinct colors | PASS | DashboardChips defines all 5 statuses |
| AC-07 | No active enrollment → friendly empty state | PASS | EmptyState with descriptive message |
| AC-08 | ID card number displayed read-only if generated | PASS | Monospace rendering, "Not yet generated" fallback |
| AC-09 | Batch schedule (days + time) from program schedule | PASS | Schedule list with scheduleName, days, time range |

### Frontend — Attendance Summary

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-10 | Attendance counts per status: PRESENT/ABSENT/LATE/EXCUSED | PASS | 4-column grid with status cards |
| AC-11 | Attendance percentage computed and displayed | PASS | Server-side: `(PRESENT / total) * 100`, "—" when null |
| AC-12 | Recent records: session date, topics covered, status, remarks | PASS | Table with formatted dates and status chips |
| AC-13 | Empty state when no attendance records | PASS | EmptyState rendered when `recent.length === 0` |

### Frontend — Competency Outcomes

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-14 | Competency outcomes section shows all learning outcomes | PASS | Iterates groups → competencies → outcomes |
| AC-15 | Each outcome: competency title, description, status chip | PASS | OutcomeStatusChip with PENDING/PASSED/FAILED/NOT_YET_ASSESSED |
| AC-16 | Grouped by category: BASIC/COMMON/CORE | PASS | Backend CATEGORY_ORDER enforced |
| AC-17 | Empty state when no outcomes assessed | PASS | Distinct messages for "unassessed" vs "no outcomes" |

### Frontend — Upcoming Sessions

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-18 | Session list: session date, topics covered, `session_date >= today` | PASS | Backend filters by `startOfToday()` |
| AC-19 | Limited to next 5 upcoming sessions | PASS | `UPCOMING_SESSION_LIMIT = 5` |
| AC-20 | Empty state when no upcoming sessions | PASS | EmptyState rendered |

### Frontend — Announcements

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-21 | Fetches GLOBAL + PROGRAM (match) + BATCH (match) | PASS | Backend OR query; frontend filters by selected enrollment |
| AC-22 | Posted-by name shown regardless of poster role | PASS | `fullName()` resolves from users table |
| AC-23 | Sorted by posted_at DESC | PASS | Backend `orderBy: { posted_at: 'desc' }` |
| AC-24 | Scope chip: GLOBAL (purple) / PROGRAM (green) / BATCH (blue) | PASS | DashboardChips SCOPE definitions |
| AC-25 | Empty state when no announcements | PASS | EmptyState rendered |

### Backend

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| AC-26 | GET /trainee/dashboard returns full payload | PASS | Matches TraineeDashboardPayload interface |
| AC-27 | Announcements: single query with OR scopes | PASS | `Prisma.announcementsWhereInput[]` with OR |
| AC-28 | posted_by resolves full name from users table | PASS | Includes users with name fields + role |
| AC-29 | Attendance percentage computed server-side | PASS | `Math.round((PRESENT / total) * 10000) / 100` |
| AC-30 | Upcoming sessions: `>= today`, limit 5, ASC | PASS | `startOfToday()`, take 5, orderBy ASC |
| AC-31 | No enrollment → valid 200, not 404 | PASS | Returns `{ defaultEnrollmentId: null, enrollments: [] }` |
| AC-32 | No endpoint accepts trainee_id param — always JWT | PASS | No `@Query()` or `@Body()` on controller |
| AC-33 | No raw Prisma error or stack trace exposed | PASS | try/catch → `InternalServerErrorException` with generic message |

---

## API Test Log

| Test | Endpoint | Expected | Actual | Status |
|------|----------|----------|--------|--------|
| No auth token | `GET /trainee/dashboard` | 401 | 401 | PASS |
| Admin role | `GET /trainee/dashboard` | 403 | 403 | PASS |
| Registrar role | `GET /trainee/dashboard` | 403 | 403 | PASS |
| Trainee (1 enrollment) | `GET /trainee/dashboard` | 200 + payload | 200 — 1 enrollment, 7 announcements | PASS |
| Trainee (2 enrollments) | `GET /trainee/dashboard` | 200 + both | 200 — 2 enrollments, 7 announcements | PASS |
| Query param ignored | `GET /trainee/dashboard?trainee_id=fake` | 200, own data | 200, own data | PASS |

## Build Verification

| Check | Status |
|-------|--------|
| Backend `tsc --noEmit` | PASS — 0 errors |
| Frontend `tsc --noEmit` | PASS — 0 errors |
| Frontend `vite build` | PASS — 2037 modules, 680ms |
| Backend server (port 3000) | PASS |
| Frontend dev server (port 5173) | PASS |

## Cannot Verify (Require Browser)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| CV-01 | Trainee login redirects to `/trainee/dashboard` | CANNOT VERIFY | AuthContext redirect logic — code review confirms implementation |
| CV-02 | Multiple-enrollment ProgramSelector visual switching | CANNOT VERIFY | ProgramSelector renders radio buttons with onSelect — code review confirms |

---

## Known Gap: three sections cannot show real data

The Attendance Summary, Competency Outcomes and Upcoming Sessions sections pass their criteria
because they load and show the correct empty state. In practice they are always empty: the dev
database has 0 training sessions, 0 attendance records, 0 competencies, 0 learning outcomes and
0 outcome statuses, and nothing in the app can create them (the trainer Attendance, Progress and
Grades & Competencies pages are not started). The program's recurring schedule does display on the
enrollment card, but Upcoming Sessions reads dated sessions and is not generated from it.

Tracked in `backlogs/trainee/dashboard-data-gaps/acceptance.md`.

---

## Summary: 30/30 PASS — 2 require browser testing

## Staging audit (2026-11-03)

Ran on `staging` at `ed5ccaf` (PR #49, `dev` into `staging`) before merging to `main`. `staging` has the same content as `dev`. No logins were available, so there was still no browser walkthrough.

| Check | Result |
|-------|--------|
| Backend tests, ESLint, `tsc`, `nest build` | 7 suites, 35 tests pass (includes the SEC-01 regression test). All exit 0 |
| Frontend ESLint, `tsc`, `vite build` | All pass |
| Dependency audit (production) | Backend 0 critical, 2 high (`multer`, logged as SEC-02, a fix is available but deferred). Frontend 0 |
| Secrets (tracked files and history), tracked env files | None found. Only `USER:PASSWORD` placeholders in the Prisma tooling docs |
| Role guards | Every controller guarded, except the chatbot, which stays public for the landing page and is limited to 10 requests per minute |
| Debug logging, AI mentions | Only the database connection message remains. No AI mentions in source or in the commits ahead of `main` |
| SEC-01 on `staging` | `POSTER_SELECT` is in place and the regression test passes |
| Merge into `main` | 11 commits ahead, 0 behind, no conflicts |

### Still not verified
- Browser walkthrough of the trainee dashboard, announcements page and header bell (the two AC items marked as needing a browser).
- The announcements bell for Admin, Registrar, Trainer and Encoder does not exist yet (MP-52).

### Follow-ups
- SEC-01 is fixed in code but needs the backend restarted on every environment, and the passwords reset for any staff who posted announcements before the fix.
- SEC-02: `multer` advisory is logged and deferred. `npm audit fix` is available.
- Open gaps from earlier audits are unchanged (MP-33 has 7 failing criteria, MP-24 gaps).

