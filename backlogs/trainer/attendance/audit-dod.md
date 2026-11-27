# MP-67 Trainer Attendance Tracking: Definition of Done audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-27 (second run, replaces the 2026-11-25 run) |
| **Audited** | Branch `feature/MP-67` at `0528f39` (pushed, includes `dev`). One untracked file, `text.txt`, which is not in the branch |
| **Compared with** | `origin/dev` at `56266ba`. The branch is 4 commits ahead and 0 behind. 18 files changed, 1 migration added |
| **Jira status** | To Do (checked 2026-11-27) |
| **How it was run** | A fresh Postgres 17 in Docker (`mp67_audit`): all 15 migrations applied from nothing, and the backend run against it with fake data. Supabase was read with read-only queries only. The throwaway container was removed afterwards |
| **Not audited** | Any page in a browser (screen, print preview, phone width, keyboard, URL refresh). The deployed site. Supabase timing. No unit tests or break-it check (there are no tests for the new code) |
| **Definition of Done used** | The Jira ticket has **no Acceptance Criteria list and no "Definition of Done" section**. It points to `acceptance.md` (52 criteria, 17 test cases), used here, and the Jira comment on migration safety. The criteria text on this branch is the same as on `dev`. The Jira description and the backlog agree on the main rules |
| **Since the last run** | Only `dev` was merged in. The attendance code did not change. The merge conflict is gone. All checks below were run again, and the same defects reproduce |

---

## Verdict

**Not ready. Do not merge.**

The migration is good. The feature is not.

1. **No real trainer can use it.** `batch.trainer_id` points to `trainer.id`. The new service compares it with the user id. A trainer gets an empty batch list and 404 on their own batch (F-1).
2. **Stale saves overwrite data.** A change to statuses or remarks does not move the session version, and two saves at the same moment both succeed in 9 of 10 tries (F-2, F-3).
3. **Trainees enrolled on the session day are left off the roster** if enrolled after 08:00 Manila time (F-4).
4. **The Trainee Dashboard is changed and now misleading.** The percentage is now hours against program hours, the label still says "Present of N sessions", and it can show 320% (F-5).
5. **Missing work:** Missing class days, export header, Trainer Dashboard and clearance use, history screen, and the MP-66 start date guard.
6. **No unit tests** for the new code.
7. **`acceptance.md` on the branch claims 40 PASS.** That is not what the tests show. Pull request #113 can be merged on GitHub (no conflict, no review), so nothing there stops it.

Acceptance Criteria: **22 PASS, 20 PARTIAL, 10 NOT MET** (52).

Because of F-1, everything past access control was tested with test trainers whose `trainer.id` was set equal to their user id, in the throwaway database only. The statuses below show what works **once F-1 is fixed**. As the code stands, a real trainer cannot use any of it.

---

## 1. Engineering checks

| # | Check | Result |
|---|---|---|
| 1 | Backend `eslint` (no fix) | PASS |
| 2 | Backend `tsc --noEmit` | PASS |
| 3 | Backend `nest build` | PASS |
| 4 | Backend `jest` | 164 of 164 tests pass, 15 suites. 3 of those suites are local spec files under `uniform-distribution/` that are not in git. **No test covers the new code** |
| 5 | `prisma validate` and `generate` | PASS |
| 6 | Frontend `eslint .` and `tsc -b` | PASS |
| 7 | Frontend `vite build` | PASS. Main bundle 678 kB, over the 500 kB warning |
| 8 | `npm audit`, backend (production) | 3 high (`effect`, through `prisma`). No `package.json` changed, so existing |
| 9 | `npm audit`, frontend | 9 moderate, existing |
| 10 | New dependencies | None |

## 2. Migration and database

Migration: `20261123_trainer_attendance`.

| # | Check | Result |
|---|---|---|
| 1 | All 15 migrations on an empty Postgres 17 | PASS. `0_init` byte-order mark stripped in a scratch copy only (TECH-02) |
| 2 | `migrate status`, second `migrate deploy` | "Database schema is up to date", no pending migrations |
| 3 | `migrate diff` database against `schema.prisma` | PASS for the new objects. Only the known TECH-03 drift (3 enums, 5 `trainer` columns) |
| 4 | Unique keys and hours check | PASS. A duplicate attendance row, a duplicate session, hours 0 and hours 25 are rejected |
| 5 | Indexes and foreign keys | `attendance_history` has two indexes. `session_id` is `ON DELETE SET NULL`. `enrollment_id` and `attendance_id` have no foreign key |
| 6 | Upgrade of a database that already has a session row | **FAILS** as expected: `column "hours" of relation "training_session" contains null values` (P3018). Nothing was left half applied |
| 7 | Supabase (read only) | Migration **not applied**. 14 migrations applied, latest `20261106_trainee_enrollment_transfers`. 0 sessions, 0 attendance rows, no history table. So it can apply today |
| 8 | Supabase trainers (read only) | 2 `trainer` rows, none with `id` equal to `user_id`. 7 batches with a trainer (all `OPEN`), none would be found by the new code |
| 9 | Row level security | Off on `batch`, `enrollments`, `training_session`, `attendance`, and on the new table in the test database. Matches the other tables |

Differences from the proposal: `hours` is `decimal(5,2)` (not 4,2). `change_type` enum became `event_type varchar(30)` with no check, and the values are `ATTENDANCE_RECORDED`, `ATTENDANCE_CHANGED`, `HOURS_CHANGED`, `SESSION_DELETED`.

## 3. Evidence from real use

None. The migration is not on Supabase and both attendance tables are empty.

## 4. Acceptance Criteria

| # | Criteria (short) | Status | Evidence |
|---|---|---|---|
| AT-1 | Page is Trainer only | PASS | `AppRouter.tsx` `ProtectedRoute` with `TRAINER` (code) |
| AT-2 | 401 and 403 on every endpoint | PASS | 8 endpoints: 401 with no token, 403 for Admin, Registrar, Encoder, Trainee |
| AT-3 | Own batches only | NOT MET | Another trainer gets 404, but so does the owner (F-1) |
| AT-4 | Trainer comes from login | PASS | `recorded_by` and `updated_by` in the body are ignored |
| AT-5 | No personal data | PASS | Sheet, summary, history and export return names, ids and attendance only |
| AT-6 | Input validated | PARTIAL | Bad values return 400. History without or with a bad `batchId` returns 500 (F-9) |
| AT-7 | Lists my ONGOING batches and roster | NOT MET | Real trainer gets `[]` (F-1) |
| AT-8 | Today by default, scheduled and extra days | PARTIAL | Default and label work. Class days are not suggested |
| AT-9 | Mark all present, running counts | PASS | Page code |
| AT-10 | Missing status is 400 and names the trainee | PARTIAL | 400, but neither API nor page says which trainee |
| AT-11 | One call, one session per date | PASS | 3 rows with `recorded_by`. Second save updates or returns 409 |
| AT-12 | Default hours, extra day needs hours | PASS | 4 hours from an 08:00 to 12:00 schedule. 0 hours is refused |
| AT-13 | Hours limits and 0.25 steps | PASS | 0, 25, 4.1 and text return 400 |
| AT-14 | Date limits | PASS | Future and before start return 400, message names both limits |
| AT-15 | Not ONGOING returns 409 | PARTIAL | `CLOSED`, `OPEN`, `CANCELLED` are blocked with 404, not 409 |
| AT-16 | Roster by status and enrollment date | NOT MET | Enrolled today at 09:00 is not on today's roster (F-4). A foreign row returns 400 |
| AT-17 | Withdrawn rows kept, read-only | PASS | Old rows read-only, change returns 400, not accepted on new sessions |
| AT-18 | Topics can be saved | PARTIAL | API works. The page has no topics field and each page save clears saved topics (F-6) |
| AT-19 | Reopen and change, closed is read-only | PARTIAL | ONGOING works. A closed batch cannot be viewed at all (404) |
| AT-20 | History for first save and changes | PASS | Rows written for first save, status, remark and hours changes |
| AT-21 | Reason for past sessions | PASS | No reason or 3 characters returns 400. Same day needs none. A first entry for a past date also needs one |
| AT-22 | No-op save writes nothing | PASS | 200, no history row, `updated_at` unchanged |
| AT-23 | History timeline | PARTIAL | API returns newest first with name, values and reason. No screen shows it |
| AT-24 | History cannot be changed | PASS | No update or delete route |
| AT-25 | Delete empty session only | PARTIAL | 409 and 200 as expected, but the `SESSION_DELETED` row loses its session, date and batch (F-7). No button on the page |
| AT-26 | Session list with last editor | PARTIAL | Date, hours, counts. No editor |
| AT-27 | Missing days | NOT MET | Not built |
| AT-28 | Summary, never above 100% | PASS | 32 hours, 10.67%, counts 6, 2, 1, 1. Capped at 100 |
| AT-29 | "Program hours not set" | PARTIAL | API returns no percentage. The page shows nothing |
| AT-30 | One shared hours rule | PASS | `common/attendance/attendance-hours.ts` |
| AT-31 | Trainee Dashboard shows new data | PARTIAL | Shows hours and counts. Meaning of the percentage changed, not capped, label wrong (F-5) |
| AT-32 | Trainer Dashboard uses the function | NOT MET | Not built |
| AT-33 | Clearance can read hours | NOT MET | Not built |
| AT-34 | Both start date rules agree | PARTIAL | Recording rule works. Class Management has no check for recorded sessions (code search) |
| AT-35 | Stale save returns 409 | NOT MET | After a status change, a save with the old version returned 200 and overwrote it (F-2) |
| AT-36 | Same-moment saves give one winner | NOT MET | New date: 10 of 10 correct. Existing session: 9 of 10 had two winners (F-3) |
| AT-37 | No duplicate rows | PASS | Unique key rejects it |
| AT-38 | All or nothing | PASS | Forced history failure left no session |
| AT-39 | Fixed query counts | NOT MET | Reads are fixed. Save: 23 statements for 5 trainees, 63 for 25 (F-8) |
| AT-40 | Migration on a fresh database | PASS | Section 2 |
| AT-41 | URL keeps batch, date, tab | PARTIAL | Batch and date in the URL (code). There are no tabs. Refresh not seen |
| AT-42 | Empty, loading, error states | PARTIAL | No state for an empty roster. Others exist (code) |
| AT-43 | Warn before leaving | PARTIAL | Browser close or refresh only. Changing batch, date or page drops changes silently |
| AT-44 | Accessible and phone width | PARTIAL | Status and remark controls have no accessible label. Table is 700 px wide and scrolls sideways |
| AT-45 | Constants in one place | PARTIAL | Frontend has its own status list. 24 and 0.25 are repeated |
| AT-46 | Clean print layout | PASS | Print styles hide the interactive page (code). Preview not seen |
| AT-47 | Print saved data, warn if unsaved | PARTIAL | Prints saved data. The warning is only on the printout, not on screen |
| AT-48 | Excel export grid | PARTIAL | CSV, not `.xlsx`. Percentage not capped (320.00) |
| AT-49 | File header and session hours | NOT MET | Not built |
| AT-50 | No personal data in export | PASS | Name, system ID, status letters, totals |
| AT-51 | Formula text is plain text | PASS | `=HYPERLINK` name written with a leading `'` |
| AT-52 | Export rules for ONGOING and CLOSED | PARTIAL | API: 200 for closed, 404, 409, 400 correct. The page cannot select a closed batch |

**Totals: 22 PASS, 20 PARTIAL, 10 NOT MET = 52.** The earlier self-audit in `acceptance.md` said 40 PASS.

Test cases TC-01 to TC-17 were not run as written. TC-15 and TC-17 need a browser.

## 5. Tests run (full inventory)

| Group | What was run |
|---|---|
| Unit tests | 164 tests in 15 suites, all pass (3 suites are local, not in git). None for the new code. Break-it check not possible |
| Real data shape | Trainer with its own `trainer.id`: batch list, sheet, sessions, summary, export |
| Access | 40 calls (8 endpoints by 5 callers), 7 calls by another trainer |
| Save and history | First save, repeat save, no-op, history rows, topics, reason rules, withdrawn trainee |
| Concurrency | Stale save, 10 pairs of same-moment updates, 10 pairs of same-moment creates, forced rollback |
| Validation | Dates, hours, status, remark, topics, ids, duplicate and foreign rows, bad version |
| Delete, summary, export | Delete rules, 32-hour case, no program hours, over 100%, formula name, closed batch, Trainee Dashboard |
| Query counts | Statement logging: save, sheet, summary with 5 and 25 trainees, session list with 10 and 60 sessions. Local times 14 to 116 ms, not Supabase timing |
| Migration | Fresh apply, status, drift, shapes, constraints, upgrade with an existing row |
| Supabase | Read-only transaction: migration records, row counts, columns, constraints, trainer id match |

| Where the test data lived | What was cleaned up |
|---|---|
| Containers `mp67_audit` (databases `mp67`, `mp67_up`) | Removed with its volume. Backend server stopped. Scripts stay in the temp folder, outside the repo. No volume was left behind. Docker Desktop was started for the audit; another container, `weather_db`, started with it and was left alone |

## 6. Definition of Done section items

The ticket has none. From the Jira migration comment:

| Item | Status |
|---|---|
| Migration tested only on a throwaway database | Done in this audit |
| Drift checked | Done, only TECH-03 |
| Nothing written to Supabase | Confirmed: migration not applied, tables empty |
| Throwaway container removed | Done (`mp67_audit`) |

## 7. Decisions that change the ticket (need the project leader)

| ID | What was built |
|---|---|
| D-1 | CSV export instead of `.xlsx` |
| D-2 | `PATCH .../session` instead of `PUT .../sessions/:date`, `.../session?date=` instead of `.../sheet`, `.../export` instead of `.../export.xlsx` |
| D-3 | Trainee Dashboard percentage changed from present over sessions to hours over program hours |
| D-4 | `event_type` text instead of the `attendance_change_enum` |

## 8. Findings

| ID | Finding | Severity | Suggested action |
|---|---|---|---|
| F-1 | `attendance.service.ts:29` and `:546` compare `batch.trainer_id` with the user id | High | Filter through the relation: trainer whose `user_id` is the logged-in user |
| F-2 | Session `updated_at` moves only for hours or topics changes (`attendance.service.ts:252`), so stale status saves are accepted | High | Move the version on any change |
| F-3 | Version is checked without a row lock (`:223` to `:241`) | High | Lock the row, or update with the version in the filter |
| F-4 | `enrolled_at` (time) is compared with midnight UTC of the session date (`:579`) | High | Compare with the end of that day in Asia/Manila |
| F-5 | Trainee Dashboard percentage: new meaning, no cap, old label in `AttendanceSummary.tsx`, shows nothing without program hours | High | Decide D-3, then cap and relabel or restore |
| F-6 | The page does not send `topics`, so a save clears them | Medium | Keep topics when omitted, add the field |
| F-7 | Deleting a session sets `session_id` to null on its history, and the row has no batch or date | Medium | Store batch and date on history rows. The migration is not applied yet, so it can still be changed |
| F-8 | Save writes one statement pair per trainee inside a transaction with the default 5 second limit. On Supabase a large batch may time out (not measured) | Medium | Use bulk writes |
| F-9 | History returns 500 for a bad `batchId`. A missing `batchId` also gives 500 | Medium | Validate it |
| F-10 | No unit tests for the service, DTOs, controller or hours function | Medium | Add them |
| F-11 | Page gaps: no history, delete, topics, in-app leave warning, labels | Medium | Complete the page |
| F-12 | An empty roster can be saved and creates an empty session | Low | Refuse it |
| F-13 | Merge conflict with `dev` (found 2026-11-25) | Closed | Resolved in `0528f39` |

## 9. Questions for the product owner

| Question | Options |
|---|---|
| Which percentage does the trainee see? | Hours over program hours (new) or present over sessions (old), or both |
| Is CSV enough? | Accept CSV, or require `.xlsx` with the header and session hours |
| Are AT-32, AT-33 and the MP-66 guard part of this ticket? | Build here, or move to MP-65, MP-61 and MP-66 |

## 10. Release steps still open

1. Fix F-1 to F-5, add tests, and audit again.
2. PR #113 (open, into `dev`) has no review. Do not merge it as it is.
3. Apply the migration to Supabase only with the project leader's approval, **before** the new code runs there: the changed Trainee Dashboard reads `training_session.hours`.
4. Just before applying, check that `training_session` is still empty. With any row the migration fails.
5. Remove or keep out the untracked `text.txt`.
