# MP-67 Trainer Attendance: how to check each criterion by hand

| Field | Value |
|---|---|
| **Branch** | `feature/MP-67`, code at `0528f39` (PR #113) |
| **Date** | 2026-11-27 |
| **Result** | **22 PASS, 20 PARTIAL, 10 NOT MET.** Do not merge yet |
| **Full audit** | `audit-dod.md` |

Each criterion shows the steps, what should happen, and the **last result**. "Run" means it was checked with requests or database commands on a throwaway database. "Code" means code reading only. The manual steps below have not all been rehearsed exactly as written.

---

## 0. Setup (once)

**Use a local throwaway database only. Never run any of this on Supabase.**

### 0.1 Database (Git Bash, from `backend-nestjs`)

```bash
docker run -d --name mp67_review -e POSTGRES_PASSWORD=localonly -e POSTGRES_DB=mp67 -p 127.0.0.1:5455:5432 postgres:17-alpine

# wait a few seconds, then apply every migration (the sed removes the byte-order mark, TECH-02)
for d in prisma/migrations/*/; do
  sed '1s/^\xEF\xBB\xBF//' "$d/migration.sql" | docker exec -i mp67_review psql -q -U postgres -d mp67 -v ON_ERROR_STOP=1 || break
done

export DATABASE_URL=postgresql://postgres:localonly@127.0.0.1:5455/mp67
echo $DATABASE_URL        # must show 127.0.0.1 before you continue
npx prisma generate
npm run db:seed           # creates the Admin and Registrar (see prisma/seed.ts)
npm run start:dev         # same terminal, so it uses the local database
```

Start the frontend in a second terminal: `npm run dev` in `frontend`, with `VITE_API_URL` pointing to the local backend. Do not upload files during these tests, because file storage settings still come from `.env`.

Open a database prompt any time with:

```bash
docker exec -it mp67_review psql -U postgres -d mp67
```

### 0.2 Test data

1. As **Admin**, create two trainers: **Trainer R** and **Trainer W**.
2. **Before giving W any batch**, run this for W (workaround for AT-3):
   ```sql
   update trainer set id = user_id
   where user_id = (select id from users where system_id = 'W_SYSTEM_ID');
   ```
   Leave R unchanged.
3. Create a program with **300** total training hours and a Monday to Friday schedule, 08:00 to 12:00.
4. Create one batch for R and one for W. Set both to start in the past, then:
   ```sql
   update batch set batch_status = 'ONGOING' where batch_name in ('R batch name', 'W batch name');
   ```
5. Enroll at least 3 trainees in W's batch, one named **Ana**. Make their enrollment date earlier than the dates you test:
   ```sql
   update enrollments set enrolled_at = now() - interval '30 days'
   where batch_id = (select id from batch where batch_name = 'W batch name');
   ```

Use **W** for every test unless the steps say otherwise.

### 0.3 Console helper (for the API steps)

Log in, open the Attendance page, press F12, open **Console** and paste this. Paste it again after a refresh or a new login. Change the port if your backend is not on 3000.

```js
var API = 'http://localhost:3000/api/trainer/attendance';
var B = new URLSearchParams(location.search).get('batch');   // current batch id
var api = async (method, path, body) => {
  const r = await fetch(API + path, { method, body: body && JSON.stringify(body), headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + localStorage.getItem('accessToken'),
    'X-Session-Token': localStorage.getItem('sessionToken') } });
  const t = await r.text(); console.log(r.status, t);
  try { return JSON.parse(t); } catch { return t; }
};
var sheet = (date) => api('GET', `/batches/${B}/session?date=${date}`);
var body = (s, extra = {}) => ({ sessionDate: s.date, hours: s.session?.hours ?? s.suggestedHours,
  entries: s.entries.map((e) => ({ enrollmentId: e.enrollmentId, status: e.status || 'PRESENT' })),
  expectedUpdatedAt: s.session?.updatedAt, ...extra });
var save = (data) => api('PATCH', `/batches/${B}/session`, data);
```

In the steps, replace `TODAY`, `PAST` and similar words with real dates such as `'2026-11-23'`. Saving a past date needs `{ reason: 'manual test' }`.

---

## Access and security

### AT-1: Only trainers can open the page (PASS, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Log in as Admin and type `/trainer/attendance` in the address bar | `/403` |
| 2 | Repeat as Registrar, Encoder and Trainee | `/403` |
| 3 | Log in as W and open it | Page loads |

**Last result:** the route is limited to `TRAINER`.

### AT-2: Login and role on every endpoint (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | As W, note the batch id: `console.log(B)` | |
| 2 | Open a terminal: `curl -i http://localhost:3000/api/trainer/attendance/batches` | 401 |
| 3 | Log in as Admin, paste the helper, set `B='<batch id>'`, run `api('GET','/batches')`, `sheet('TODAY')`, `api('GET', '/batches/' + B + '/export')` | 403 each |
| 4 | Repeat for Registrar, Encoder, Trainee | 403 |

**Last result:** all 8 endpoints behaved as expected.

### AT-3: Own batches only (NOT MET, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Log in as **R** and open Attendance | R's batch is listed |
| 2 | In the console set `B` to R's batch id (from the `batch` table) and run `sheet('TODAY')` | 200 |
| 3 | Still as R, set `B` to W's batch id and run `sheet('TODAY')` | 404 |

**Last result:** step 1 shows an empty list and step 2 returns **404**. Step 3 passes. Cause: `batch.trainer_id` (the `trainer.id`) is compared with the user id (`attendance.service.ts` lines 29 and 546).

### AT-4: Trainer comes from the login (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | `var s = await sheet('TODAY'); await save(body(s, { recorded_by: '00000000-0000-0000-0000-000000000000' }))` | 200 |
| 2 | SQL: `select distinct u.system_id from attendance a join users u on u.id = a.recorded_by;` | Only W |

**Last result:** as expected.

### AT-5: No personal data (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | `await sheet('TODAY')`, `await api('GET', '/batches/' + B + '/summary')` and click **Export CSV** | |
| 2 | Look through the output | No password hash, email, contact number, address or birth date |

**Last result:** as expected.

### AT-6: Input validation (PARTIAL, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | `var s = await sheet('TODAY'); await save(body(s, { hours: 25 }))` | 400 |
| 2 | `var d = body(s); d.entries[0].status = 'SICK'; await save(d)` | 400 |
| 3 | `var d = body(s); d.entries[0].remark = 'a'.repeat(501); await save(d)` | 400 |
| 4 | `await save(body(s, { reason: 'a'.repeat(501) }))` | 400 |
| 5 | `await api('GET','/sessions/TODAY/history?batchId=abc')` | 400 |
| 6 | `await api('GET','/sessions/TODAY/history')` | 400 |

**Last result:** steps 1 to 3 return 400. Steps 5 and 6 return **500**. Step 4 was not run.

---

## Taking attendance

### AT-7: Batch list and roster (NOT MET, Run; empty list also seen on screen)
| Step | Do this | Expected |
|---|---|---|
| 1 | Log in as **R** and open Attendance | R's `ONGOING` batch and roster |
| 2 | Log in as **W** | Batch and roster, with a status and remark per trainee |

**Last result:** R sees "No ongoing batches are assigned to you". W works only because of the workaround.

### AT-8: Default date, scheduled and extra days (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Open the page without a date in the URL | Today (Manila) |
| 2 | Pick a weekday | "Scheduled class day" |
| 3 | Pick a Saturday | "Extra session day" |
| 4 | Look for a list or marks of scheduled class days | Class days are suggested |

**Last result:** steps 1 to 3 work. Nothing is suggested (step 4).

### AT-9: Mark all present (PASS, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Click **Mark all present** | All editable trainees become Present |
| 2 | Change one to Late | Counts update at once |

**Last result:** the page code does this.

### AT-10: Missing status (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Open an unsaved date, set all but one trainee and click **Save attendance** | Message names the missing trainee |
| 2 | `var s = await sheet('TODAY'); var d = body(s); d.entries.pop(); await save(d)` | 400 naming the trainee |

**Last result:** both refuse the save but **do not name the trainee**.

### AT-11: One save, one session (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Pick an unsaved date, mark everyone, give a reason if asked, and save | Saved |
| 2 | Change one status and save again | Saved |
| 3 | SQL: `select batch_id, session_date, count(*) from training_session group by 1,2;` | 1 per date |

**Last result:** as expected.

### AT-12: Default hours (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Pick an unsaved weekday | Hours show 4 |
| 2 | Change to 3.5 and save | Saved with 3.5 |
| 3 | Pick an unsaved Saturday, leave hours at 0 and save | Refused |

**Last result:** default and refusal of 0 as expected.

### AT-13: Hour limits (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | `var s = await sheet('TODAY'); for (const h of [0, 25, 4.1, 'x']) await save(body(s, { hours: h }))` | 400 each |

**Last result:** as expected.

### AT-14: Date limits (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | `var s = await sheet('TODAY'); await save(body(s, { sessionDate: 'TOMORROW', expectedUpdatedAt: undefined }))` | 400 naming the limit |
| 2 | Same with a date before the batch start and `reason: 'manual test'` | 400 naming the limit |

**Last result:** as expected.

### AT-15: Batch not ONGOING (PARTIAL, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | With W's page open: `var s = await sheet('TODAY')` | |
| 2 | SQL: `update batch set batch_status='CLOSED' where id='<batch id>';` | |
| 3 | `await save(body(s))` | 409 |
| 4 | Repeat with `OPEN` and `CANCELLED`, then set it back to `ONGOING` | 409 |

**Last result:** **404** instead of 409. Nothing is saved.

### AT-16: Roster by status and enrollment date (NOT MET, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Enroll a new trainee, **Lito**, in W's batch, then SQL: `update enrollments set enrolled_at = ((now() at time zone 'Asia/Manila')::date + time '09:00') at time zone 'Asia/Manila' where id='<Lito enrollment id>';` | |
| 2 | Open **today** | Lito is listed |
| 3 | Open yesterday | Lito is not listed |

**Last result:** Lito is **missing** today. The enrollment time is compared with midnight UTC, which is 08:00 Manila (line 579).

### AT-17: Withdrawn trainee (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Save a past date with all trainees | Saved |
| 2 | SQL: `update enrollments set enrollment_status='WITHDRAWN' where id='<one enrollment id>';` | |
| 3 | Reopen that date | Their row is shown "(read-only)" and disabled |
| 4 | `var s = await sheet('PAST'); var d = body(s, { reason: 'manual test' }); d.entries.find(e => e.enrollmentId === '<id>').status = 'ABSENT'; await save(d)` (pick a status different from the saved one) | 400 |
| 5 | Open a new date | They are not on the roster |

**Last result:** as expected. Set the status back to `ENROLLED` afterwards.

### AT-18: Topics covered (PARTIAL, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Look for a topics field on the page | Field exists |
| 2 | `var s = await sheet('TODAY'); await save(body(s, { topics: 'Welding' }))` | 200 |
| 3 | Reload the page, change one status and click **Save attendance** | |
| 4 | SQL: `select session_date, topics_covered from training_session order by 1 desc;` | Still "Welding" |
| 5 | `await save(body(await sheet('TODAY'), { topics: 'a'.repeat(501) }))` | 400 |

**Last result:** **no field**, and step 4 shows the topics **cleared**.

---

## Corrections and history

### AT-19: Reopen; closed is read-only (PARTIAL, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Reopen a saved session, change a status, add a reason and save | Saved |
| 2 | SQL: set the batch to `CLOSED`, then reload the page | Session can be viewed, not edited |

**Last result:** a closed batch **cannot be viewed** (404). Set it back to `ONGOING`.

### AT-20: History rows (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Save a new date | |
| 2 | Change a status, save. Change a remark, save. Change the hours, save | |
| 3 | SQL: `select changed_at, event_type, old_status, new_status, old_remarks, new_remarks, old_hours, new_hours, changed_by from attendance_history order by changed_at desc limit 20;` | One row per trainee on first save, then a row per change |

**Last result:** as expected. The first event is named `ATTENDANCE_RECORDED`, not `RECORDED`.

### AT-21: Reason for past sessions (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | On a saved past date, change a status and save with no reason | Refused |
| 2 | Enter `abc` and save | Refused |
| 3 | Enter 5 or more characters | Saved |
| 4 | Change today's session with no reason | Saved |

**Last result:** as expected. A first entry for a past date also asks for a reason.

### AT-22: No-op save (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | SQL: note `select count(*) from attendance_history;` and today's `updated_at` | |
| 2 | Open today's saved session and save without changes | |
| 3 | Run the same SQL | Same count and `updated_at` |

**Last result:** as expected.

### AT-23: History timeline (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Look on the page for the history of a session | Timeline shown |
| 2 | `await api('GET', '/sessions/PAST/history?batchId=' + B)` | Newest first with who, when, old, new, reason |

**Last result:** the API is correct. **No screen** shows it.

### AT-24: History cannot be changed (PASS, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Read `attendance.controller.ts` | No update or delete route for history |
| 2 | `await api('DELETE', '/sessions/PAST/history?batchId=' + B)` | 404 |

**Last result:** no such route exists. Step 2 was not run.

### AT-25: Delete a session (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Look for a delete button | Exists |
| 2 | `await api('DELETE', '/batches/' + B + '/sessions/PAST')` on a date with attendance | 409 |
| 3 | SQL: `insert into training_session(batch_id, session_date, hours, created_by) select id, 'EMPTY_DATE', 4, created_by from batch where id='<batch id>';` | |
| 4 | Delete `EMPTY_DATE` with the same API call | 200 |
| 5 | SQL: `select * from attendance_history where event_type='SESSION_DELETED';` | Shows which session, date and batch |

**Last result:** 409 and 200 are correct. **No button**, and the history row has **no session, date or batch**.

---

## Session list and summary

### AT-26: Session list (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Scroll to **Session list** | Date, hours, Present, Absent, Late, Excused and last editor |

**Last result:** only date, hours and **present count**. No last editor.

### AT-27: Missing days (NOT MET, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Leave a past weekday unsaved and check the session list | Shown as **Missing** |

**Last result:** not built.

### AT-28: Trainee summary (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | In a fresh batch, save 10 dates for one trainee: 6 Present, 2 Late, 1 Excused, 1 Absent, 4 hours each | |
| 2 | Check **Trainee summary** | 32 hours, 10.7%, P 6, A 1, L 2, E 1 |
| 3 | SQL: `update programs set total_training_hours=10 where id='<program id>';` and reload | 100%, never more |

**Last result:** as expected.

### AT-29: No program hours (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | SQL: `update programs set total_training_hours=null where id='<program id>';` | |
| 2 | Reload the page | Hours, counts and "Program hours not set" |

**Last result:** no error, but **no message**. Set the hours back to 300.

### AT-30: One hours rule (PASS, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Search the backend for `LATE` and `hoursCompleted` | The rule is only in `common/attendance/attendance-hours.ts` |

**Last result:** as expected.

---

## Integration with other tickets

### AT-31: Trainee Dashboard (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Use the trainee from AT-28 (32 hours). Set program hours to 10 | |
| 2 | Log in as that trainee and open the dashboard | At most 100% |
| 3 | Read the label beside the percentage | Matches how it is calculated |

**Last result:** **320%**, and the label **still describes sessions present**.

### AT-32: Trainer Dashboard (NOT MET, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Log in as W and open the Trainer Dashboard after saving today | Hours progress, behind pace and "Attendance recorded" |

**Last result:** not built.

### AT-33: Clearance "hours complete" (NOT MET, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Search for a clearance feature using the shared hours function | It can read hours completed |

**Last result:** not built.

### AT-34: Start date rules agree (PARTIAL, Run and Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Save a date before the batch start (see AT-14) | Refused |
| 2 | As Admin or the batch owner, move the start date to after a saved session | Refused |

**Last result:** step 1 is refused. **No check exists** for step 2 (code).

---

## Integrity, concurrency and performance

### AT-35: Stale save (NOT MET, Run and manual test)
Use a date that is **already saved**.

| Step | Tab 1 | Tab 2 | Saved value for Ana |
|---|---|---|---|
| 1 | Opens the session | Opens the session | Present |
| 2 | Changes Ana to **Absent**, adds a reason, saves | Still shows Present | Absent |
| 3 | | **Without refreshing**, changes Ana to **Late**, adds a reason, saves | **Should stay Absent** |
| 4 | Refresh and check Ana | | Absent |

**Expected:** step 3 shows an error (409). **Last result:** it saves and Ana becomes Late. The version moves only when hours or topics change, so leave the hours unchanged. Also confirmed failing in a manual test on 2026-11-27.

### AT-36: Two saves at the same moment (NOT MET, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Open today's saved session and paste the helper | |
| 2 | `for (let i = 0; i < 10; i++) { const s = await sheet('TODAY'); await Promise.all([save(body(s, { hours: 1 + i * 0.25 })), save(body(s, { hours: 8 + i * 0.25 }))]); }` | Each pair: one 200 and one 409 |
| 3 | SQL: `select session_date, count(*) from training_session where batch_id='<batch id>' group by 1;` | 1 per date |

**Last result:** both saves succeeded in **9 of 10** pairs. One session per date holds.

### AT-37: No duplicate rows (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | SQL: `insert into attendance(session_id, enrollment_id, status, recorded_by) select session_id, enrollment_id, status, recorded_by from attendance limit 1;` | Rejected: `attendance_session_id_enrollment_id_key` |

**Last result:** rejected.

### AT-38: All or nothing (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | SQL: `create function boom() returns trigger language plpgsql as $$ begin raise exception 'boom'; end $$; create trigger boom before insert on attendance_history for each row execute function boom();` | |
| 2 | Save a new date on the page | Save fails |
| 3 | SQL: check `training_session` and `attendance` for that date | Nothing saved |
| 4 | SQL: `drop trigger boom on attendance_history; drop function boom();` | |

**Last result:** as expected.

### AT-39: Fixed query counts (NOT MET, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Prepare a batch with 5 trainees and one with 25 | |
| 2 | SQL: `alter system set log_statement='all';` then `select pg_reload_conf();` | |
| 3 | Save each batch once, then run `docker logs --since 1m mp67_review` and count the statements per save | Same number for 5 and 25 |
| 4 | SQL: `alter system reset log_statement;` then `select pg_reload_conf();` | |

**Last result:** **23** statements for 5 trainees, **63** for 25. Sheet, summary and session list stay fixed.

### AT-40: Migration (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Run section 0.1 on a new container | No error |
| 2 | `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` | Only the known TECH-03 differences (3 enums, `trainer` columns) |

**Last result:** passed. The migration fails if `training_session` already has a row. The shared table was empty at this check.

---

## Frontend

### AT-41: URL keeps batch, date, tab (PARTIAL, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Pick a batch and a past date, then press F5 | Both kept |
| 2 | Switch tabs and press F5 | Tab kept |

**Last result:** batch and date are written to the URL (refresh not verified). The page has **no tabs**.

### AT-42: Empty, loading, error states (PARTIAL, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Trainer with no `ONGOING` batch | A message |
| 2 | `ONGOING` batch with no trainees | A message |
| 3 | Stop the backend, change a status and save | Error, typed values kept |

**Last result:** step 1 works, step 2 has **no message**, step 3 is handled in code.

### AT-43: Unsaved changes warning (PARTIAL, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Change a status, then press F5 | Warning |
| 2 | Change a status, then pick another date | Warning |
| 3 | Change a status, then pick another batch, then a sidebar page | Warning |

**Last result:** only step 1 warns. Changes are **dropped silently** in steps 2 and 3.

### AT-44: Accessibility and phone width (PARTIAL, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | In DevTools, inspect a status list and a remark box | Each has a label naming the trainee |
| 2 | Fill the roster with Tab and arrow keys only | Possible |
| 3 | DevTools device mode, width 375 | No sideways scroll |

**Last result:** **no accessible labels**, and the table is at least **700 px** wide. Keyboard use was not verified.

### AT-45: Constants in one place (PARTIAL, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Search for the status list, `24`, `0.25` and the reason length | Defined once per side |

**Last result:** **repeated**.

---

## Print and export

### AT-46: Print layout (PASS, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Open a saved session and click **Print sheet** | Batch, program, date, hours, roster with status and remark, four counts, signature line; no menus, buttons or sidebar |

**Last result:** the print styles do this. Preview not verified.

### AT-47: Print with unsaved changes (PARTIAL, Code)
| Step | Do this | Expected |
|---|---|---|
| 1 | Change a status without saving and click **Print sheet** | A warning on the page |
| 2 | Look at the preview | Saved values |

**Last result:** saved values print, but the **warning is only on the printout**.

### AT-48: Excel export (PARTIAL, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Click **Export CSV** on a batch with sessions | An Excel (`.xlsx`) file, one row per trainee, one column per date, totals |
| 2 | Set program hours to 10 with more than 10 hours recorded, export again | Percentage at most 100 |

**Last result:** **CSV**, and the percentage shows **320.00**.

### AT-49: File header and session hours (NOT MET, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Open the exported file | MCCTEST, program, batch, trainer, date range, date generated, and hours above each date |

**Last result:** none of these.

### AT-50: No personal data in the export (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | Check every column of the exported file | Only name, system ID, statuses, remarks, hours and totals |

**Last result:** as expected. Remarks are not exported.

### AT-51: Formula text (PASS, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | SQL: `update users set first_name='=HYPERLINK("x")' where system_id='<a trainee id>';` | |
| 2 | Export and open in Excel | Shown as text, nothing runs |

**Last result:** written with a leading `'`.

### AT-52: Export rules (PARTIAL, Run)
| Step | Do this | Expected |
|---|---|---|
| 1 | `await api('GET', '/batches/' + B + '/export?from=LATER_DATE&to=EARLIER_DATE')` | 400 |
| 2 | Set `B` to a batch of yours with no session and export | 409 |
| 3 | Set `B` to another trainer's batch and export | 404 |
| 4 | SQL: set your batch with sessions to `CLOSED`, then `await api('GET', '/batches/' + B + '/export')` | 200 |
| 5 | Reload the page and pick that closed batch to export | Possible |

**Last result:** steps 1 to 4 correct. The page **does not list** closed batches.

---

## Clean up

```bash
docker rm -f -v mp67_review
```
