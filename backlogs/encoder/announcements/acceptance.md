# MP-37: Encoder Announcement Module

Copied from the root `backlogs.md` on 2026-11-27, with its statuses unchanged. Test with `uat.md`.

---

## MP-37: Encoder Announcement Module

**Branch:** `mp-37-encoder-announcements`
**Assignee:** Chelsea Cllj
**Sprint:** MP Sprint 3
**Status:** In Progress

### Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| **Encoder Announcements Page** | | | |
| 1 | The encoder sees "Announcements" in the sidebar, and `/encoder/announcements` loads without a 403 | PASS | Sidebar entry added with `fa-bullhorn`; `Role.ENCODER` added to `@Get()` findAll; route protected with `ProtectedRoute allowedRoles={['ENCODER']}` |
| 2 | The encoder can post GLOBAL, PROGRAM, and BATCH announcements; PROGRAM and BATCH show the program/batch dropdowns | NOT TESTED | Props `canPostGlobal`, `canPostProgram`, `canPostBatch` passed to shared `<Announcements>` component; backend `@Post()` already includes `Role.ENCODER` |
| 3 | The list shows only announcements the encoder posted; search, scope filter, date filter, and pagination work | NOT TESTED | `manageAll` prop uses the `findAll` endpoint which filters by `posted_by: user.id`; shared component handles search/filter/pagination |
| 4 | The encoder can edit their own posts | NOT TESTED | `canEdit` prop passed; backend `@Patch()` already includes `Role.ENCODER` and checks ownership |
| 5 | Delete appears for the encoder's own posts | NOT TESTED | `canDelete` prop passed; `Role.ENCODER` added to `@Delete(':id')`; `remove()` service blocks deleting other users' posts |
| **Access Control** | | | |
| 6 | Other roles cannot open `/encoder/announcements` | NOT TESTED | `ProtectedRoute allowedRoles={['ENCODER']}` wraps route |
| 7 | Admin and Registrar announcement pages behave the same as before | NOT TESTED | No changes to admin/registrar pages or shared component logic |
| **Dashboard Widgets** | | | |
| 8 | The encoder dashboard shows the announcement widget | PASS | `<AnnouncementWidget />` added to `EncoderDashboard.tsx` |
| 9 | The trainer dashboard shows the announcement widget | PASS | `<AnnouncementWidget />` added to `TrainerDashboard.tsx` |
| 10 | The trainee dashboard shows the announcement widget | PASS | `<AnnouncementWidget />` added to `TraineeDashboard.tsx` |

### Test Cases

| # | Test Case | Type | Expected Result | Actual Result | Status |
|---|-----------|------|-----------------|---------------|--------|
| **Encoder — Post Announcements** | | | | | |
| TC-1 | Login as encoder, navigate to `/encoder/announcements` | Functional | Page loads, form and list visible, no 403 | | NOT TESTED |
| TC-2 | Post a GLOBAL announcement | Functional | Announcement created, appears in list | | NOT TESTED |
| TC-3 | Post a PROGRAM announcement | Functional | Program dropdown appears; announcement created with program scope | | NOT TESTED |
| TC-4 | Post a BATCH announcement | Functional | Batch dropdown appears; announcement created with batch scope | | NOT TESTED |
| TC-5 | Post announcement with empty content | Validation | Error message "Content cannot be empty." | | NOT TESTED |
| TC-6 | Post PROGRAM announcement without selecting program | Validation | Error message "Select a program." | | NOT TESTED |
| TC-7 | Post BATCH announcement without selecting batch | Validation | Error message "Select a batch." | | NOT TESTED |
| **Encoder — List / Search / Filter** | | | | | |
| TC-8 | Encoder sees only own announcements in list | Functional | No announcements posted by other users visible | | NOT TESTED |
| TC-9 | Search by content text | Functional | Matching announcements shown | | NOT TESTED |
| TC-10 | Filter by scope (Global / Program / Batch) | Functional | Only matching scope shown | | NOT TESTED |
| TC-11 | Filter by posted date | Functional | Only announcements from that date shown | | NOT TESTED |
| TC-12 | Pagination: navigate pages | Functional | Correct page shown; "Showing page X of Y" accurate | | NOT TESTED |
| TC-13 | Combine search + scope filter + date filter | Functional | Results match all conditions | | NOT TESTED |
| **Encoder — Edit / Delete** | | | | | |
| TC-14 | Edit own announcement content | Functional | Updated content saved and visible | | NOT TESTED |
| TC-15 | Edit own announcement remarks | Functional | Updated remarks saved | | NOT TESTED |
| TC-16 | Cancel editing | Functional | Original content restored, edit mode closed | | NOT TESTED |
| TC-17 | Delete own announcement | Functional | Confirmation prompt; announcement removed from list | | NOT TESTED |
| TC-18 | Attempt to edit another user's announcement via API (`PATCH /announcements/:id`) | Security | Returns 403 or ownership error | | NOT TESTED |
| TC-19 | Attempt to delete another user's announcement via API (`DELETE /announcements/:id`) | Security | Returns 403 or ownership error | | NOT TESTED |
| **Access Control** | | | | | |
| TC-20 | Login as trainer, navigate to `/encoder/announcements` | Access | Redirected or 403 shown | | NOT TESTED |
| TC-21 | Login as trainee, navigate to `/encoder/announcements` | Access | Redirected or 403 shown | | NOT TESTED |
| TC-22 | Login as admin, verify `/admin/announcements` unchanged | Regression | Admin page works as before; can see all announcements | | NOT TESTED |
| TC-23 | Login as registrar, verify `/registrar/announcements` unchanged | Regression | Registrar page works as before; can see all announcements | | NOT TESTED |
| **Dashboard Widget — Encoder** | | | | | |
| TC-24 | Login as encoder, go to dashboard | Functional | AnnouncementWidget visible with active announcements | | NOT TESTED |
| TC-25 | No active announcements exist | Functional | Widget section hidden (returns null) | | NOT TESTED |
| **Dashboard Widget — Trainer** | | | | | |
| TC-26 | Login as trainer, go to dashboard | Functional | AnnouncementWidget visible with active announcements | | NOT TESTED |
| TC-27 | Post a GLOBAL announcement as encoder, verify trainer sees it | Functional | Global announcement appears on trainer dashboard | | NOT TESTED |
| TC-28 | Post a PROGRAM announcement, verify trainer in that program sees it | Functional | Program-scoped announcement visible to trainer assigned to that program | | NOT TESTED |
| TC-29 | Post a BATCH announcement, verify trainer in that batch sees it | Functional | Batch-scoped announcement visible to trainer assigned to that batch | | NOT TESTED |
| **Dashboard Widget — Trainee** | | | | | |
| TC-30 | Login as trainee, go to dashboard | Functional | AnnouncementWidget visible with active announcements | | NOT TESTED |
| TC-31 | Post a GLOBAL announcement, verify trainee sees it | Functional | Global announcement appears on trainee dashboard | | NOT TESTED |
| TC-32 | Post a PROGRAM announcement, verify trainee enrolled in that program sees it | Functional | Program-scoped announcement visible | | NOT TESTED |
| TC-33 | Post a BATCH announcement, verify trainee enrolled in that batch sees it | Functional | Batch-scoped announcement visible | | NOT TESTED |
| TC-34 | Announcement widget "Read more" / "Show less" toggle | Functional | Long content expands and collapses correctly | | NOT TESTED |
| **UI / Layout** | | | | | |
| TC-35 | Encoder announcements page on mobile viewport (375px) | Responsive | Layout stacks, form usable, no horizontal scroll | | NOT TESTED |
| TC-36 | Dashboard widgets on mobile viewport (375px) | Responsive | Widgets stack properly, text readable | | NOT TESTED |
| TC-37 | Sidebar shows "Announcements" under encoder Main section | UI | Bullhorn icon, correct link, active state when on page | | NOT TESTED |

### Test Logs

| Date | Tester | Environment | Tests Run | Pass | Fail | Notes |
|------|--------|-------------|-----------|------|------|-------|
| 2026-10-20 | Chelsea Cllj | Code audit (branch) | 10 ACs | 4 PASS | 0 | 6 NOT TESTED — require running app with encoder/trainer/trainee accounts. tsc 0 errors. |
| | | | | | | |

### Open Items / Gaps

| # | Item | Priority | Linked AC/TC | Target |
|---|------|----------|--------------|--------|
| 1 | Verify `findAll` filters by `posted_by: user.id` for encoder role (encoder must not see other users' posts) | High | AC 3, TC-8 | Before merge |
| 2 | Verify PROGRAM/BATCH dropdowns populate correctly for encoder (options endpoint returns programs/batches) | High | AC 2, TC-3/TC-4 | Before merge |
| 3 | Verify `findActive` returns correct announcements scoped to trainer's assigned programs/batches | High | TC-28/TC-29 | Before merge |
| 4 | Verify `findActive` returns correct announcements scoped to trainee's enrolled programs/batches | High | TC-32/TC-33 | Before merge |
| 5 | Trainer announcements page (equivalent to encoder's management view) — not in scope for MP-37 but trainer has `@Post()` and `@Patch()` access | Low | — | Future ticket |
| 6 | Trainee has no management page for announcements (view-only via dashboard widget) — confirm this is intended | Low | — | Confirm with lead |
| 7 | ~~`@Get('active')` has no `@Roles()` decorator~~ — **Resolved:** added explicit `@Roles(ADMIN, REGISTRAR, ENCODER, TRAINER, TRAINEE)` | — | — | Done |
| 8 | No automated tests (unit or e2e) for encoder announcement flows | Medium | All TCs | Follow-up (TECH debt) |
| 9 | AnnouncementWidget shows max 3 items with no "View all" link for encoder/trainer/trainee dashboards | Low | TC-24/TC-26/TC-30 | Follow-up UX |
