# MP-39: Trainer — Announcements Module

| Field | Value |
|-------|-------|
| **Jira** | MP-39 |
| **Type** | Feature |
| **Status** | To Do |
| **Assignee** | Chelsea Cllj |
| **Sprint** | MP Sprint 3 |
| **Route** | `/trainer/announcements` |

---

## Acceptance Criteria

### Access and Authorization

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Trainer sees "Announcements" in the sidebar and `/trainer/announcements` loads without 403 | DONE | Route in AppRouter, sidebar link, TRAINER in controller @Roles |
| 2 | Other roles cannot open `/trainer/announcements` | DONE | ProtectedRoute allowedRoles={['TRAINER']} |
| 3 | Unauthenticated user receives 401 on announcements API | DONE | JwtAuthGuard on controller |
| 4 | Trainer permissions enforced by backend, not only frontend | DONE | RolesGuard + @Roles on every endpoint |

### Scope Restrictions

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 5 | Scope picker shows only PROGRAM and BATCH; GLOBAL is not available | DONE | canPostGlobal={false} hides GLOBAL option |
| 6 | Calling `POST /announcements` with scope GLOBAL as trainer returns 403 | DONE | assertCanPost blocks GLOBAL for TRAINER |
| 7 | Program and batch dropdowns list only the trainer's own batches and their programs | DONE | getOptions queries trainer's batches (OPEN/ONGOING) and their programs |
| 8 | Calling `POST /announcements` with a batch the trainer doesn't handle returns 403 | DONE | assertTrainerOwnsTarget checks batch ownership |
| 9 | Calling `POST /announcements` with a program the trainer has no batch in returns 403 | DONE | assertTrainerOwnsTarget checks program via batch |

### Create Announcement

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 10 | Trainer can create a valid PROGRAM announcement for their own program | DONE | POST /api/announcements with scope validation + ownership check |
| 11 | Trainer can create a valid BATCH announcement for their own batch | DONE | POST /api/announcements with scope validation + ownership check |
| 12 | Blank content rejected | DONE | @IsNotEmpty on DTO + frontend validation |
| 13 | Content > 5,000 chars rejected | DONE | @MaxLength(5000) on DTO + maxLength={5000} on textarea |
| 14 | Remarks > 1,000 chars rejected | DONE | @MaxLength(1000) on DTO + maxLength={1000} on input |
| 15 | Created with authenticated trainer as posted_by | DONE | req.user.id set as posted_by in service.create() |
| 16 | Returns 201 Created | DONE | NestJS POST default status |
| 17 | Frontend shows success message and refreshes list | DONE | setSuccess + loadAnnouncements after create |

### View Announcements

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 18 | List shows only announcements the trainer posted | DONE | findAll filters by posted_by: user.id |
| 19 | Pagination returns correct data and meta | DONE | page/limit/total/totalPages in response meta |
| 20 | Search, scope filter, date filter work correctly | DONE | Query params validated and applied in findAll |
| 21 | Invalid page/limit/scope/date returns 400 | DONE | BadRequestException for each invalid param |
| 22 | Empty state when no announcements | DONE | "No announcements yet." rendered |
| 23 | Loading and error states correct | DONE | "Loading announcements..." + error message display |

### Update Announcement

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 24 | Trainer can edit their own posts | DONE | PATCH with ownership check (posted_by === user.id) |
| 25 | Trainer cannot edit another user's announcement | DONE | ForbiddenException if posted_by !== user.id |
| 26 | Invalid UUID returns 400 | DONE | ParseUUIDPipe on :id param |
| 27 | Non-existent announcement returns 404 | DONE | NotFoundException in service.update() |
| 28 | Scope/program/batch cannot be reassigned on update | DONE | UpdateAnnouncementDto only exposes content/remarks |
| 29 | Delete appears only if approved (optional step 1) | DONE | canDelete not passed, defaults false for TRAINER; TRAINER excluded from @Delete roles |

### Dashboard

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 30 | Trainer dashboard shows announcement widget | DONE | AnnouncementWidget imported and rendered in TrainerDashboard |
| 31 | Widget shows GLOBAL announcements plus those for trainer's own programs and batches | DONE | findActive returns GLOBAL + BATCH(trainer's) + PROGRAM(trainer's) |

### Regression

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 32 | Admin announcement options and posting behave the same as before | DONE | Shared backend; admin paths unchanged |
| 33 | Registrar announcement options and posting behave the same as before | DONE | Shared backend; registrar paths unchanged |
| 34 | Encoder announcement options and posting behave the same as before | DONE | Shared backend; encoder paths unchanged |

---

## Test Cases

### TC-01: Trainer can access announcement page
- **AC:** #1
- **Priority:** Critical
- **Precondition:** Logged in as trainer
- **Steps:**
  1. Navigate to `/trainer/announcements`
- **Expected:** Announcement page loads successfully; "Announcements" visible in sidebar

### TC-02: Unauthenticated user receives 401
- **AC:** #3
- **Priority:** Critical
- **Precondition:** Not logged in
- **Steps:**
  1. Call `GET /api/announcements` without JWT token
- **Expected:** 401 Unauthorized returned

### TC-03: Non-trainer role blocked from trainer announcements page
- **AC:** #2
- **Priority:** Critical
- **Precondition:** Logged in as admin
- **Steps:**
  1. Navigate to `/trainer/announcements` via URL bar
- **Expected:** Redirected away or 403 shown

### TC-04: GLOBAL scope not available in scope picker
- **AC:** #5
- **Priority:** Critical
- **Precondition:** Logged in as trainer, on announcements page
- **Steps:**
  1. Open the scope picker dropdown
- **Expected:** Only PROGRAM and BATCH are listed; GLOBAL is absent

### TC-05: POST with GLOBAL scope returns 403
- **AC:** #6
- **Priority:** Critical
- **Precondition:** Logged in as trainer
- **Steps:**
  1. Call `POST /api/announcements` with scope = GLOBAL
- **Expected:** 403 Forbidden returned

### TC-06: Options show only trainer's own batches and programs
- **AC:** #7
- **Priority:** Critical
- **Precondition:** Logged in as trainer who handles batch A (program X) but not batch B (program Y)
- **Steps:**
  1. Call `GET /api/announcements/options`
- **Expected:** Only batch A and program X returned; batch B and program Y not listed

### TC-07: POST with unowned batch returns 403
- **AC:** #8
- **Priority:** Critical
- **Precondition:** Logged in as trainer; batch B belongs to a different trainer
- **Steps:**
  1. Call `POST /api/announcements` with scope = BATCH and batch_id = batch B
- **Expected:** 403 Forbidden returned

### TC-08: POST with unowned program returns 403
- **AC:** #9
- **Priority:** Critical
- **Precondition:** Logged in as trainer; trainer has no batch in program Y
- **Steps:**
  1. Call `POST /api/announcements` with scope = PROGRAM and program_id = program Y
- **Expected:** 403 Forbidden returned

### TC-09: Create valid PROGRAM announcement
- **AC:** #10, #15, #16, #17
- **Priority:** Critical
- **Precondition:** Logged in as trainer who handles a batch in program X
- **Steps:**
  1. Click "Create Announcement"
  2. Select scope PROGRAM, pick program X
  3. Enter content and remarks
  4. Click Save
- **Expected:** 201 Created; success toast; list refreshes; posted_by = current trainer

### TC-10: Create valid BATCH announcement
- **AC:** #11, #15, #16, #17
- **Priority:** Critical
- **Precondition:** Logged in as trainer who handles batch A
- **Steps:**
  1. Click "Create Announcement"
  2. Select scope BATCH, pick batch A
  3. Enter content and remarks
  4. Click Save
- **Expected:** 201 Created; success toast; list refreshes; posted_by = current trainer

### TC-11: Validation — blank content rejected
- **AC:** #12
- **Priority:** High
- **Precondition:** On create form
- **Steps:**
  1. Leave content blank, click Save
- **Expected:** Validation error shown; no API call made

### TC-12: Validation — content and remarks length limits
- **AC:** #13, #14
- **Priority:** Medium
- **Precondition:** On create form
- **Steps:**
  1. Enter content > 5,000 characters, click Save
  2. Enter remarks > 1,000 characters, click Save
- **Expected:** Both rejected with length validation error

### TC-13: View announcements — only trainer's own posts shown
- **AC:** #18
- **Priority:** High
- **Precondition:** Trainer has posted announcements; other users have also posted
- **Steps:**
  1. Load the announcements list
- **Expected:** Only the trainer's own announcements appear

### TC-14: View announcements with pagination and filters
- **AC:** #19, #20, #21
- **Priority:** High
- **Precondition:** Multiple announcements exist for the trainer
- **Steps:**
  1. Filter by scope, search by keyword, filter by date range
  2. Navigate to page 2
  3. Enter invalid page number
- **Expected:** Correct data returned; pagination meta accurate; invalid input returns 400

### TC-15: Empty and loading states
- **AC:** #22, #23
- **Priority:** Medium
- **Precondition:** No announcements / slow network
- **Steps:**
  1. View page with no announcements
  2. View page during loading
- **Expected:** Empty state rendered; skeleton loader during load

### TC-16: Edit own announcement
- **AC:** #24, #28
- **Priority:** High
- **Precondition:** Trainer's own announcement exists
- **Steps:**
  1. Click Edit on own announcement
  2. Modify content
  3. Attempt to change scope
  4. Click Save
- **Expected:** Content updated; scope locked; list refreshes after save

### TC-17: Cannot edit another user's announcement
- **AC:** #25
- **Priority:** High
- **Precondition:** Announcement posted by admin exists
- **Steps:**
  1. Call `PATCH /api/announcements/:id` as trainer
- **Expected:** 403 Forbidden — ownership check fails

### TC-18: Update — invalid UUID returns 400
- **AC:** #26
- **Priority:** Medium
- **Precondition:** None
- **Steps:**
  1. Call `PATCH /api/announcements/not-a-uuid`
- **Expected:** 400 Bad Request

### TC-19: Update — non-existent announcement returns 404
- **AC:** #27
- **Priority:** Medium
- **Precondition:** None
- **Steps:**
  1. Call `PATCH /api/announcements/{valid-but-nonexistent-uuid}`
- **Expected:** 404 Not Found

### TC-20: Delete visibility depends on approval
- **AC:** #29
- **Priority:** Medium
- **Precondition:** Logged in as trainer, own announcement exists
- **Steps:**
  1. Check if delete button is visible on own announcement
- **Expected:** Delete button appears only if canDelete was approved in step 1 (optional); otherwise hidden

### TC-21: Dashboard — announcement widget visible
- **AC:** #30, #31
- **Priority:** High
- **Precondition:** Logged in as trainer; GLOBAL + trainer's batch announcements exist
- **Steps:**
  1. Navigate to `/trainer/dashboard`
- **Expected:** AnnouncementWidget renders; shows GLOBAL announcements and announcements for trainer's own programs and batches

### TC-22: No regression — admin announcements
- **AC:** #32
- **Priority:** High
- **Precondition:** Logged in as admin
- **Steps:**
  1. Navigate to `/admin/announcements`
  2. Create, edit, delete an announcement
- **Expected:** All functions work as before; options list is unchanged

### TC-23: No regression — registrar announcements
- **AC:** #33
- **Priority:** High
- **Precondition:** Logged in as registrar
- **Steps:**
  1. Navigate to `/registrar/announcements`
  2. Create and edit an announcement
- **Expected:** All functions work as before; options list is unchanged

### TC-24: No regression — encoder announcements
- **AC:** #34
- **Priority:** High
- **Precondition:** Logged in as encoder
- **Steps:**
  1. Navigate to `/encoder/announcements`
  2. Create and edit an announcement
- **Expected:** All functions work as before; options list is unchanged

---

## Summary: 34/34 — Complete (code review verified)
