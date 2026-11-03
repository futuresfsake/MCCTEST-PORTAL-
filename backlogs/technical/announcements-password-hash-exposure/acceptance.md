# SEC-01: Security — Announcements API exposed the poster's password hash

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Security (data exposure)                                                                |
| Severity    | **High**                                                                                |
| Discovered  | 2026-11-03, while checking what the trainee announcements bell and page receive          |
| Affected    | `GET /api/announcements`, `/active`, and the create and update responses                |
| Affects     | Every logged-in role (Admin, Registrar, Encoder, Trainer, Trainee)                      |
| Status      | **FIXED and on `dev` (PR #46). NOT yet on `staging` or `main`** |
| Assignee    | Chelsea Cllj                                                                            |

---

## Problem

The announcements service loaded the poster with `include: { users: true }` in four places
(`backend-nestjs/src/announcements/announcements.service.ts`). That returns the whole `users`
row, so every announcement sent to the browser carried its poster's:

- `password_hash` (a bcrypt hash)
- `email`
- `is_active`, `created_at`, `updated_at`, `middle_name`, and the other account fields

`GET /announcements/active` is open to all five roles, including trainees. So any logged-in
user could read the password hash of every admin, registrar, encoder or trainer who had posted
an announcement, in the browser's network tab.

The frontend only used the poster's `role`, `first_name` and `last_name`.

### How it was found

The extra poster fields were not noticed in earlier audits. It was caught while building the
trainee announcements page, by running the service against dev data and finding password-like
text in the response.

### Why the earlier audits missed it

Earlier audits recorded "no `password_hash` in responses: PASS". That check only searched the
code for where `password_hash` was selected. It did not look at what each endpoint actually
returns, and a whole-row `include` never mentions the field by name. The corrected check is
listed below.

---

## Fix

- `announcements.service.ts` now loads the poster through a `POSTER_SELECT` constant that
  allows only `id`, `first_name`, `middle_name`, `last_name`, `role`, `avatar_url` and
  `system_id`. All four queries use it.
- Regression test: `announcements.service.spec.ts` fails if the poster is ever loaded as a whole
  row, or if `password_hash` or `email` is selected, for the trainee, trainer and admin readers.

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | No announcement endpoint returns `password_hash` for the poster | PASS | Checked on dev data: poster keys are `id, first_name, middle_name, last_name, role, avatar_url, system_id` |
| 2 | No announcement endpoint returns the poster's `email` | PASS | Same check |
| 3 | The announcements pages still show the poster's name and role | PASS (code) | The frontend reads only `role`, `first_name`, `last_name`. Not exercised in a browser |
| 4 | A test fails if the whole user row is loaded again | PASS | `announcements.service.spec.ts`, 3 cases |
| 5 | Fix is on `main` | **NOT DONE** | Still only in the working tree on the MP-30 branch |
| 6 | Fix is on `staging` and `dev` | **NOT DONE** | |
| 7 | The running backend has the fix | **NOT DONE** | A running backend keeps the old code until it is rebuilt and restarted |
| 8 | Passwords of exposed accounts are rotated | **NOT DONE** | See follow-ups |

## Follow-ups

1. **Hotfix:** put the fix on its own branch from `main` so it can be merged ahead of MP-30,
   then sync `staging` and `dev`.
2. **Restart:** rebuild and restart every running backend (`staging`, `main` and any local one)
   after the merge.
3. **Rotate passwords:** every account that has posted an announcement had its hash readable by
   any logged-in user, so reset those passwords. Admin and registrar accounts first.
4. **Check the other roles' hashes:** hashes of trainees who never posted were not exposed by
   this bug.
5. **Add a response check to the audit:** when auditing, call each endpoint (or its service)
   against real data and search the response for `password`, `hash`, `token` and `email`. A
   code search alone is not enough.

## Other places checked

Every other place that reads the `users` table either selects specific fields or is an internal
check that never returns the row (login, the JWT strategy, username generation, uniqueness
checks). The trainee-information profile, the trainee dashboard, and the new announcements page
use explicit selects.

## Test Cases

### TC-01: Poster fields on a trainee's announcements
- **AC:** #1, #2
- **Precondition:** Logged in as a trainee. Announcements exist from an admin or registrar.
- **Steps:** Open the browser's network tab and load `/trainee/announcements`. Look at the
  response of `GET /api/announcements/active`.
- **Expected:** Each item's `users` object has only the name, role, avatar and system id.
  No `password_hash`, no `email`.

### TC-02: Poster name still shows
- **AC:** #3
- **Steps:** Open the announcements page as a trainee, and the dashboard widget as an admin.
- **Expected:** The poster's name and role badge are shown on each card.

### TC-03: Regression
- **AC:** #4
- **Steps:** Change `POSTER_SELECT` to `true` and run `npx jest src/announcements`.
- **Expected:** The test fails.
