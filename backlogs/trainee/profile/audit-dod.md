# Trainee Profile Page (MP-41): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-06 |
| **Audited** | Branch `feature/MP-41` at `0871d0c`: one commit by `choooolo` (Vince Jon Gonzalez), subject "MP-41", body "Up for review". Pushed to `origin`. No pull request. The audit ran on a clean checkout of that exact commit, with nothing uncommitted. The `sharp` fix (finding F-1) was applied on the branch afterwards and checked from a clean install (section 1) |
| **Checked by** | Chelsea Cllj (owner), 2026-11-06. The owner ran the branch locally with `sharp` installed and reported that it works, including the password change. The owner also checked the profile view and the edit-mode fields in a browser (criteria 1 and 3). The evidence behind each criterion is in section 4 |
| **Compared with** | `origin/dev` at `999ad78`. The branch is 1 commit ahead and 0 behind, so a merge into `dev` cannot conflict. 16 files changed, 778 lines added, 77 removed. 0 migrations. `package.json` and `package-lock.json` changed |
| **Jira status** | In Review, assigned to Vince Jon Gonzalez (checked 2026-11-06). The backlog file still says NOT STARTED, 0 of 19 |
| **How it was run** | A clean copy of the commit: `npm ci` in both projects, then lint, type-check, build and tests. The real backend started against a throwaway Postgres 17 built from all 13 migrations, with fake data, and 70 requests sent to it. The shared Supabase database and Storage were read with read-only requests only. The owner reported that the password change works |
| **Not audited** | The pages in a real browser by me (the owner checked the profile view and the edit-mode fields, criteria 1 and 3, in a browser). A photo upload from the page, including the new photo appearing in the header. Replacing a photo and the old file being removed from storage (both need a write to the real bucket). The layout on a phone and a tablet. Two sessions at once |
| **Definition of Done used** | The Jira "Definition of Done" (3 items) and its 19 Acceptance Criteria, plus the backlog `acceptance.md` (19 rows, identical to Jira's) and its test cases TC-01 to TC-08 |

## Verdict

**Ready to merge into `dev` now that the `sharp` line is on the branch (fixed 2026-11-06). Not ready for `main` yet.** The feature works, the database is untouched, and the owner has checked it.

1. **Fixed: the backend did not build on a clean install.** The profile code imports `sharp`, which was not declared in `package.json` or the lockfile, so `npm ci` then `nest build` failed with `Cannot find module 'sharp'`. The fix is now on the branch: `"sharp": "^0.35.5"` and the lockfile entries. A clean install then builds, lints and passes the 102 tests, and `sharp` resizes an image at runtime.
2. **Open bug (medium): an upload that is not really an image crashes with a 500.** The browser file type is trusted, then `sharp` throws on the bad bytes and nothing catches it. It should be a 400.
3. **Open bug (medium): a failed clean-up of the old photo reports an error after the new photo was saved.** The user sees a failure, the header does not update, and the old file stays behind.
4. **No tests and no backlog update.** The branch adds no unit tests, and the backlog file and push log still say NOT STARTED.
5. **Unrelated edits** are mixed in: loosened package pins, a type package that is not needed, a personal file name in `.gitignore`, and comments stripped from the shared `AuthContext`.
6. **Partly seen in a browser.** The owner checked the profile view, the editable fields (criteria 1 and 3) and the password change. The photo upload from the page, cancel, the phone and tablet layout and replacing a photo are not yet seen. The photo path is proven on the real project by one existing photo (section 3).

What is good: access control, the editable-field rules, validation, password change, the read-only fields and own-profile-only all behave as the ticket says (69 of 70 checks). The code is small and follows the project's folder layout. The Storage bucket matches what the code expects.

## 1. Engineering checks

As committed (clean `npm ci`, no fixes):

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `tsc --noEmit` | **FAIL**, 1 error: `Cannot find module 'sharp'` |
| 2 | Backend `nest build` | **FAIL**, the same error |
| 3 | Backend `eslint` (whole project, no fix) | 0 errors, 1 warning (`no-unsafe-argument`, a side effect of the missing `sharp` types) |
| 4 | Backend `jest` | PASS, 102 of 102 (12 suites). **None cover the new code** |
| 5 | `prisma validate` | PASS |
| 6 | `npm audit`, backend production | 0 vulnerabilities. The `multer` advisory (SEC-02) that Jira said to fix before the upload route is no longer reported |
| 7 | Frontend `tsc -b`, `eslint .`, `vite build` | PASS, 0 problems. Same chunk-size warning as before (existing) |
| 8 | `npm audit`, frontend | 10 moderate, existing |
| 9 | Frontend tests | The frontend has no test script |

With `sharp` installed without saving it: type-check 0 errors, build passes, `eslint` 0 problems (the warning disappears), 102 of 102 tests. So `sharp` is the only build problem.

After the fix (the two package files now on the branch, checked by deleting `node_modules` and running a clean `npm ci`): type-check 0 errors, `nest build` passes, `eslint` 0 problems, 102 of 102 tests, `prisma validate` passes, `npm audit` for production 0 vulnerabilities. `sharp` 0.35.5 resized a 900 by 600 PNG to a 400 by 400 JPEG with the same steps the profile code uses.

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 10 | Migrations added compared with `origin/dev` | PASS. 0. The branch has the same 13 migration folders as `dev` |
| 11 | Columns the code uses | PASS. `users.avatar_url`, `trainee.contact_number`, `street_address`, `barangay`, `municipality`, `district`, `province` all exist in the schema. No schema change needed, as the ticket expected |
| 12 | Supabase: `migrate status` | PASS. 13 migrations found, "Database schema is up to date" |
| 13 | Database from migrations compared with the schema | Only the existing trainee employment enum difference (TECH-03). Nothing on the tables MP-41 uses |
| 14 | Query counts | PASS. Reading the profile is 1 statement beyond the login check (4 against a baseline of 3). Saving is 3 (6 against 3). Fixed, no loops |
| 15 | Row level security on `users` and `trainee` | Off, the same as every other table (finding A-2, existing) |
| 16 | Data left behind by a removed feature | Nothing was removed |

## 3. Evidence from real use

Read-only requests against the real Supabase project:

| Check | Result |
|-------|--------|
| Bucket `trainee-photos` | Exists. Public. File size limit 2 MB (2,097,152 bytes). Allowed types `image/jpeg` and `image/png`. 0 policies, which is fine because the backend uploads with the service key |
| Objects in the bucket | 1 folder, named with a trainee's user id, holding one 17,164-byte `image/jpeg` file (the output of the 400 by 400 resize) |
| That trainee | A real test account whose `avatar_url` is set to that file |
| The saved link | Opens without logging in: HTTP 200, `image/jpeg`, 17,164 bytes. It points at this project's public bucket path |

So the whole photo path (resize, upload, save the link, load it in a browser) has worked at least once on the real project. Whether replacing a photo removes the old file was not exercised by me.

## 4. Acceptance Criteria

Numbered as in Jira (19). The backlog `acceptance.md` has the same 19 rows with the same numbers, so no mapping is needed. "Not seen" means checked by the API or by reading the code, but not in a browser.

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | A trainee opening the profile sees account, personal, contact/address and background information | PASS | The API returns all of it. The page shows the sections Account, Personal Information, Contact & Address, Background and Change password. Checked in a browser by the owner |
| 2 | A non-trainee or logged-out user is redirected | PASS | The route allows only TRAINEE. The API gives 401 with no token and 403 to admin, registrar, trainer and encoder on all four endpoints |
| 3 | In edit mode only photo, contact number and address are editable, the rest read-only with the registrar note | PASS | Code reading: only those inputs exist, the others use a grey read-only style and the page shows "Contact the registrar to change this information". Checked in a browser by the owner |
| 4 | Contact and address changes persist after a refresh | PASS | Saved (200), read back through the API, and present in the database |
| 5 | A request that tries to change a read-only field is rejected or ignored | PASS | A request carrying name, email, birth date, gender, parents, role, system ID and active flag changed none of them in the database |
| 6 | An invalid contact number or a missing address field shows an error and saves nothing | PASS | 8 bad requests gave 400 (letters, 16 characters, empty number, empty street, empty barangay, street over 100, missing province, wrong type). The data was unchanged afterwards |
| 7 | Uploading a JPG or PNG under the limit updates the photo, including in the header | PARTIAL | The real project holds a working upload (section 3). The page calls `updateUser` after saving, so the header should update. I did not run an upload from the page |
| 8 | An invalid file type or a file over the limit shows an error and the photo does not change | PARTIAL | No file, a text file, a GIF and a 3 MB image all gave 400 and left the photo unchanged. **A file that claims to be a PNG but is not an image gives a 500** (finding F-2) |
| 9 | Changing the password with the correct current password works and the new password logs in | PASS | 200, new password logs in, old one no longer works, stored as a hash. The owner also confirmed it works |
| 10 | A wrong current password is rejected | PASS | Refused, and the password stayed unchanged |
| 11 | A trainee can only view and update their own profile | PASS | There is no id in the routes. Sending another trainee's id in the body changed nothing. Trainee 2 sees only their own data |
| 12 | No response includes `password_hash` | PASS | No password or hash text in the profile, the edit result or the password result. The backend log has none either |
| 13 | Cancel discards unsaved changes | PARTIAL | Code reading: the cancel handler resets the fields, the photo and the preview. Not seen |
| 14 | The page is responsive on mobile, tablet and desktop | PARTIAL | The page uses only `sm:` breakpoints (two-column and three-column grids from the small size up). Not seen on a device |
| 15 | Backend and frontend lint and build pass with no new errors | PASS | The frontend passes. The backend built only after `sharp` was added (finding F-1), which is now fixed on the branch and checked from a clean install |
| 16 | The photo is stored in object storage and only its link is saved in `users.avatar_url` | PASS | Proven on the real project (section 3) |
| 17 | Replacing the photo removes the old file from storage | PARTIAL | Code reading: after the new file and link are saved, the old file is removed. If that removal fails the API reports a 500 (finding F-3). Not exercised on real storage |
| 18 | Any logged-in user (every role) can see a trainee's photo | PARTIAL | The bucket is public, so every role can. But public means anyone with the link, logged in or not, which is wider than the criterion (finding F-8) |
| 19 | The email is shown read-only and a request to change it is rejected or ignored | PASS | `email` sent in the body left the stored email unchanged |

Totals: **13 PASS, 6 PARTIAL (7, 8, 13, 14, 17, 18), 0 NOT MET.** That is 19. (Before the `sharp` fix and the owner's browser check it was 10 PASS, 8 PARTIAL, 1 NOT MET.)

### Test cases (backlog TC-01 to TC-08)

| TC | Status | Evidence |
|----|--------|----------|
| TC-01 View profile | PASS | API data complete. Page checked in a browser by the owner |
| TC-02 Edit contact and address | PASS | Saved, read back and found in the database |
| TC-03 Read-only field by API | PASS | Nothing read-only changed |
| TC-04 Validation (20 digits, empty address) | PASS | 16 characters and an empty street give 400. Nothing saved |
| TC-05 Photo upload (1 MB PNG, 5 MB PNG, PDF) | PARTIAL | A 3 MB image and a text file were refused. A valid upload to storage was not run by me. The real project holds one working upload |
| TC-06 Photo replace | NOT RUN | Needs a second write to the real bucket |
| TC-07 Password (wrong, then correct) | PASS | Wrong refused, correct works, the new password logs in |
| TC-08 Other roles and other users | PASS | 403 for the four other roles. Another trainee's id is ignored |

Totals: **6 PASS, 1 PARTIAL, 1 NOT RUN.** That is 8.

## 5. Security and integrity

| # | Check | Result |
|---|-------|--------|
| 1 | No token gives 401, every other role gives 403, on all four endpoints | PASS |
| 2 | The user comes from the token. Nothing in the body names another | PASS |
| 3 | Input validation | PASS. Contact number (characters, 15 maximum), address fields (required, 100 maximum), new password (8 to 128), file type and size. Unknown fields are dropped |
| 4 | Password stored as a hash, a new password equal to the old one refused | PASS |
| 5 | File type check | PARTIAL. The type is the one the browser declares. The content is only checked by `sharp`, which throws and gives a 500 (F-2) |
| 6 | Storage path | PASS. `<user id>/<timestamp>.jpg`, built by the server, so a user cannot choose it |
| 7 | Secrets or `.env` in the diff | PASS. None |
| 8 | Tokens, passwords or hashes in the backend log | PASS. None |
| 9 | Test accounts or fake data in the branch | PASS. None |
| 10 | Rate limit on the password change | The general limit of 120 a minute applies. Login has a stricter 15 a minute. A hijacked session could guess the current password faster than a login could (F-7) |
| 11 | Concurrency | Two uploads at the same time both succeed and the later one wins. The earlier file is removed by whichever finishes last. Low risk |

## 6. Folder structure

What the branch adds and where, compared with how the project already lays things out:

| Area | Where | Matches the project? |
|------|-------|----------------------|
| Backend feature folder | `src/users/trainee/profile/` with `profile.controller.ts`, `profile.service.ts` and `dto/` | Yes. The other trainee features sit in `src/users/trainee/dashboard/` and `withdrawal/`. The `dto/` subfolder matches |
| Backend wiring | `trainee.module.ts` now lists the profile controller and service and imports `PrismaModule` | Partly. `dashboard` and `withdrawal` each have their own module file. Profile is added straight into the shared one |
| Frontend page | `src/pages/users/trainee/profile/TraineeProfilePage.tsx` | Yes for the place and the name |
| Frontend page size | One file of 279 lines with 3 helper components inside | Partly. `dashboard` and `withdrawal` split their parts into a `components/` folder |
| API client | `src/api/users/trainee.api.ts` extended | Yes |
| Types | `src/types/trainee-profile.type.ts` | Yes. Next to `withdrawal.type.ts` and the others |
| Route and sidebar | `AppRouter.tsx` (TRAINEE only) and a "My Profile" sidebar link | Yes |
| Header | The avatar links to the profile (trainee only) | Yes. A second entry point beside the sidebar link |
| Shared code | `AuthContext.tsx` gains `updateUser`, `auth.api.ts` is touched | The addition is fine. The file was also reformatted and its comments removed (F-6) |
| Backlog docs | None changed | **No.** The profile backlog still says NOT STARTED, 0 of 19 |
| Tests | None added | **No** |

Suggested layout fixes, all small: give profile its own module file as the other trainee features have, and split the page into `components/` (photo, details form, password form). Neither blocks the merge.

## 7. Tests run (full inventory)

| Group | What | Result |
|-------|------|--------|
| Unit tests | The 102 existing tests. None for the profile controller, service or DTOs | 102 of 102 pass, 0 new |
| Engineering checks | Section 1, as committed, with `sharp` installed without saving, and after the fix from a clean install | As stated |
| API script, 70 checks (not in the repo) | Logins for 6 users, `/auth/me` for 5 roles, access control on every endpoint and role, view, edit and read-back in the database, 8 invalid edits, read-only fields, own profile only, the password cases (wrong, same, too short, missing, too long, correct) and a restore, 6 photo cases | **69 pass, 1 fails**: the fake image (F-2) |
| Query counts | Statement logging for read and save | Section 2 |
| Real Supabase, read-only | `migrate status`, the bucket settings, the bucket contents, the owner of the one object, the saved link opened without a login | Section 3 |
| Code reading | Every changed file: controller, service, DTOs, the page, `AuthContext`, `auth.api`, module, router, sidebar, `package.json` | Findings below |
| Manual use by the owner | The password change | Reported working. The rest of the page was not reported on |

### Where the test data lives and what was cleaned up

| Item | Where | Status |
|------|-------|--------|
| Throwaway database and its fake accounts | A Docker container on port 5441, shared with the MP-47 testing | Still running. Remove with `docker rm -f mp47_pg` |
| Backend started for this audit | Port 3300, from a scratch copy of the branch | Stopped at the end of the audit |
| Earlier sandbox servers for this branch | Ports 3200 and 5373 | Started earlier at the owner's request. Stop them when finished |
| Scratch copies of the code, the API script, helper scripts | The session's temporary folder, outside the repository | Never committed. They can be deleted |
| Anything in Supabase | Nothing written | Only read-only requests. The one photo in the bucket was uploaded by someone else, not by this audit |
| The 12 old test-looking trainee accounts on Supabase | Supabase | From earlier team testing (existing) |

## 8. Frontend and UX (code reading)

| # | Check | Result |
|---|-------|--------|
| 1 | Route is role-gated | PASS. `ProtectedRoute` with TRAINEE only |
| 2 | Entry points | PASS. Sidebar "My Profile" and the header avatar |
| 3 | Loading and error states | PASS. Several exist (loading, form errors, photo errors, password feedback) |
| 4 | Edit and cancel | PASS in code. Cancel resets the fields, photo and preview |
| 5 | Client-side checks | PASS. File type and the 2 MB size are checked before upload. The password confirmation must match |
| 6 | Header update after a photo | PASS in code. `updateUser` is called with the new link |
| 7 | Password form details | Small gaps: the "Current password" box also demands 8 characters, there are no `autoComplete` hints, and error text uses the `status` role (F-7) |
| 8 | Shared `AuthContext` change | The new function is fine. Login, logout and session restore are unchanged in behavior. The rewrite is larger than needed (F-6) |

## 9. Branch hygiene and release state

| # | Check | Result |
|---|-------|--------|
| 1 | Uncommitted work | At the time of the audit: none. Afterwards: the `sharp` fix (2 package files) and these backlog documents, not yet committed or pushed |
| 2 | Branch pushed | Yes, `origin/feature/MP-41` at `0871d0c` |
| 3 | Pull request | None found |
| 4 | Merged | No |
| 5 | Behind `dev` | 0. A merge has nothing to conflict with |
| 6 | Commit quality | One commit with the subject "MP-41" and the body "Up for review". It says nothing about what changed |
| 7 | Stray or unrelated changes | `.gitignore` gains a personal file name. `package.json` loosens a pin and bumps one package. A type package is added that is not needed (section 10) |

## 10. Definition of Done section (Jira)

| Item | Status |
|------|--------|
| Code reviewed and merged into `main` | NOT DONE |
| Tested editing every editable field, attempting read-only fields through the API, photo upload and password change | PARTIAL. Editing, read-only attempts and the password change are tested. The photo upload through the page and a replacement are not |
| Verified that registrar-controlled fields cannot be changed by a trainee | PASS. Checked in the database after a request that tried 13 forbidden fields |

## 11. Decisions that change or are missing from the ticket

| # | Item | Effect |
|---|------|--------|
| D-1 | **The bucket is public** (the owner's Supabase shows it). The ticket left "private with signed links, or public" open (`to-be-discussed.md` item 1). | Photos are readable by anyone who has the link, not only logged-in users. Record the decision |
| D-2 | **The password rule is length only (8 to 128).** The ticket says "enforces the password rules" | No complexity rule exists. Confirm that is the intent |
| D-3 | The photo on the ID card or the registrar's enrollment view stays an open gap | Out of this ticket |

## 12. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | `sharp` is imported but not declared in `package.json` or the lockfile. The backend does not build on a clean install | High, **fixed 2026-11-06** | Done on the branch: `"sharp": "^0.35.5"` and the lockfile entries (clean `npm ci`, build, lint, 102 tests and a real resize all pass) |
| F-2 | A file declared as a PNG or JPEG but not an image makes `sharp` throw. Nothing catches it, so the API returns a 500 | Medium | Catch the error and return 400 "The file is not a valid JPG or PNG image" |
| F-3 | After the new photo is saved, failing to remove the old file throws a 500. The user sees a failure, the header does not update and the old file is left behind | Medium | Treat the clean-up as best effort: log it and still return the new link |
| F-4 | No unit tests for the new service, controller or DTOs. The backlog file and push log still say NOT STARTED | Medium | Add tests, or record a decision to leave them out as for MP-43. Update the backlog and push log with this audit |
| F-5 | Unrelated edits: `@prisma/adapter-pg` loosened from `7.10.1` to `^7.10.1`, `pg` bumped, `@types/helmet` added (the `helmet` package ships its own types), a personal file name added to `.gitignore`. The commit message says nothing | Low | Remove them from this ticket or explain them, and reword the commit |
| F-6 | `AuthContext.tsx` (used by every role) had its explanatory comments removed and its code reformatted for a change that adds one function | Low | Keep the diff to the added function |
| F-7 | Password form: the "Current password" box requires 8 characters, so a trainee whose existing password is shorter cannot submit. No `autoComplete` hints. Errors use the `status` role. The password change has only the general rate limit | Low | Drop the length rule on the current-password box, add the hints and an alert role, and consider a stricter limit |
| F-8 | The bucket is public, wider than "any logged-in user" (criterion 18) | Medium, to decide | Record the decision. If photos should be private, use signed links |
| F-9 | The 2 MB limit is written in three places: the controller, the page and the bucket | Low | Accept, or share the value |
| F-10 | No module file of its own for profile, and a 279-line page with inline helpers, unlike the other trainee features | Low | Optional tidy-up (section 6) |
| F-11 | Every trainee account starts with the same fixed password, `traineedefault` (set in `enrollments.service.ts`). Anyone who knows it can log in as a trainee who has not changed it | Medium, existing | Not part of MP-41, but this page is where trainees change it. Log it as a technical item and consider asking for a change at first login |
| F-12 | Not yet seen in a browser: the photo upload from the page, the header update, cancel, a phone or tablet width (the profile view and the editable fields were checked by the owner) | Medium | Do a manual pass with a test trainee on `dev` or `staging` |
| F-13 | Row level security is off on all tables (existing, A-2) and the trainee employment values differ between a migrated database and Supabase (existing, TECH-03) | Low / Medium, existing | Not part of MP-41 |

## 13. Gaps to ask the product owner

1. **Public or private photos?** The bucket is public. Is that accepted, given criterion 18 says "any logged-in user"? If not, signed links are needed.
2. **Is a length-only password rule enough?** The ticket says "the password rules".
3. **Should a trainee be asked to change `traineedefault` at first login?** It is a shared, fixed starting password.
4. **Should the unit tests be in the repository for this ticket?** MP-43 and MP-47 left them out by decision. MP-41 has none either way.

## 14. Release steps still open

1. Done: `sharp` added to `package.json` and the lockfile (F-1).
2. Fix the fake-image 500 and the clean-up error handling (F-2, F-3).
3. Remove or explain the unrelated edits, trim the `AuthContext` diff, and reword the commit (F-5, F-6).
4. Update the backlog file and the push log from this audit (F-4).
5. Decide the bucket question (F-8).
6. Open a pull request into `dev`.
7. After the merge, do a manual browser pass as a test trainee and record it (F-12).
8. Nothing to apply on deploy for the database. No migration. The bucket already exists with the right settings.
