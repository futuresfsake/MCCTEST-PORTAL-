# Trainee Profile Page (View and Edit)

| Field | Value |
|-------|-------|
| **Jira** | MP-41 |
| **Type** | Feature |
| **Status** | NOT STARTED |
| **Priority** | Medium |
| **Assignee** | Vince Jon Gonzalez |
| **Related** | `to-be-discussed.md` item 1 (photo storage), SEC-02 (`multer` advisory) |
| **Planned route** | `/trainee/profile` |
| **Updated** | 2026-11-04 (photo storage added) |

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
| 1 | A logged-in trainee opening the profile sees account, personal, contact/address and background information | NOT STARTED | |
| 2 | A non-trainee or logged-out user opening `/trainee/profile` is redirected like other protected routes | NOT STARTED | |
| 3 | In edit mode only photo, contact number and address are editable. Other fields are read-only with the registrar note | NOT STARTED | |
| 4 | Changing contact number and address and saving persists after a refresh | NOT STARTED | |
| 5 | A request that tries to change a read-only field (name, date of birth) is rejected or ignored and the value does not change | NOT STARTED | |
| 6 | An invalid contact number or a missing address field shows a validation error and nothing is saved | NOT STARTED | |
| 7 | Uploading a JPG or PNG under the limit updates the photo, including in the header | NOT STARTED | |
| 8 | An invalid file type or a file over the limit shows an error and the photo does not change | NOT STARTED | |
| 9 | Changing the password with the correct current password works, and the new password logs in | NOT STARTED | |
| 10 | A wrong current password is rejected with an error | NOT STARTED | |
| 11 | A trainee can only view and update their own profile. No endpoint changes another user's data | NOT STARTED | |
| 12 | No API response includes `password_hash` | NOT STARTED | |
| 13 | Cancel discards unsaved changes | NOT STARTED | |
| 14 | The page is responsive on mobile, tablet and desktop | NOT STARTED | |
| 15 | Backend and frontend lint and build pass with no new errors | NOT STARTED | |
| 16 | The photo file is stored in object storage, and only its path or URL is saved in `users.avatar_url` | NOT STARTED | |
| 17 | Replacing the photo removes the old file from storage | NOT STARTED | |
| 18 | Any logged-in user (every role) can see a trainee's photo | NOT STARTED | Decided 2026-11-04 |
| 19 | The email is shown read-only. A request that tries to change it is rejected or ignored | NOT STARTED | Credentials are fixed except the password |

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

## Summary: 0/19 PASS, NOT STARTED
