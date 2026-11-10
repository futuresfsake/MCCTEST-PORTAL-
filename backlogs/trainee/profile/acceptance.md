# Trainee Profile Page (View and Edit)

| Field | Value |
|-------|-------|
| **Jira** | MP-41 |
| **Type** | Feature |
| **Status** | MERGED INTO `dev` (PR #95, 2026-11-10). Audited 2026-11-06 and re-checked 2026-11-10, see `audit-dod.md`. Not yet in `staging` or `main` |
| **Priority** | Medium |
| **Assignee** | Vince Jon Gonzalez |
| **Related** | `to-be-discussed.md` item 1 (photo storage), SEC-02 (`multer` advisory) |
| **Planned route** | `/trainee/profile` |
| **Updated** | 2026-11-06 (Definition of Done audit) |
| **Checked by** | Chelsea Cllj, 2026-11-06. Ran the branch locally with the `sharp` fix. The password change confirmed working. The profile view and the editable fields (criteria 1 and 3) checked in a browser |

---

## User Story

**As a** trainee,
**I want** a profile page where I can see my personal information and update my contact details and profile photo,
**so that** my information stays current without going to the registrar's office for small changes.

## Background

- The profile is created by the registrar at enrollment: the `users` row (name, system ID, email, avatar) and the `trainee` row (contact number, address, birth date, gender, parents' names, civil status, education, employment).
- `GET /api/auth/me` already returns the logged-in user's data.
- There is no trainee profile page and no endpoint for a trainee to update their own information.
- Some fields are official enrollment records and stay under the registrar's control.

## Field Rules

| Field | Trainee can edit? |
|-------|-------------------|
| Profile photo (`avatar_url`) | Yes |
| Contact number | Yes |
| Address (street, barangay, municipality, district, province) | Yes |
| Email | No (login credentials are fixed, see decisions below) |
| Password | Yes (requires current password) |
| First / middle / last name | No (registrar only) |
| System ID | No |
| Date of birth, place of birth | No (registrar only) |
| Gender, citizenship, civil status | No (registrar only) |
| Mother's / father's name | No (registrar only) |
| Highest education, employment status/type, PWD | No (registrar only) |

## Scope

### Backend

- `PATCH /api/trainee/profile`, `TRAINEE` role only, updates only the logged-in trainee (from the JWT).
- A DTO that accepts only the editable fields. Other fields are rejected or ignored (`whitelist` / `forbidNonWhitelisted`).
- Validation: contact number format and length (max 15), address fields required and within column limits.
- Change password: `PATCH /api/trainee/profile/password`, requires the current password, enforces the password rules, stores a new hash.
- Responses never include `password_hash`.

### Profile photo storage

- Photos are files and go to object storage, not a second database. The database keeps only the path or URL.
- A `trainee-photos` bucket in the existing Supabase project. The path or URL is saved in `users.avatar_url`. No schema change expected.
- The upload goes through the NestJS backend. It checks the role, file type (JPG or PNG) and size (for example 2 MB), resizes the image (for example 400x400), stores it, and saves the path.
- Replacing a photo deletes or overwrites the old file.
- **Decided 2026-11-04:** the photo can be seen by everyone who is logged in (all roles).
- **Decided 2026-11-04:** login credentials are fixed. The trainee can change only the password, so the email is read-only.
- **Open gap:** private bucket with signed URLs, or public bucket. Decide before building (see `backlogs/to-be-discussed.md`).
- **Open gap:** whether the photo appears on the ID card or the registrar's enrollment view.
- Fix the `multer` advisory (SEC-02) before adding this upload route.

### Frontend

- Route `/trainee/profile`, protected for `TRAINEE`, reachable from the header or user menu.
- View mode: sections Account, Personal Information, Contact and Address, Background.
- Edit mode: only editable fields become inputs. Read-only fields are greyed out with a note "Contact the registrar to change this information."
- Photo upload with preview. The new photo appears in the header after saving.
- Change password form: current, new, confirm.
- Success and error messages. Cancel discards unsaved changes.

## Out of Scope

- Trainees requesting changes to registrar-controlled fields (possible follow-up: a "profile change request" sent to the registrar).
- Profile pages for other roles.
- Account deletion.

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | A logged-in trainee opening the profile sees account, personal, contact/address and background information | PASS | The API returns all four groups and the page shows the sections. Checked in a browser by Chelsea Cllj, 2026-11-06 |
| 2 | A non-trainee or logged-out user opening `/trainee/profile` is redirected like other protected routes | PASS | Route is TRAINEE only. API: 401 with no token, 403 for admin, registrar, trainer and encoder |
| 3 | In edit mode only photo, contact number and address are editable. Other fields are read-only with the registrar note | PASS | Code reading: only photo, contact and address are inputs. Checked in a browser by Chelsea Cllj, 2026-11-06 |
| 4 | Changing contact number and address and saving persists after a refresh | PASS | Saved, read back and found in the database |
| 5 | A request that tries to change a read-only field (name, date of birth) is rejected or ignored and the value does not change | PASS | A request with 13 forbidden fields changed none of them |
| 6 | An invalid contact number or a missing address field shows a validation error and nothing is saved | PASS | 8 invalid requests gave 400 and nothing was saved |
| 7 | Uploading a JPG or PNG under the limit updates the photo, including in the header | PARTIAL | A real upload works on the real project (one photo, link opens). Not run from the page, header update not seen |
| 8 | An invalid file type or a file over the limit shows an error and the photo does not change | PARTIAL | No file, text file, GIF and 3 MB image give 400. A fake image gives 500 (audit F-2) |
| 9 | Changing the password with the correct current password works, and the new password logs in | PASS | Works and the new password logs in. Owner confirmed |
| 10 | A wrong current password is rejected with an error | PASS | Refused, password unchanged |
| 11 | A trainee can only view and update their own profile. No endpoint changes another user's data | PASS | No id in the routes. Another trainee's id in the body is ignored |
| 12 | No API response includes `password_hash` | PASS | No password or hash in any response or in the backend log |
| 13 | Cancel discards unsaved changes | PARTIAL | Code reading: the cancel handler resets fields, photo and preview. Not seen |
| 14 | The page is responsive on mobile, tablet and desktop | PARTIAL | Only `sm:` breakpoints in the code. Not seen on a device |
| 15 | Backend and frontend lint and build pass with no new errors | PASS | The frontend passes. The backend needed `sharp` added to `package.json` (audit F-1). Fixed on the branch 2026-11-06 and checked from a clean install |
| 16 | The photo file is stored in object storage, and only its path or URL is saved in `users.avatar_url` | PASS | Proven on the real project: the file is in the bucket, only the link is in `users.avatar_url` |
| 17 | Replacing the photo removes the old file from storage | PARTIAL | Code removes the old file after saving the new one. Not run on real storage. A failed removal gives a 500 (audit F-3) |
| 18 | Any logged-in user (every role) can see a trainee's photo | PARTIAL | The bucket is public, so every role can see it, but so can anyone with the link (audit F-8). Decision needed. Decided 2026-11-04 |
| 19 | The email is shown read-only. A request that tries to change it is rejected or ignored | PASS | `email` in the body left the stored email unchanged. Credentials are fixed except the password |

---

## Test Cases

### TC-01: View profile
- **Steps:** Log in as a trainee and open `/trainee/profile`.
- **Expected:** All four sections show the trainee's own data.

### TC-02: Edit contact and address
- **Steps:** Edit contact number and address, save, refresh.
- **Expected:** Changes persist.

### TC-03: Read-only field by API
- **Steps:** Send `PATCH /api/trainee/profile` with a changed `first_name`, `birth_date` and `email`.
- **Expected:** Rejected or ignored. Values unchanged.

### TC-04: Validation
- **Steps:** Enter a 20-digit contact number, then empty the address field.
- **Expected:** Validation errors. Nothing saved.

### TC-05: Photo upload
- **Steps:** Upload a 1 MB PNG, then a 5 MB PNG, then a PDF.
- **Expected:** First succeeds and the header photo updates. The other two show an error and the photo stays.

### TC-06: Photo replace
- **Steps:** Upload a second photo.
- **Expected:** The old file is gone from storage. `avatar_url` points to the new file.

### TC-07: Password
- **Steps:** Change with the wrong current password, then the correct one.
- **Expected:** First rejected. Second works, and the new password logs in.

### TC-08: Other roles and other users
- **Steps:** Open the route as admin. Call the endpoint with another trainee's id.
- **Expected:** Redirected / 403. Only the JWT's own record is ever changed.

---

### Test case results (2026-11-06)

| TC | Result | Evidence |
|----|--------|----------|
| TC-01 View profile | PASS | API data complete. Page checked in a browser by Chelsea Cllj, 2026-11-06 |
| TC-02 Edit contact and address | PASS | Saved, read back and found in the database |
| TC-03 Read-only field by API | PASS | Nothing read-only changed |
| TC-04 Validation | PASS | 16 characters and an empty street give 400, nothing saved |
| TC-05 Photo upload | PARTIAL | A 3 MB image and a text file refused. A valid upload from the page not run. The real project holds one working upload |
| TC-06 Photo replace | NOT RUN | Needs a second write to the real bucket |
| TC-07 Password | PASS | Wrong refused, correct works, new password logs in |
| TC-08 Other roles and other users | PASS | 403 for the four other roles. Another trainee's id ignored |

Totals: 6 PASS, 1 PARTIAL, 1 NOT RUN. That is 8.

## Summary: 13 PASS, 6 PARTIAL, 0 NOT MET (19). Audited 2026-11-06 (`audit-dod.md`)
