# Trainer — Trainee Information (View, own batches only)

| Field | Value |
|-------|-------|
| **Jira** | MP-50 (Trainer), MP-51 (Encoder); extends MP-24 |
| **Type** | Feature |
| **Status** | In Review (verified against dev data and role tests; browser walkthrough pending) |
| **Route** | `/trainer/trainees`, `/trainer/trainees/:id` |
| **API** | `GET /api/trainer/trainees`, `/filter-options`, `/:id` |
| **Shared with** | Admin and Registrar (`backlogs/admin/trainee-information/acceptance.md`, `backlogs/registrar/trainee-information/acceptance.md`) |

Status key: PASS = verified (see Audit); IMPLEMENTED = built, compiles, not yet exercised; PENDING = not yet verified.

---

## Acceptance Criteria Per User Role

### Admin

| # | Criteria | Status |
|---|---------|--------|
| A1 | Sees all trainees, regardless of batch or trainer | PASS (MP-24) |
| A2 | Search, filter, sort, paginate, and open any trainee profile | PASS (MP-24) |
| A3 | View-only (no edit actions) | PASS (MP-24) |
| A4 | Sidebar: Management → Trainees (`/admin/trainees`) | PASS (MP-24) |

### Registrar

| # | Criteria | Status |
|---|---------|--------|
| R1 | Sees all trainees, regardless of batch or trainer | PASS (MP-24) |
| R2 | Search, filter, sort, paginate, and open any trainee profile | PASS (MP-24) |
| R3 | View-only (no edit actions) | PASS (MP-24) |
| R4 | Sidebar: Records → Trainees (`/registrar/trainees`) | PASS (MP-24) |

### Trainer

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| T1 | Sidebar: Records → Trainees opens `/trainer/trainees` | IMPLEMENTED | Sidebar.tsx, AppRouter.tsx |
| T2 | The list shows only trainees enrolled in a batch assigned to the logged-in trainer | PASS | Verified on dev data: scoped total equals an independent count of the trainer's own trainees |
| T3 | A trainee enrolled only in another trainer's batch never appears in the list, search results, or total count | PASS | Verified: a trainer with no batches sees 0 of the 11 trainees, and search by a real trainee name returns 0 |
| T4 | The enrollment shown in each row, and the "other enrollments" count, include only this trainer's batches | PASS | Verified: every listed enrollment belongs to the trainer's own batches |
| T5 | Filter dropdowns offer only this trainer's batches and the programs of those batches | PASS | Verified: filter options hold exactly the trainer's 7 batches; an outsider trainer gets 0 batches and 0 programs |
| T6 | Search, filters, sorting, and pagination work as for Admin and Registrar, within the trainer's scope | PENDING | Same shared code as Admin and Registrar; not exercised in the browser |
| T7 | Opening a trainee in the trainer's batches shows the full profile; only enrollments in the trainer's batches are listed | PASS | Verified: only own enrollments, empty insurance list |
| T8 | Opening a trainee who is not in any of the trainer's batches returns 404, not 403, so existence isn't revealed | PASS | Verified: an outsider trainer opening a real trainee profile gets 404 |
| T9 | View-only (`canEdit: false`) | IMPLEMENTED | `TRAINEE_INFORMATION_ACCESS.trainer` |
| T10 | A trainer with no batches sees an empty list, not an error | PASS | Verified: trainer with no batches gets an empty list |
| T11 | Filter panel is closed by default and opens when Filter is clicked | IMPLEMENTED | Shared `TraineeListView` |
| T12 | Trainer has no Insurance filter (hidden in the panel, no chip, and the API ignores an `insurance` parameter) | IMPLEMENTED | `showInsurance` prop; trainer controller clears `insurance` |
| T13 | The Program filter lists only programs of batches assigned to the trainer | PASS | Verified with T5; unit test covers the scoped queries |
| T14 | Trainer sees no insurance data: no "Insured" tag and no Insurance Coverage section on the profile, and the profile API returns an empty insurance list | IMPLEMENTED | `showInsurance` in `TraineeProfileView`; service returns `[]` when scoped |

### Encoder (MP-51)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| E1 | Sidebar: Records → Trainees opens `/encoder/trainees` | IMPLEMENTED | Sidebar.tsx, AppRouter.tsx; not yet verified in the app |
| E2 | Sees all trainees (no scope), with search, filters, sorting and pagination as Registrar | IMPLEMENTED | Built; not yet verified in the app |
| E3 | Full profile with one card per enrollment | IMPLEMENTED | Built; not yet verified in the app |
| E4 | View-only (no edit actions, no update endpoint) | IMPLEMENTED | Built; not yet verified in the app |
| E5 | Admin, Registrar, Trainer and Trainee get 403 on `/encoder/trainees` | PASS | Role test: Admin, Registrar, Trainer and Trainee are rejected on all 3 encoder handlers |

### Trainee

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| TR1 | No access to any trainee-information route or endpoint (403 on API, redirected on UI) | PASS | Role test (API); `ProtectedRoute` (UI, not exercised) |

---

## Access Control (cross-role)

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| X1 | Trainer cannot call `/admin/trainees` or `/registrar/trainees` (403) | PASS | Role test across all 5 roles |
| X2 | Admin, Registrar and Encoder cannot call `/trainer/trainees` (403) | PASS | Role test across all 5 roles |
| X3 | The trainer's scope comes from the JWT user, never from a request parameter | IMPLEMENTED | `req.user.id` |
| X4 | No `password_hash` or auth state in responses | PASS | Explicit select (shared) |

---

## Open Questions

| # | Question |
|---|----------|
| Q1 | Should a trainer see the full personal profile (address, parents, beneficiary, insurance), or a reduced one? Currently the full profile is shown, same as Admin and Registrar. |
| Q2 | There is an existing "Trainee Records" sidebar item (`/trainer/records`) that has no page yet. Keep it separate, or merge it with Trainees? |
| Q3 | Should trainees from completed or closed batches stay visible to the trainer? Currently yes (all batches ever assigned). |

---

## Test Cases

### TC-01: Trainer sees only own trainees
- **AC:** T2, T3
- **Precondition:** Trainer A has Batch 1 with trainees X and Y. Trainer B has Batch 2 with trainee Z.
- **Steps:** Log in as Trainer A → Records → Trainees.
- **Expected:** X and Y appear; Z does not. Total is 2.

### TC-02: Search cannot reach other trainers' trainees
- **AC:** T3
- **Steps:** As Trainer A, search for Z's name, email, and ID card number.
- **Expected:** No results.

### TC-03: Profile of another trainer's trainee
- **AC:** T8
- **Steps:** As Trainer A, call `GET /api/trainer/trainees/<Z id>` or open `/trainer/trainees/<Z id>`.
- **Expected:** 404.

### TC-04: Trainee with enrollments under two trainers
- **AC:** T4, T7
- **Precondition:** Trainee X is also enrolled in Trainer B's Batch 2.
- **Steps:** As Trainer A, open the list and X's profile.
- **Expected:** The row and profile show only the Batch 1 enrollment; "other enrollments" is 0.

### TC-05: Filter options are scoped
- **AC:** T5
- **Steps:** As Trainer A, open the Filter panel.
- **Expected:** Batch dropdown lists only Batch 1 (and other Trainer A batches).

### TC-06: Role enforcement
- **AC:** X1, X2, E5, TR1
- **Steps:** Call `GET /api/trainer/trainees` with Admin, Registrar, Encoder, and Trainee JWTs; call `/api/admin/trainees` with a Trainer JWT.
- **Expected:** 403 for every call.

### TC-07: Trainer with no batches
- **AC:** T10
- **Expected:** Empty list with the normal empty state.

---

## Audit (2026-11-03)

Ran before pushing to `dev`. No logins were available, so the page walkthrough per role was not done in a browser.

| Check | Result |
|-------|--------|
| Backend unit tests | 30 / 30 pass (5 suites), including role access and scoped queries |
| Role access test (`trainee-information.access.spec.ts`) | All 5 roles against all 3 handlers of the admin, registrar, trainer and encoder controllers: only the matching role is allowed, every other role gets 403 (12 checks) |
| Backend lint and build | 0 problems, build succeeds |
| Frontend lint and `vite build` | Build succeeds. 1 lint and `tsc` error in `PaymentListPage.tsx` (`methodIcons` unused), which is not part of this change |
| Trainer scope on dev data (read-only queries) | 11 trainees, 2 trainers, 1 with batches. Scoped list total, listed enrollments, filter options, profile and empty-list cases all pass |
| Outsider trainer on dev data | Cannot see, search or open any trainee: profile returns 404, search returns 0, filter options are empty |
| Unscoped roles (Admin, Registrar, Encoder) | List returns all 11 trainees and the profile still includes insurance |

### Not verified
- Browser walkthrough of the four roles (no logins available). Includes the Filter-closed default, the hidden insurance filter and section for the trainer, sidebar items, and route protection in the UI.
- Two trainers with overlapping batches (the dev data has no second trainer with batches). Exclusion is proven only through the trainer with no batches.
- Encoder page behavior (shares the registrar code path; role access is tested, the page is not).

## Staging audit (2026-11-03)

Ran on `staging` at `451507c` (PR #42) before merging to `main`. `staging` has the same content as `dev`. No logins were available, so there was still no browser walkthrough.

| Check | Result |
|-------|--------|
| Backend tests, ESLint, `tsc`, build | 6 suites, 32 tests pass. All exit 0 |
| Frontend ESLint, `tsc`, `vite build` | All pass. The earlier `methodIcons` error is fixed |
| Dependency audit (production) | Backend 0 critical, 2 high (`multer`, uploads unused, no fix available yet). Frontend 0 |
| Secrets, tracked env files, `password_hash` in responses | None found |
| Role guards | Every controller guarded. The chatbot stays public for the landing page and is limited to 10 requests per minute. `/sessions/expires` is admin only |
| Debug logging, AI mentions | Only the database connection message remains. No AI mentions in source, backlogs or the new commits |
| Merge into `main` | 6 commits ahead, 0 behind, no conflicts |

### MP-24 shared module (Admin and Registrar), run on dev data

The Admin and Registrar pages share one service, so this covers both. 33 of 33 read-only checks pass:
- Search by partial first name (any case), full name in reverse order, contact number, ID card number, blank search, and a SQL-looking string (harmless). Email search was not exercised.
- Filters: program, batch, every enrollment status, every batch status, gender, program type, insurance (Active plus None cover all 11 trainees), requirements, a date range, and filters combined with search.
- Default sort newest first, name sort both ways, and pages that neither overlap nor skip.
- Profile has every section and one card per enrollment. An unknown id returns 404. No password, hash or token appears.

Gaps that remain in the committed code (unchanged from MP-24):
- Default page size is 10, the ticket asked for 20.
- Enrollment status and batch status are single-select.
- The insurance filter has no "Expired" option.
- No First and Last pagination buttons, and no mobile card layout.
- A date range with an end date before the start date is not rejected with a 400.

### Still not verified
- Browser walkthrough of all five roles.
- Two trainers with overlapping batches (the dev data has one trainer with batches).
