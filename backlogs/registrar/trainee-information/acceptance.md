# MP-24: Registrar — Trainee Information (View)

| Field | Value |
|-------|-------|
| **Jira** | MP-24 |
| **Type** | Feature |
| **Status** | Done |
| **Assignee** | Aubrien Fuentes |
| **Sprint** | MP Sprint 3 |
| **Merged** | 2026-10-20 (PR #18) |
| **Route** | `/registrar/trainees` |
| **Shared with** | Admin (`backlogs/admin/trainee-information/acceptance.md`) |

---

## Acceptance Criteria

### Pages and Reuse

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Registrar → Trainee Records opens the Student Information module at `/registrar/trainees` | PASS | Route with ProtectedRoute |
| 2 | Uses the same shared backend service and frontend components as Admin | PASS | Shared TraineeInformationService |
| 3 | View-only for Registrar (canEdit: false, no edit planned for Registrar) | PASS | No edit actions |

### Search, Filters, Sorting, Pagination

> Same shared implementation as Admin — see `backlogs/admin/trainee-information/acceptance.md` for full criteria (AC 4–14). All criteria apply identically for the Registrar view.

### Profile

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 19 | Profile shows personal details, address, family, education, beneficiary, insurance | PASS | Same TraineeProfileView |
| 20 | One card per enrollment with all fields | PASS | Shared EnrollmentCard |

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 26 | Registrar can't use admin endpoints | PASS | @Roles(Role.REGISTRAR) on registrar controller |
| 27 | Other roles get 403 | PASS | Role guards enforce ADMIN/REGISTRAR only |
| 28 | No password_hash in responses | PASS | Explicit select |

---

## Known Gaps (not in the Jira ticket)

| # | Gap | Severity | Detail | Suggested fix |
|---|-----|----------|--------|---------------|
| G1 | Search columns lack trigram indexes | Medium | Search runs `ILIKE '%term%'` on `users.email`, `users.system_id`, `enrollments.id_card_number` and `official_receipts.or_number`. MP-24 lists these as "already indexed (no change)", but a B-tree index cannot serve a leading-wildcard search, so they fall back to sequential scans on large tables. The migration `20261019_trainee_information_indexes` only adds trigram indexes for first name, last name and contact number. | New indexes-only migration adding `gin_trgm_ops` indexes on the four columns, or limit those fields to prefix/exact matching. Correct the "already indexed" note in MP-24. |

---

## Test Cases

### TC-01: Registrar opens trainee records
- **AC:** #1
- **Priority:** Critical
- **Precondition:** Logged in as registrar
- **Steps:**
  1. Click "Trainee Records" in sidebar
- **Expected:** Navigates to `/registrar/trainees`; trainee list loads

### TC-02: Shared components with admin
- **AC:** #2
- **Priority:** High
- **Precondition:** Logged in as registrar
- **Steps:**
  1. Navigate to `/registrar/trainees`
  2. Compare layout and components with admin's `/admin/trainees`
- **Expected:** Same TraineeInformationService, same shared FE components

### TC-03: View-only — no edit actions
- **AC:** #3
- **Priority:** Critical
- **Precondition:** Logged in as registrar, viewing a trainee profile
- **Steps:**
  1. Open a trainee profile
  2. Look for Edit buttons or update actions
- **Expected:** No Edit button visible; `canEdit: false` enforced

### TC-04: Profile shows all sections
- **AC:** #19
- **Priority:** High
- **Precondition:** Trainee with complete data exists
- **Steps:**
  1. Click on a trainee to open their profile
- **Expected:** Personal details, address, family, education, beneficiary, and insurance sections all displayed

### TC-05: Enrollment cards on profile
- **AC:** #20
- **Priority:** High
- **Precondition:** Trainee enrolled in 2+ programs
- **Steps:**
  1. Open the trainee's profile
- **Expected:** One enrollment card per program with batch, schedule, status, ID card, uniform, date, OR number

### TC-06: Registrar can't use admin endpoints
- **AC:** #26
- **Priority:** Critical
- **Precondition:** Logged in as registrar
- **Steps:**
  1. Call `GET /admin/trainees` via API with registrar JWT
- **Expected:** 403 Forbidden

### TC-07: Other roles get 403
- **AC:** #27
- **Priority:** Critical
- **Precondition:** Logged in as trainer
- **Steps:**
  1. Call `GET /registrar/trainees` via API with trainer JWT
- **Expected:** 403 Forbidden

### TC-08: No password_hash in responses
- **AC:** #28
- **Priority:** Critical
- **Precondition:** None
- **Steps:**
  1. Call `GET /registrar/trainees` and inspect response JSON
- **Expected:** No `password_hash` field in any trainee response

> For search, filter, sort, and pagination test cases, see `backlogs/admin/trainee-information/acceptance.md` — all apply identically.

---

## Summary: Same results as Admin view — 29 PASS, 4 PARTIAL, 0 FAIL
