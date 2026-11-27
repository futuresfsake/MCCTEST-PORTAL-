# MP-28: Trainer Announcements

Copied from Jira on 2026-11-27. The later ticket MP-39 covers the same page (`trainer/announcements/`). Where the two differ, confirm which one applies.

**Status key:** NOT VERIFIED means the criterion has not been checked for this file. It does not mean it fails.

---

## Acceptance Criteria

## MP-28: Trainer: Announcements

Jira status on 2026-11-27: **Done**. 27 criteria.

### 🔐 Authentication & Access Control

| # | Criteria | Status | Notes |
|---|---|---|---|
| TN-1 | Only `TRAINER` role can access — all others redirected to `/403` | NOT VERIFIED | |
| TN-2 | JWT guard + RolesGuard enforced on all endpoints | NOT VERIFIED | |
| TN-3 | Trainer can only post `BATCH` or `PROGRAM` scoped announcements — attempting `GLOBAL` scope returns `403` | NOT VERIFIED | |
| TN-4 | Trainer can only post to batches/programs they are assigned to — posting to another trainer's batch returns `403` | NOT VERIFIED | |
| TN-5 | Trainer cannot edit or delete another trainer's announcement — returns `403` | NOT VERIFIED | |

### 🖥️ Frontend

| # | Criteria | Status | Notes |
|---|---|---|---|
| TN-6 | Announcement list table shows: scope, program/batch name, content preview, posted at, actions | NOT VERIFIED | |
| TN-7 | Scope chip renders correctly: `BATCH` (blue) / `PROGRAM` (green) — `GLOBAL` never appears on trainer pages | NOT VERIFIED | |
| TN-8 | Empty state renders when no announcements exist — no blank white box | NOT VERIFIED | |
| TN-9 | Create announcement modal fields: scope selector (`BATCH` or `PROGRAM`), conditional batch/program dropdown, content textarea, remarks | NOT VERIFIED | |
| TN-10 | Selecting `BATCH` scope shows batch dropdown and hides program dropdown — and vice versa | NOT VERIFIED | |
| TN-11 | Batch dropdown only shows batches assigned to the logged-in trainer — no other trainer's batches appear | NOT VERIFIED | |
| TN-12 | Program dropdown only shows programs linked to the logged-in trainer's batches | NOT VERIFIED | |
| TN-13 | Content textarea has a character limit enforced on frontend before submission | NOT VERIFIED | |
| TN-14 | Edit modal pre-fills all existing fields correctly | NOT VERIFIED | |
| TN-15 | Delete triggers a confirmation dialog before proceeding | NOT VERIFIED | |
| TN-16 | Success and error toasts on every create, edit, and delete action | NOT VERIFIED | |

### ⚙️ Backend

| # | Criteria | Status | Notes |
|---|---|---|---|
| TN-17 | `POST /trainer/announcements` — creates announcement; scope must be `BATCH` or `PROGRAM`; `batch_id` or `program_id` required depending on scope | NOT VERIFIED | |
| TN-18 | `GET /trainer/announcements` — paginated list scoped to logged-in trainer's batches/programs only | NOT VERIFIED | |
| TN-19 | `GET /trainer/announcements/:id` — single announcement detail | NOT VERIFIED | |
| TN-20 | `PATCH /trainer/announcements/:id` — update content or remarks; trainer can only edit their own | NOT VERIFIED | |
| TN-21 | `DELETE /trainer/announcements/:id` — soft or hard delete; trainer can only delete their own | NOT VERIFIED | |
| TN-22 | Posting `GLOBAL` scope returns `403` | NOT VERIFIED | |
| TN-23 | Posting to a batch not assigned to the logged-in trainer returns `403` | NOT VERIFIED | |
| TN-24 | `batch_id` and `program_id` both present in body returns `400` — only one allowed per scope rule | NOT VERIFIED | |
| TN-25 | Neither `batch_id` nor `program_id` provided for non-global scope returns `400` | NOT VERIFIED | |
| TN-26 | Non-existent `batch_id` or `program_id` returns `404` | NOT VERIFIED | |
| TN-27 | No endpoint exposes raw Prisma error or stack trace | NOT VERIFIED | |
