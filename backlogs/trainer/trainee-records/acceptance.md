# Trainer: Trainee Records (Programs, Batches, Search and PDF Roster)

| Field | Value |
|-------|-------|
| **Jira** | MP-68 |
| **Type** | Feature (new Trainer page, new endpoints, PDF export, one small migration) |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Route** | `/trainer/records` (the sidebar link exists, the page does not) |
| **Backend** | `/api/trainer/records` (new) |
| **Depends on** | Trainee Information (MP-50, built: list, search, profile), Class Management (MP-66, batch status), Attendance Tracking (MP-67, the hours column) |
| **Resolves** | MP-50 open question Q2: Trainee Records stays separate from Trainees |
| **Decided 2026-11-23** | A separate Trainee Records page, Trainees (MP-50) unchanged. The PDF has name, system ID, batch, enrollment status, contact number and attendance hours, and nothing else. Export one batch, or one program (all of the trainer's batches of it, one section per batch) |
| **TBA (to be announced)** | Three things are not decided: the **paper size and orientation** and the official **header layout or logo**, whether the roster gets a **signature or date columns**, and whether to **keep the export log** (assumed yes). See the Open Questions |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** a records page that lists the programs and batches I have covered, lets me search my trainees and open their information, and exports a PDF roster per batch or per program,
**so that** I can print a class list and find any trainee I taught without asking the Registrar.

## What Exists Today (and What Is Missing)

| Need | Today |
|---|---|
| Search, filter, sort and open a trainee profile, own batches only, closed batches included | **Built** in Trainee Information (MP-50) at `/trainer/trainees`. Stays as is |
| View by program and by batch (the programs the trainer covered) | Missing |
| PDF export | Missing. No PDF library in `backend-nestjs` or `frontend` |
| The "Trainee Records" sidebar link at `/trainer/records` | Exists, **no page** |

## What the Trainer Can Do

1. **Programs I covered.** A card per program: name, number of batches, number of trainees, and the batch statuses (open, ongoing, closed). Includes closed batches. Cancelled batches are not shown (they never ran).
2. **Batches of a program.** Each batch: name, start and end date, status, trainees enrolled out of capacity, and a link to its roster.
3. **Roster of a batch.** Name, system ID, enrollment status, contact number, attendance hours, and a link to the full information (the existing trainee profile page, `/trainer/trainees/:id`). Search by name or system ID and a status filter, kept in the URL.
4. **Export PDF.**
   - On a batch: the roster of that batch.
   - On a program: all of the trainer's batches of that program, **one section per batch**.
   - Made by the server, sent as a download, **not stored**.

## The PDF

- **Header** (each batch section): MCCTEST name, program, batch name, start and end date, batch status, trainer name, date and time generated, number of trainees.
- **Table:** row number, name (last name first), system ID, enrollment status, contact number, hours completed. The header row repeats on every page. Page numbers (page x of y) in the footer.
- **Only these fields.** No address, parents, beneficiary, insurance, email or birth date.
- **Who is listed:** `ENROLLED` and `COMPLETED` by default. A tick box adds `WITHDRAWN` and `DROPPED`, each marked by its status (assumed, Open Question 5). `PENDING` is not listed.
- **Hours** come from the one shared hours function of MP-67. Until attendance is recorded the column shows a dash.
- **Names** with accents and the letter n with tilde print correctly (a font that supports them is embedded).
- **File name:** clean and built by the server from the program, batch and date (for example `roster_BATCH-NAME_2026-11-23.pdf`), never taken raw from user text.
- **Paper size and orientation** and the **official header layout or logo** are TBA. A plain placeholder header is used until MCCTEST provides them, and the size is one setting.

## Rules

- **Who.** Only `TRAINER`, only batches where the logged-in user is the batch trainer. Another trainer's batch or program returns 404. The trainer is never taken from a query, body or path value.
- **Scope of "program".** The program export includes only the trainer's own batches of that program. It never includes another trainer's batch of the same program.
- **Fields.** The roster API and the PDF return only the agreed fields. The response has no password hash and no insurance data. The trainer still has no insurance access (MP-50 T14).
- **Export log.** Contact numbers leave the system in the PDF, so every export writes one row: who, when, which batch or program, how many trainees, and whether withdrawn trainees were included. Append-only (Open Question 6, assumed yes).
- **Empty.** A batch or program with no trainee to list cannot be exported. The button is disabled and the API returns 409.
- **Read only.** Exporting changes no trainee data.
- **Cost.** A fixed number of queries whatever the number of trainees or batches. The PDF is built by streaming, with a limit on the number of batches in one program export (Open Question 7).
- **Rate limit.** The export endpoints use the existing throttler, with a lower limit than normal reads.

## Schema Proposal (one small migration)

- New table `roster_export_log`: `id`, `exported_by` (FK to users), `scope` (`BATCH` or `PROGRAM`), `batch_id` (nullable FK), `program_id` (nullable FK), `trainee_count`, `included_inactive` (boolean), `exported_at`. Index on (`exported_by`, `exported_at` desc). Append-only.
- Nothing changes on existing tables.
- Test the migration on a fresh database (TECH-02 and TECH-03 known).

## Endpoints (all `TRAINER` only, `JwtAuthGuard` and `RolesGuard`)

| Method and path | What |
|---|---|
| `GET /api/trainer/records/programs` | The programs the trainer covered, each with its batches (not cancelled), trainee counts and statuses |
| `GET /api/trainer/records/batches/:batchId/roster?search=&status=&page=` | The roster of one batch with the agreed fields and hours, paged |
| `GET /api/trainer/records/batches/:batchId/roster.pdf?includeInactive=` | The PDF of one batch |
| `GET /api/trainer/records/programs/:programId/roster.pdf?includeInactive=` | The PDF of one program (one section per batch of the trainer) |

Searching across all covered trainees stays on the existing `GET /api/trainer/trainees` (MP-50). This page does not copy that logic.

## Open Questions (TBA unless answered)

| # | Question | Answer or assumption |
|---|---|---|
| 1 | Where does this live? | **Answered 2026-11-23:** a separate Trainee Records page at `/trainer/records`. Trainees (MP-50) stays |
| 2 | What is in the PDF per trainee? | **Answered 2026-11-23:** name, system ID, batch, enrollment status, contact number, attendance hours. Nothing else |
| 3 | What can be exported? | **Answered 2026-11-23:** one batch, and one program (the trainer's batches of it, one section per batch). Not the current search result, not a blank signing sheet |
| 4 | Paper size and orientation, and the official header layout or logo? | **TBA.** MCCTEST to provide. Placeholder header until then. The size is one setting |
| 5 | Are withdrawn and dropped trainees listed? | **Assumed:** not by default. A tick box adds them, marked by status |
| 6 | Is each export logged? | **Assumed:** yes, because contact numbers leave the system. **TBA** whether MCCTEST wants it |
| 7 | How many batches can one program export have? | **Assumed:** up to 50. More returns 400 with a message. A constant |
| 8 | Does the roster have a signature column or blank date columns (a paper attendance sheet)? | **TBA.** Not in this ticket |
| 9 | Do hours show on the roster before attendance exists? | **Assumed:** a dash, no error |

## Scope

- **Backend:** a trainer records module (controller, service, DTOs) under `/api/trainer/records`; a PDF builder (PDFKit, named in the capstone paper, new dependency) with an embedded font; the export log table; the reuse of the shared hours function (MP-67) and of the trainer scope rule from MP-50.
- **Frontend:** the Trainee Records page (programs, batches, roster, search, status filter, Export PDF buttons, tick box for inactive trainees), kept in the URL, with a link to the existing profile page.
- **Tests:** unit tests for the service (scope, counts, empty, filters), the DTOs, the controller (role, guards, the logged-in user passed on), the PDF builder (page count, repeated header, the fields) and the export log.

## Out of Scope

Editing trainee data, the full profile in the PDF, a printable signing sheet or signature columns, Excel export, an export for Admin or Registrar, certificates (MP-64), and changes to the Trainees page (MP-50).

---

## Acceptance Criteria

### Access and security

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| RC-1 | Only `TRAINER` can open `/trainer/records`. Other roles go to `/403` | NOT STARTED | `ProtectedRoute` |
| RC-2 | Every endpoint needs a login (401) and the `TRAINER` role (403 for Admin, Registrar, Encoder, Trainee) | NOT STARTED | Guards |
| RC-3 | A trainer sees and exports only batches where they are the batch trainer. Another trainer's batch returns 404 on the roster and on the PDF | NOT STARTED | Same rule as MP-50 T3 and T8 |
| RC-4 | A program export includes only the trainer's own batches of that program, never another trainer's batch of the same program | NOT STARTED | |
| RC-5 | The trainer comes from the login. No query, body or path value picks a trainer | NOT STARTED | `@CurrentUser()` |
| RC-6 | The roster API and the PDF contain only the agreed fields. No address, parents, beneficiary, insurance, email, birth date or password hash | NOT STARTED | Typed response and a fixed PDF layout |
| RC-7 | Input is validated: bad ids, a status outside the enums, a page or search that is too long, and extra fields are rejected or dropped | NOT STARTED | DTOs, `whitelist` |

### Programs, batches and roster

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| RC-8 | The page lists the programs the trainer covered with the number of batches, the number of trainees and the batch statuses. Closed batches are included, cancelled batches are not | NOT STARTED | |
| RC-9 | Each program shows its batches with name, dates, status, trainees out of capacity, and a link to the roster | NOT STARTED | |
| RC-10 | The roster shows name, system ID, enrollment status, contact number and hours completed, with a link to the existing profile page for each trainee | NOT STARTED | `/trainer/trainees/:id` |
| RC-11 | Search by name or system ID and the status filter work within the batch. The search, the status and the page are kept in the URL and survive a refresh | NOT STARTED | |
| RC-12 | The roster is sorted by last name, then first name, and is paged. The total is correct | NOT STARTED | |
| RC-13 | The hours column uses the shared hours function (MP-67). Before attendance exists it shows a dash and no error | NOT STARTED | Open question 9 |
| RC-14 | A trainer with no covered batch sees a friendly empty state and the API returns 200 | NOT STARTED | |
| RC-15 | Searching across all covered trainees uses the existing Trainees endpoint (MP-50). No second copy of the search logic | NOT STARTED | Reuse check |

### PDF export

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| RC-16 | Export PDF on a batch downloads a PDF of that batch's roster. It is a real PDF (`application/pdf`, opens in a viewer) sent as an attachment | NOT STARTED | |
| RC-17 | Export PDF on a program downloads one PDF with one section per batch of the trainer, each with its own header | NOT STARTED | |
| RC-18 | The header shows MCCTEST, program, batch, start and end date, batch status, trainer name, date and time generated (Asia/Manila) and the number of trainees | NOT STARTED | Layout is TBA, placeholder |
| RC-19 | The table has row number, name (last name first), system ID, enrollment status, contact number and hours completed. The header row repeats on every page and the footer shows page x of y | NOT STARTED | |
| RC-20 | By default only `ENROLLED` and `COMPLETED` trainees are listed. With the tick box, `WITHDRAWN` and `DROPPED` are added and marked by status. `PENDING` is never listed | NOT STARTED | Open question 5 |
| RC-21 | Names with accents and the letter n with tilde print correctly, and long names wrap and do not overlap the next column | NOT STARTED | Embedded font |
| RC-22 | The file name is built by the server from the program, batch and date, with unsafe characters removed. A batch name with slashes or quotes cannot break the header or the name | NOT STARTED | |
| RC-23 | A batch or program with nothing to list cannot be exported. The button is disabled and the API returns 409 | NOT STARTED | |
| RC-24 | A program export with more than the limit of batches (50) returns 400 with a clear message | NOT STARTED | Open question 7 |
| RC-25 | The PDF is not stored on the server or in storage. It is built per request and streamed | NOT STARTED | |
| RC-26 | Paper size and orientation come from one setting. The placeholder is used until MCCTEST decides | NOT STARTED | Open question 4 (TBA) |
| RC-27 | The export endpoints are rate limited (lower than normal reads). Too many requests return 429 | NOT STARTED | `ThrottlerGuard` |

### Export log, integrity and performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| RC-28 | Every successful export writes one `roster_export_log` row with who, when, scope, batch or program, trainee count and whether inactive trainees were included. A refused export (404, 409) writes none | NOT STARTED | Open question 6 |
| RC-29 | The export log is append-only. The application has no update or delete for it | NOT STARTED | By convention, noted in the audit |
| RC-30 | Exporting changes no trainee, enrollment or batch data | NOT STARTED | Read only |
| RC-31 | The programs overview and the roster run a fixed number of queries, and a program export runs a fixed number of queries whatever the number of batches and trainees | NOT STARTED | Statement logging. Local timing is not Supabase timing |
| RC-32 | A roster of 30 trainees and a program with 10 batches export within a stated time and memory limit on the local database (the numbers are recorded in the audit) | NOT STARTED | Streaming, no full buffer |
| RC-33 | The migration applies on a fresh database and `prisma migrate diff` shows no drift for the new table | NOT STARTED | TECH-02, TECH-03 known |

### Frontend

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| RC-34 | The sidebar link "Trainee Records" opens the new page. The Trainees page and its links still work unchanged | NOT STARTED | Regression check on MP-50 |
| RC-35 | Export buttons show a busy state while the file is made, show an error with Retry when it fails, and never open a blank tab | NOT STARTED | |
| RC-36 | Empty, loading and error states exist for programs, batches and roster | NOT STARTED | |
| RC-37 | The page works at phone width and by keyboard, and colors are not the only signal for status | NOT STARTED | |
| RC-38 | Constants (batch limit, status list, page size) are in one place on each side | NOT STARTED | Config duplication check |

---

## Test Cases

### TC-01: Access
- **AC:** RC-1, RC-2, RC-5
- **Priority:** Critical
- **Steps:** Open the page as Admin, Registrar, Encoder and Trainee. Call each endpoint, including the PDFs, with those tokens and with none. Send `?trainer_id=<other>`.
- **Expected:** Page goes to `/403`. API returns 403, and 401 with no token. The query value is ignored.

### TC-02: Ownership
- **AC:** RC-3, RC-4
- **Priority:** Critical
- **Precondition:** Two trainers who each taught a batch of the same program.
- **Steps:** As trainer A, open the programs overview, the roster and both PDFs. Try B's batch and the program PDF.
- **Expected:** A sees only A's batch. B's batch returns 404 on roster and PDF. The program PDF has only A's batch.

### TC-03: Programs and batches overview
- **AC:** RC-8, RC-9, RC-14
- **Priority:** High
- **Precondition:** Batches in `OPEN`, `ONGOING`, `CLOSED` and `CANCELLED`, across two programs. A trainer with none.
- **Steps:** Open the page as each trainer.
- **Expected:** Both programs show their counts and statuses. The cancelled batch is missing. The trainer with none sees an empty state and no error.

### TC-04: Roster, search and profile link
- **AC:** RC-10 to RC-13, RC-15
- **Priority:** High
- **Precondition:** A batch with 12 trainees, one withdrawn, one with attendance recorded.
- **Steps:** Open the roster. Search by a name and by a system ID. Filter by status. Refresh. Click a trainee. Compare the search with the Trainees page.
- **Expected:** Fields as agreed, sorted by last name, paged with a correct total. The URL keeps the search, status and page. The profile opens the existing page. The hours show a number for the trainee with attendance and a dash for others. Results match the Trainees page for the same search.

### TC-05: Batch PDF
- **AC:** RC-16, RC-18 to RC-20
- **Priority:** Critical
- **Steps:** Export a batch of 40 trainees (more than one page), once without and once with the tick box.
- **Expected:** A real PDF downloads. The header has the program, batch, dates, status, trainer, time and count. The table repeats its header on page 2 and the footer shows page x of y. Withdrawn trainees appear only with the tick box and are marked by status. `PENDING` never appears.

### TC-06: Program PDF
- **AC:** RC-17, RC-4
- **Priority:** High
- **Precondition:** A program with 3 of the trainer's batches and 1 batch of another trainer.
- **Steps:** Export the program.
- **Expected:** One PDF with three sections, each with its own header. The other trainer's batch is absent.

### TC-07: Fields and privacy
- **AC:** RC-6, RC-25
- **Priority:** Critical
- **Steps:** Export a PDF and extract its text. Read the roster JSON. Check the server storage and the Supabase bucket after the export.
- **Expected:** Only the agreed fields are present. No address, parents, beneficiary, insurance, email or birth date, in the PDF or in the JSON. No file was stored anywhere.

### TC-08: Names and long text
- **AC:** RC-21, RC-22
- **Priority:** Medium
- **Precondition:** A trainee named with accents and the letter n with tilde, a very long name, and a batch named with a slash and a quote.
- **Steps:** Export the batch.
- **Expected:** Names print correctly and wrap without overlap. The file name has the unsafe characters removed and the download works.

### TC-09: Empty and over the limit
- **AC:** RC-23, RC-24
- **Priority:** Medium
- **Steps:** Try to export a batch with no listed trainee and a program of only such batches. Try a program with 51 batches.
- **Expected:** The button is disabled and the API returns 409 for the empty cases. The 51 batches case returns 400 with a message.

### TC-10: Export log
- **AC:** RC-28, RC-29
- **Priority:** High
- **Steps:** Export a batch, a program and one with the tick box. Make a refused export (another trainer's batch, an empty batch). Read the log.
- **Expected:** Three rows with who, when, scope, count and the inactive flag. No rows for the refused exports. No update or delete route exists for the log.

### TC-11: No data changes
- **AC:** RC-30
- **Priority:** Medium
- **Steps:** Count the rows of trainees, enrollments and batches before and after several exports.
- **Expected:** The counts are the same. Only the export log grew.

### TC-12: Rate limit
- **AC:** RC-27
- **Priority:** Medium
- **Steps:** Call the PDF endpoint repeatedly above the limit.
- **Expected:** 429 after the limit, and normal reads still work.

### TC-13: Query count and size
- **AC:** RC-31, RC-32
- **Priority:** Medium
- **Steps:** Statement logging on. Export a program with 1 batch of 5 trainees, then one with 10 batches of 30. Note the time and memory.
- **Expected:** The same number of queries. Time and memory are within the stated limits. Record the numbers and say they are local.

### TC-14: Screen behaviour and Trainees regression
- **AC:** RC-34 to RC-37
- **Priority:** Medium
- **Steps:** Open the sidebar link and the Trainees page. Stop the API and press Export. Open the page at 375 px wide and tab through it.
- **Expected:** The Trainees page works as before. The failed export shows an error with Retry and no blank tab. The empty and loading states show. The page works on a phone and by keyboard.

### TC-15: Migration
- **AC:** RC-33
- **Priority:** High
- **Steps:** Apply all migrations to an empty database and run `prisma migrate diff`.
- **Expected:** No drift for the new table.

---

## Summary: 0 PASS, 38 NOT STARTED (38 criteria), 15 test cases
