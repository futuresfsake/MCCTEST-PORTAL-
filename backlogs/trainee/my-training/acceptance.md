# MP-40: Trainee My Training and Class Schedule Page

Route `/trainee/training`, API `GET /api/trainee/training`, `TRAINEE` only. Read-only. Criteria copied from Jira on 2026-11-27. Test with `uat.md`.

**Status key:** NOT VERIFIED means the criterion has not been checked for this file. It does not mean it fails.

---

## Acceptance Criteria

## MP-40: Student Portal My Training and Class Schedule Page

Jira status on 2026-11-27: **To Do**. 15 criteria.

### Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---|---|---|
| MT-1 | **Given** I'm logged in as a trainee, **when** I click "My Training" in the sidebar, **then** I'm taken to `/trainee/training`. | NOT VERIFIED | |
| MT-2 | **Given** a non-trainee or logged-out user, **when** they open `/trainee/training`, **then** they're redirected like other protected routes, and the API returns 401/403. | NOT VERIFIED | |
| MT-3 | **Given** I'm enrolled in a batch, **then** I see my program name, batch name, batch start and end dates, and batch status. | NOT VERIFIED | |
| MT-4 | **Given** my program has a schedule, **then** I see the class days and start and end times in a readable format. | NOT VERIFIED | |
| MT-5 | **Given** my batch has an assigned trainer, **then** I see the trainer's name. | NOT VERIFIED | |
| MT-6 | **Given** training sessions exist for my batch, **then** I see each session's date and topics covered, sorted by date, with upcoming and past sessions distinguished. | NOT VERIFIED | |
| MT-7 | **Given** no sessions have been recorded yet, **then** I see an empty state, e.g. "No training sessions yet." | NOT VERIFIED | |
| MT-8 | I see my enrollment status, ID card number, uniform size, and whether my uniform and ID card were issued. | NOT VERIFIED | |
| MT-9 | **Given** I'm enrolled in more than one program, **then** I can switch between them, and the ongoing one is shown first. | NOT VERIFIED | |
| MT-10 | **Given** I'm not enrolled in any batch, **then** I see a friendly message instead of an error. | NOT VERIFIED | |
| MT-11 | I can only see my own data. Another trainee's enrollment can't be viewed by changing a URL or request. | NOT VERIFIED | |
| MT-12 | The API response contains no sensitive user fields. | NOT VERIFIED | |
| MT-13 | A loading indicator shows while fetching, and a failed request shows an error with a retry option. | NOT VERIFIED | |
| MT-14 | The page is responsive on mobile, tablet and desktop. | NOT VERIFIED | |
| MT-15 | The backend and frontend lint/build pass with no new errors. | NOT VERIFIED | |
