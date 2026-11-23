# Trainer: Graduating List (Trainees Cleared, With Their Clearance Stage)

| Field | Value |
|-------|-------|
| **Jira** | MP-70 |
| **Type** | Feature (new Trainer page, read-only endpoints, PDF). **No new tables, no migration** |
| **Status** | NOT STARTED |
| **Assignee** | Chelsea Cllj (Jira default, reassign if needed) |
| **Route** | `/trainer/graduating` (the sidebar link exists, the page does not) |
| **Backend** | `/api/trainer/graduating` (new) |
| **Depends on** | The clearance and certificate request: MP-60 (form and statuses), MP-61 (Trainer), MP-62 (Registrar), MP-63 (Encoder). Also Trainee Information (MP-50) and the PDF builder of Trainee Records (MP-68) |
| **Related** | Trainer Dashboard (MP-65) may show a count card. Certificate generation (MP-64) |
| **Decided 2026-11-23** | A trainee is **graduating when the Registrar has validated** (cleared by the Trainer and the Registrar). The list is **per batch, the Trainer's own batches only**, and shows **where each trainee is in the clearance**. The Trainer can **print and export a PDF** with name, system ID, batch, program and date cleared |
| **TBA (to be announced)** | Three things are not decided: whether the **enrollment status becomes COMPLETED** on release, the **paper size and official header or logo** of the PDF (same as MP-68), and whether the **Trainer Dashboard shows a count card**. See the Open Questions |
| **Added** | 2026-11-23 |

---

## User Story

**As** a trainer,
**I want** a list per batch of the trainees who finished their clearance, and where every other trainee stands in the clearance,
**so that** I know who is graduating and who is still missing a step, and I can print the list.

## What "Graduating List" Means Here

- The repo has the sidebar link `/trainer/graduating` and the old placeholder backlog lists it as "not started". **No document defines it.** This ticket sets the definition, from the project leader on 2026-11-23: the graduating list is **the trainees who finished their clearance**.
- It is **made from the clearance and certificate request** (MP-60 to MP-64). Nothing is typed in and the Trainer confirms nothing. The Trainer's own step is the clearance validation (MP-61), which already exists as a ticket.
- Because it only reads, the page changes no data and needs no migration.

## The Clearance Statuses It Reads (from MP-60)

```
PENDING_VALIDATION --(Trainer)--> TRAINER_VALIDATED --(Registrar)--> REGISTRAR_VALIDATED --(Encoder)--> PROCESSED --(Encoder)--> RELEASED
        '-- Trainer rejects --> REJECTED          '-- Registrar rejects --> REJECTED
        '-- trainee cancels (while still PENDING_VALIDATION) --> CANCELLED
```

| Stage shown on the list | Status of the trainee's latest request | Graduating? |
|---|---|---|
| No request yet | The trainee has no request in this batch | No |
| Waiting for the Trainer | `PENDING_VALIDATION` | No |
| Waiting for the Registrar | `TRAINER_VALIDATED` | No |
| Rejected | `REJECTED` (shows who rejected and the reason) | No |
| **Graduating, waiting for the Encoder** | `REGISTRAR_VALIDATED` | **Yes** |
| **Graduating, processed** (shows the scheduled release date) | `PROCESSED` | **Yes** |
| **Graduating, released** | `RELEASED` | **Yes** |
| (not shown as a stage) | `CANCELLED`, treated as no request | No |

- The clearance form's own status `clearance.clearance_status` becomes `CLEARED` when the Registrar validates (MP-60). The list uses the request status above, which carries the same meaning plus the next stage.
- **Date cleared** = the date the Registrar validated (`registrar_validated_at`, MP-60 schema proposal).
- The clearance tables are **empty today**. Until MP-60 to MP-62 are built, every trainee shows "No request yet" and nobody is graduating.

## What the Trainer Can Do

Own batches only. A batch of any status can be viewed. The page is read-only.

1. **Pick a batch.** Counts at the top: graduating, waiting for the Trainer, waiting for the Registrar, rejected, no request yet.
2. **The list.** Every `ENROLLED` or `COMPLETED` trainee of the batch with name, system ID and the clearance stage above. For a graduating trainee: the date cleared and the next stage.
3. **Filter and search.** Filter by stage (default **Graduating**) and search by name or system ID. Both and the page are kept in the URL.
4. **Open.** A link to the trainee's information (`/trainer/trainees/:id`, MP-50). For "Waiting for the Trainer", a link to the Trainer clearance page (MP-61).
5. **Print and Export PDF.** The graduating trainees of the batch: row number, name (last name first), system ID, batch, program and date cleared. Header: MCCTEST, program, batch, start and end date, batch status, trainer, date and time generated, number of graduating trainees. Header row repeats on each page, page x of y in the footer.

## Rules

- **Who.** Only `TRAINER`, only batches where the logged-in user is the batch trainer. Another trainer's batch returns 404. The trainer is never taken from a query, body or path value.
- **Latest request decides.** A trainee can have more than one request over time (for example rejected, then sent again). The **latest** request that is not `CANCELLED` decides the stage. An earlier rejection does not count once a newer request exists.
- **Graduating** = the stage is one of the three "Graduating" rows. It does not depend on the Encoder's processing or release.
- **Who is listed.** `ENROLLED` and `COMPLETED` enrollments. `WITHDRAWN`, `DROPPED` and `PENDING` enrollments are not listed.
- **Read only.** No button on the page changes data. No new tables and no migration.
- **PDF content.** Only name, system ID, batch, program and date cleared (and the header). No contact number, address or other personal data. Because no contact number leaves the system, exports are **not logged** (assumed, Open Question 5).
- **Empty.** A batch with no graduating trainee cannot be exported. The button is disabled and the API returns 409.
- **Cost.** A fixed number of queries whatever the number of trainees.
- **File name.** Built by the server from the program, batch and date, never taken raw from user text.
- **Time zone.** Dates and "generated" time are in Asia/Manila.

## Endpoints (all `TRAINER` only, `JwtAuthGuard` and `RolesGuard`)

| Method and path | What |
|---|---|
| `GET /api/trainer/graduating/batches` | My batches (not cancelled) with the counts per stage |
| `GET /api/trainer/graduating/batches/:batchId?stage=&search=&page=` | The list of one batch with the stage of each trainee, paged |
| `GET /api/trainer/graduating/batches/:batchId/list.pdf` | The PDF of the graduating trainees of the batch |

## Open Questions (TBA unless answered)

| # | Question | Answer or assumption |
|---|---|---|
| 1 | At which point does a trainee count as finished? | **Answered 2026-11-23:** when the Registrar validates (cleared by the Trainer and the Registrar) |
| 2 | What does the list cover? | **Answered 2026-11-23:** per batch, the Trainer's own batches, with names and where each trainee is in the clearance. Not chosen: a program view, a school-wide list |
| 3 | Print or export? | **Answered 2026-11-23:** yes, print and PDF with name, system ID, batch, program and date cleared |
| 4 | Does the enrollment status become `COMPLETED` when the clearance is released? | **TBA** (also open in MP-63 and MP-66). Until decided the list reads the clearance, not the enrollment status |
| 5 | Is each export logged (as in MP-68)? | **Assumed:** no, because the PDF has no contact number. **TBA** if MCCTEST wants it |
| 6 | Paper size and orientation, official header or logo? | **TBA** (same as MP-68). Placeholder header until then |
| 7 | Does the Trainer Dashboard (MP-65) show a count card with a link? | **TBA.** Assumed a small card "Graduating: n" with a link |
| 8 | Should the list be available to the Registrar, Encoder and Admin? | **Assumed:** not in this ticket. A school-wide list is a separate idea |

## Scope

- **Backend:** a trainer graduating module (controller, service, DTOs) under `/api/trainer/graduating` that reads the clearance requests and enrollments, with the Trainer ownership rule from MP-50; the PDF through the builder of MP-68.
- **Frontend:** the Graduating List page (batch picker, counts, stage filter, search, list, Print and Export PDF), kept in the URL.
- **Tests:** unit tests for the service (stage rules, latest request, ownership, empty), the DTOs, the controller (role, guards, the logged-in user passed on) and the PDF content.

## Out of Scope

A school-wide list for the Registrar, Encoder and Admin, a program view across batches, any action that changes data (confirming graduates, approving), the clearance steps (MP-60 to MP-63), and certificates (MP-64).

---

## Acceptance Criteria

### Access and security

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GL-1 | Only `TRAINER` can open `/trainer/graduating`. Other roles go to `/403` | NOT STARTED | `ProtectedRoute` |
| GL-2 | Every endpoint needs a login (401) and the `TRAINER` role (403 for Admin, Registrar, Encoder, Trainee) | NOT STARTED | Guards |
| GL-3 | A trainer sees and exports only batches where they are the batch trainer. Another trainer's batch returns 404 on the list and on the PDF | NOT STARTED | Same rule as MP-50 |
| GL-4 | The trainer comes from the login. No query, body or path value picks a trainer | NOT STARTED | `@CurrentUser()` |
| GL-5 | Responses have no password hash, email, contact number, address or birth date. The PDF has only the agreed fields | NOT STARTED | Typed response |
| GL-6 | Input is validated: bad ids, a stage outside the list, a search or page that is too long, and extra fields | NOT STARTED | DTOs, `whitelist` |

### The list and the stages

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GL-7 | The page lists my batches (not cancelled) and, for the chosen batch, the counts of graduating, waiting for the Trainer, waiting for the Registrar, rejected and no request yet. The counts add up to the number of listed trainees | NOT STARTED | |
| GL-8 | Every `ENROLLED` and `COMPLETED` trainee of the batch is listed with name, system ID and the clearance stage. `WITHDRAWN`, `DROPPED` and `PENDING` enrollments are not listed | NOT STARTED | |
| GL-9 | A trainee with no request shows "No request yet". `PENDING_VALIDATION` shows "Waiting for the Trainer". `TRAINER_VALIDATED` shows "Waiting for the Registrar" | NOT STARTED | |
| GL-10 | `REGISTRAR_VALIDATED`, `PROCESSED` and `RELEASED` all count as **Graduating**, with the next stage shown (waiting for the Encoder, processed with the scheduled release date, released) | NOT STARTED | Decided: finished at the Registrar |
| GL-11 | A rejected request shows "Rejected", who rejected (Trainer or Registrar) and the reason | NOT STARTED | |
| GL-12 | The latest request that is not cancelled decides the stage. A trainee rejected and then sent a new request is judged by the new request. A cancelled request is treated as no request | NOT STARTED | |
| GL-13 | A graduating trainee shows the date cleared, which is the date the Registrar validated | NOT STARTED | |
| GL-14 | The stage filter (default Graduating) and the search by name or system ID work together. The batch, stage, search and page are kept in the URL and survive a refresh | NOT STARTED | |
| GL-15 | The list is sorted by last name, then first name, and paged. The total is correct | NOT STARTED | |
| GL-16 | Each row links to the trainee's information page. A "Waiting for the Trainer" row links to the Trainer clearance page | NOT STARTED | MP-50, MP-61 |
| GL-17 | Before the clearance tables have any row, every trainee shows "No request yet", nobody is graduating, and there is no error | NOT STARTED | Empty today |
| GL-18 | A trainer with no batch, and a batch with no trainee, show a friendly empty state and the API returns 200 | NOT STARTED | |
| GL-19 | The page changes no data. No button on it writes anything, and the migration list has no new migration for this ticket | NOT STARTED | Read only |

### Print and PDF

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GL-20 | Export PDF downloads a real PDF (`application/pdf`) of the graduating trainees of the batch, sent as an attachment | NOT STARTED | Reuses the MP-68 builder |
| GL-21 | The PDF has row number, name (last name first), system ID, batch, program and date cleared, and a header with MCCTEST, program, batch, dates, batch status, trainer, date and time generated and the count | NOT STARTED | Layout TBA, placeholder |
| GL-22 | The header row repeats on every page and the footer shows page x of y. Names with accents and the letter n with tilde print correctly and long names wrap | NOT STARTED | |
| GL-23 | The PDF lists graduating trainees only, whatever the stage filter on screen. Trainees still in the clearance are never on it | NOT STARTED | |
| GL-24 | A batch with no graduating trainee cannot be exported. The button is disabled and the API returns 409 | NOT STARTED | |
| GL-25 | The file name is built by the server from the program, batch and date, with unsafe characters removed | NOT STARTED | |
| GL-26 | Print opens the browser print with a clean layout of the same list, with no menus, buttons or sidebar | NOT STARTED | Print stylesheet |
| GL-27 | The PDF is not stored on the server or in storage. It is built per request and streamed. The export endpoint is rate limited | NOT STARTED | `ThrottlerGuard` |

### Integrity, performance and frontend

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| GL-28 | The counts, the list and the PDF run a fixed number of queries whatever the number of trainees | NOT STARTED | Statement logging. Local timing is not Supabase timing |
| GL-29 | The stage of every trainee matches the clearance pages: the same request shows the same status on the Trainer clearance page (MP-61) and here | NOT STARTED | One source of truth |
| GL-30 | Empty, loading and error states exist. A failed export shows an error with Retry and never opens a blank tab | NOT STARTED | |
| GL-31 | The page works at phone width and by keyboard, and the stage is shown with a label as well as a color | NOT STARTED | |
| GL-32 | Constants (stage names, page size) are in one place on each side, and the stage names match the clearance statuses of MP-60 | NOT STARTED | Config duplication check |

---

## Test Cases

### TC-01: Access
- **AC:** GL-1, GL-2, GL-4
- **Priority:** Critical
- **Steps:** Open the page as Admin, Registrar, Encoder and Trainee. Call each endpoint, the PDF included, with those tokens and with none. Send `?trainer_id=<other>`.
- **Expected:** Page goes to `/403`. API returns 403, and 401 with no token. The query value is ignored.

### TC-02: Ownership
- **AC:** GL-3, GL-5
- **Priority:** Critical
- **Precondition:** Two trainers with a batch each.
- **Steps:** As trainer A, open the list and PDF for A's and B's batch.
- **Expected:** A's batch works. B's batch returns 404 for the list and the PDF. No personal data fields in the responses.

### TC-03: Every stage
- **AC:** GL-7 to GL-13
- **Priority:** Critical
- **Precondition:** A batch of 8 trainees, one in each state: no request, `PENDING_VALIDATION`, `TRAINER_VALIDATED`, `REJECTED` (by the Registrar, with a reason), `REGISTRAR_VALIDATED`, `PROCESSED` (with a release date), `RELEASED`, and one withdrawn.
- **Steps:** Open the batch and clear the stage filter.
- **Expected:** Seven trainees are listed, the withdrawn one is not. Each shows the stage in the table above. The three cleared trainees are Graduating with the date cleared and the next stage. The rejected one shows who and why. The counts add up to seven.

### TC-04: Latest request wins
- **AC:** GL-12
- **Priority:** High
- **Precondition:** A trainee rejected by the Trainer who then sent a new request that is `TRAINER_VALIDATED`. Another trainee who cancelled their only request.
- **Steps:** Open the list.
- **Expected:** The first shows "Waiting for the Registrar", not Rejected. The second shows "No request yet".

### TC-05: Filter, search and URL
- **AC:** GL-14, GL-15
- **Priority:** Medium
- **Steps:** Use the default Graduating filter, then All. Search by a name and by a system ID. Refresh. Page through a batch of 30.
- **Expected:** Default shows only graduating trainees. The search and the filter combine. The URL keeps batch, stage, search and page. Sorted by last name and the total is right.

### TC-06: Links
- **AC:** GL-16
- **Priority:** Medium
- **Steps:** Click a trainee name, then the link on a "Waiting for the Trainer" row.
- **Expected:** The trainee's information page opens. The Trainer clearance page opens on that request. The statuses match (GL-29).

### TC-07: Nothing built yet
- **AC:** GL-17, GL-18, GL-19
- **Priority:** High
- **Precondition:** The clearance tables are empty.
- **Steps:** Open a batch. Open as a trainer with no batch. Check the migrations folder.
- **Expected:** Every trainee shows "No request yet", the graduating count is 0, no error. The trainer with no batch sees an empty state with a 200. No new migration exists for this ticket.

### TC-08: Batch PDF
- **AC:** GL-20 to GL-23, GL-25
- **Priority:** Critical
- **Precondition:** A batch with 35 graduating trainees and 10 still in the clearance, including a name with accents and the letter n with tilde, and a batch named with a slash and a quote.
- **Steps:** Set the stage filter to All and export. Extract the text.
- **Expected:** A real PDF with only the 35 graduating trainees, header repeated on page 2, page x of y, names printed correctly, the file name cleaned. None of the 10 appears.

### TC-09: Empty export and print
- **AC:** GL-24, GL-26, GL-27
- **Priority:** Medium
- **Steps:** Try to export a batch with no graduating trainee. Print the list. Call the PDF endpoint above the limit. Check the server storage after an export.
- **Expected:** The button is disabled and the API returns 409. The print layout is clean. 429 after the limit. No file was stored.

### TC-10: Query count and agreement with the clearance
- **AC:** GL-28, GL-29
- **Priority:** High
- **Steps:** Statement logging on. Load a batch of 5 and a batch of 30. Move one request through the pipeline in MP-61 and MP-62 and reload.
- **Expected:** The same number of queries. The stage changes on this page right after the Registrar validates, and matches the clearance pages.

### TC-11: Screen behaviour
- **AC:** GL-30, GL-31, GL-32
- **Priority:** Medium
- **Steps:** Stop the API and press Export. Throttle the network. Open at 375 px wide and tab through the list.
- **Expected:** Loading, then an error with Retry, no blank tab. The list works on a phone and by keyboard, and stages show a label as well as a color.

---

## Summary: 0 PASS, 32 NOT STARTED (32 criteria), 11 test cases
