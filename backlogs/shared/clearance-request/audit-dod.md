# Clearance and Certificate Request (MP-60): Definition of Done Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-11-27 |
| **Audited** | Branch `feature/MP-60` at `135ff17` (pushed, working tree clean apart from an untracked `text.txt` that is not part of the work). The audit changed no source code. It added 4 unit tests to `clearance.service.spec.ts` (section 7) |
| **Compared with** | `origin/dev` at the time of the audit: 27 commits ahead, 0 behind, 27 files changed, 1 migration added |
| **Jira status** | In Progress (checked 2026-11-27). MP Sprint 5 |
| **How it was run** | A fresh Postgres 17 in Docker (`mp60_audit`): all 15 migrations applied from nothing, seeded with test accounts, and the built backend run against it. 75 API checks, 30 checks in headless Edge, statement logging for the query counts. Supabase was read in a read-only transaction. The container was removed afterwards |
| **Not audited** | The deployed site. Any browser other than Edge. A real printer. Screen readers. Anything on the shared database beyond reading (the migration is not there). Timing on Supabase. The Trainer, Registrar and Encoder steps (not built). The UAT scenarios (not run) |
| **Definition of Done used** | The Jira ticket has **no Acceptance Criteria and no Definition of Done section**. Used: the 40 criteria and 14 test cases in `acceptance.md`, the Sprint 5 migration safety comment on the ticket, and the project's usual checks |

## Verdict

**The MP-60 part (trainee form, progress, cancel, claim stub, shared module and migration) is ready for review into `dev`. It is not ready for `main`, and the ticket is not finished until it is merged and the migration is on the shared database.**

1. **What was built works.** 15 criteria pass, 12 are partial and 13 belong to MP-61 to MP-63. No criterion assigned to the trainee side failed outright.
2. **Engineering checks are clean.** Lint, type-check and build pass in both projects, 202 of 202 tests pass, `prisma validate` is clean and a trial merge into `dev` has no conflicts.
3. **The migration is not on Supabase (F-1).** The clearance pages cannot work against it until it is applied.
4. **Two rules are missing and should be decided before MP-61 starts (F-2, F-3):** a request stays open after its enrollment is withdrawn, and a submitted form changes when the trainee's record changes.
5. **Not merged.** There is no pull request yet and no one else has reviewed the code.

## 1. Engineering checks

| # | Check | Result |
|---|-------|--------|
| 1 | Backend `eslint` (whole project, no fix) | PASS, 0 problems |
| 2 | Backend `tsc --noEmit` and `nest build` | PASS |
| 3 | Backend `jest` | PASS, 202 of 202 (17 suites). 38 cover the new code |
| 4 | `prisma validate` | PASS |
| 5 | Frontend `eslint .` | PASS, 0 problems |
| 6 | Frontend `tsc -b` and `vite build` | PASS. Main bundle 689 kB, over the 500 kB warning (existing) |
| 7 | `npm audit`, backend | 3 high (`effect`) in production dependencies, 28 in total with development ones (25 moderate, 3 high). No `package.json` changed on this branch, so they are existing |
| 8 | `npm audit`, frontend | 0 in production dependencies, 9 moderate in development ones. Existing |
| 9 | New dependencies | None |
| 10 | Frontend tests | The frontend has no test script |
| 11 | Trial merge into `dev` | PASS, no conflicts |

## 2. Migration and database

| # | Check | Result |
|---|-------|--------|
| 12 | Migrations added compared with `origin/dev` | PASS. Exactly 1, `20261127_clearance_request_pipeline` |
| 13 | All 15 migrations applied to an empty database, in order | PASS (byte-order mark of `0_init` stripped in memory, TECH-02) |
| 14 | Database from migrations compared with `schema.prisma` | PASS for the new objects. The only differences are the known TECH-03 enum and trainer-column ones |
| 15 | Applied to a database that already has a request row | PASS. The row kept its values, its new status is empty, its control number is empty. An existing certificate type kept its description |
| 16 | Run a second time | Fails on the first statement ("type already exists"). Normal for a Prisma migration, which runs once |
| 17 | Foreign keys | PASS. 5 new keys, all "no action". An enrollment with clearance history cannot be deleted, the same as withdrawals. No endpoint deletes enrollments |
| 18 | Indexes | PASS. History by request and time, pipeline status, unique control number. The trainee list uses the existing enrollment index |
| 19 | Supabase: migrations | The 14 earlier ones are recorded as applied (`20260914_add_program_schedule` also has one unfinished record from an earlier attempt, existing). **The MP-60 migration is not applied** |
| 20 | Supabase: new objects | None present: 0 columns, no history table, no sequence, no enum. Nothing was written there |
| 21 | Supabase: clearance data | `request_form`, `clearance`, `clearance_certificate`, `clearance_approval`: 0 rows each. 14 enrollments are ENROLLED, 1 WITHDRAWN. All ENROLLED ones have a trainee login |
| 22 | Supabase: certificate types | 4 present (COC, COT, NC, OTHER). The migration will add none. Three descriptions are placeholders such as "COT Description"; this feature does not show them |
| 23 | Row level security | Off on the clearance tables, the same as the other application tables (existing, `to-be-discussed.md` item 10). The new history table follows suit |

## 3. Evidence from real use

None. The shared database has no clearance request, and cannot have one until the migration is applied.

## 4. Acceptance Criteria

Numbered as in `acceptance.md` (CL-1 to CL-40). "NOT MET (D-1)" means the criterion belongs to a later ticket.

| # | Criterion (short) | Status | Evidence |
|---|---|---|---|
| 1 | Each role opens its own page, with a sidebar link | PARTIAL | Trainee page and link work in the browser. Other roles have no page yet |
| 2 | 403 for other roles, 401 without a token | PARTIAL | All 5 trainee endpoints: 401 with no token, a forged token or no session header; 403 for Admin, Trainer, Registrar, Encoder. Those roles cannot open the page. Their own endpoints do not exist yet |
| 3 | A trainee sees only their own requests, same 403 for unknown ids | PASS | API: another trainee's request, an unknown id and a cancel by another trainee all 403 |
| 4 | Trainer sees own batches only | NOT MET (D-1) | MP-61 |
| 5 | Form filled in by the system, read-only | PASS | Browser and API. Date completed is the batch end date once COMPLETED (D-3) |
| 6 | One or more certificates, "Other" needs text | PASS | API, unit tests, browser |
| 7 | Purpose required with a length limit | PASS | Blank and 501 characters refused |
| 8 | Certification box required, time recorded | PASS | Unticked and the text "true" refused; `certified_at` set by the server |
| 9 | Control number, PENDING_VALIDATION, clearance PENDING, first history row, one transaction | PASS | A forced failure of the clearance, certificate or history insert saved nothing |
| 10 | Only own ENROLLED or COMPLETED enrollment | PASS | DROPPED 400, another trainee's and unknown 403; PENDING and WITHDRAWN by unit test |
| 11 | Second open request 409 | PASS | Also with ten submits at the same moment: one 201, nine 409 |
| 12 | Bad input 400 with a clear message, protected fields ignored | PARTIAL | Every case named in the criterion gives 400 and protected fields are ignored. **A NUL character in the purpose or the "Other" text gives 500** (F-9, existing cause) |
| 13 | List with filter and paging in the URL | PASS | Browser: filter and page survive a refresh, bad URL values fall back to defaults |
| 14 | Progress stages, current stage, who it waits for | PARTIAL | Stages and current stage work. At PROCESSED it says "Waiting for release" and does not name who (F-4) |
| 15 | History with who, when, remark; rejection reason | PASS | Browser, with a rejection written straight into the test database |
| 16 | Cancel only while PENDING_VALIDATION; race with the Trainer | PARTIAL | Wrong status 400, two cancels at once give one winner, a cancel that lost shows the message and refreshes. A real Trainer action needs MP-61 |
| 17 | New request after a rejection or cancel | PASS | After a cancel through the API. Rejected is not counted as open (unit test) |
| 18 | Claim stub when PROCESSED or RELEASED, printable | PASS | Browser and a one-page PDF. Statuses set in the test database. Office hours to be confirmed (F-5) |
| 19 to 22 | Trainer step | NOT MET (D-1) | MP-61 |
| 23 to 26 | Registrar step | NOT MET (D-1) | MP-62 |
| 27 to 30 | Encoder step | NOT MET (D-1) | MP-63 |
| 31 | The order of steps is enforced | PARTIAL | Trainee actions only |
| 32 | Every action writes one history row in the same transaction | PARTIAL | Submit and cancel, including rollback when the history insert fails |
| 33 | History is append-only | PASS | PUT and DELETE give 404. Convention only (F-7) |
| 34 | Each role reads the history with name and role | PARTIAL | Trainee only |
| 35 | Two actors at once: one wins | PARTIAL | Two trainee cancels. Needs a second role |
| 36 | One additive migration, fresh and existing data | PASS | Section 2. Not applied to Supabase |
| 37 | Control numbers unique under load | PASS | 40 trainees at once: 40 saved, 40 different numbers |
| 38 | No `password_hash`, only needed fields | PARTIAL | Trainee responses contain no password, parent, beneficiary, insurance, birth date or email data |
| 39 | Loading, empty, error states; URL state | PARTIAL | All seen in the browser for the trainee pages |
| 40 | Lint, types, build clean; tests for every step; withdrawal tests pass | PARTIAL | Checks clean and withdrawal tests pass. Tests cover submit, cancel, duplicates and validation; the other steps do not exist |

Totals: **15 PASS, 12 PARTIAL (1, 2, 12, 14, 16, 31, 32, 34, 35, 38, 39, 40), 13 NOT MET by decision (4, 19 to 30)**. That is 40.

### 4a. Test cases

| TC | Status | Evidence |
|----|--------|----------|
| TC-01 Submit | PASS | API and browser |
| TC-02 Form validation | PASS | API and browser |
| TC-03 Duplicate open request | PASS | 409, one request |
| TC-04 Follow the request | PARTIAL | Stages checked with statuses set in the test database; F-4 |
| TC-05 to TC-10 Trainer, Registrar, Encoder | NOT MET (D-1) | MP-61 to MP-63 |
| TC-11 Wrong status and order | NOT MET (D-1) | Needs the other roles' endpoints |
| TC-12 Cancel rules and race | PARTIAL | No Trainer endpoint to race against |
| TC-13 Roles and scope | PARTIAL | Trainee endpoints only |
| TC-14 Logs and two registrars | NOT MET (D-1) | MP-62 and MP-63 |

Totals: 3 PASS, 3 PARTIAL, 8 NOT MET by decision. That is 14.

## 5. Security, integrity and performance

| # | Check | Result |
|---|-------|--------|
| 1 | Sign-in and role checks on every endpoint | PASS (criterion 2) |
| 2 | Oversized and malformed input: 300 kB body, 10,000 certificates, broken JSON, wrong types, page and limit out of range | PASS (413 or 400), nothing saved |
| 3 | `.env` or secrets committed | PASS, none tracked, none in the diff |
| 4 | Tokens, passwords or contact numbers in the server log | PASS, no match. The log does hold the expected errors of the 413, NUL and forced-failure tests |
| 5 | All or nothing | PASS (criterion 9). A failed cancel also changes nothing |
| 6 | Row lock on submit | PASS. Ten at once for one enrollment: one wins. Other trainees are not blocked |
| 7 | Query counts | PASS. List: 13 statements for 1 row and for 50. Detail: 20. Form options: 11. Each includes the sign-in check |
| 8 | Load | 40 submits at once took about 0.5 s on a local database. This is not Supabase timing |
| 9 | Values defined in both backend and frontend | Purpose limit 500, "Other" limit 100, page size 10, status list, open statuses, certificate list (F-8) |

## 6. Browser checks (headless Edge)

Seen: sidebar link, filled-in form, validation messages that clear on a change, submit, a double click sending one request, progress, cancel, a cancel that lost the race, rejection with its reason, claim stub, print showing only the stub on one page, filter and paging with refresh, page past the end, loading, error and "Try again", not found, other roles and signed-out visitors kept out, a phone-width view, no page errors.

## 7. Tests run (full inventory)

| Group | Count | What it checks |
|-------|-------|----------------|
| `clearance.service.spec.ts` | 24 | Submit (both allowed statuses, certificates, "Other" text, ownership, wrong status, duplicate, row lock, missing certificate types), list (scope, filter, defaults), detail (scope, date completed, 403), cancel (scope, success, lost race, other's request), form options |
| `create-clearance-request.dto.spec.ts` | 14 | One valid form and 13 refused ones |
| Whole backend suite | 202 of 202 | 17 suites |
| Coverage of the new code | | Service 100% of lines, form DTO 100%. **Controller, module files and the query DTO: 0%** (F-6) |
| Break-it check | 14 of 14 caught | First run caught 10 of 14. Missed: removing the row lock, opening or cancelling another trainee's request (the database mock ignored the filter), changing the default page size. 4 tests were added and all 14 were then caught |
| API script 1 | 38 of 38 | Submit, validation, ownership, duplicates, concurrency, list, cancel, claim stub data, roles |
| API script 2 | 33 of 33 | Sign-in, bad input, rollback, ignored fields, privacy, delete protection, rows without a status |
| API script 3 | 4 of 4 | 40 at once, unique numbers, ten at once, query counts. The query count check failed once because statement logging was not yet on; it passed when the script waited |
| Observations (not pass or fail) | | NUL character: 500 on both text fields, and 500 on the existing withdrawal submit. After a batch change the submitted form shows the new batch. A withdrawn enrollment leaves its request open |
| Browser script 1 | 11 of 11 | Main trainee flow and printing |
| Browser script 2 | 19 of 19 | Roles, URL state, states, edge cases |
| Manual checks by the owner | None yet | UAT-MP-60-1 to 4 are NOT RUN |

### Where the test data lived and what was cleaned up

| Item | State |
|------|-------|
| Database | Throwaway container `mp60_audit` (databases `mp60`, `mp60b`), removed with `docker rm -f -v`. No volume left behind |
| Servers | Backend and Vite dev server started for the audit, all stopped |
| Scripts, test accounts and passwords | In a temporary folder outside the repository. A search of the repository finds none |
| Shared database | Read only. 0 test accounts, 0 clearance rows |
| Other containers and volumes | Left alone |

## 8. Definition of Done items

The ticket has no list of its own. The usual items:

| Item | Status |
|------|--------|
| Acceptance criteria met | PARTIAL (section 4) |
| Unit tests pass and cover the new code | PARTIAL (F-6) |
| Lint, type-check and build clean | DONE |
| Migration tested only on a throwaway database (Sprint 5 rule) | DONE |
| Migration applied to the shared database | NOT DONE (F-1) |
| Browser check | DONE for the trainee pages in headless Edge. Owner check not done |
| Code reviewed and merged | NOT DONE. No pull request yet |
| UAT | NOT DONE |
| Backlog and push log updated | DONE with this audit |
| Jira updated | NOT DONE. Not changed by this audit |

## 9. Decisions that change the ticket

| ID | Decision |
|----|----------|
| D-1 | The Trainer, Registrar and Encoder steps are built in MP-61 to MP-63, as the ticket's own table says. MP-60 delivers the trainee side, the shared module and the schema. Criteria 4 and 19 to 30 belong to those tickets |
| D-2 | Control numbers come from one database sequence, not `ctrl_num_seq`, which counts per program and year and would repeat `MCCTEST00` numbers. A failed submit leaves a gap |
| D-3 | "Date completed" is the batch end date once the enrollment is COMPLETED. The database has no completion date |
| D-4 | Cancelling leaves the clearance status as PENDING. The status table only covers submit, validate and reject |

D-2 to D-4 were made while building and need the product owner's agreement.

## 10. Findings

| ID | Finding | Severity | Suggested action |
|----|---------|----------|------------------|
| F-1 | The migration is not on Supabase. The clearance endpoints fail there until it is applied | Medium | Apply it with the project leader's approval before or with the release |
| F-2 | A request stays open when its enrollment is withdrawn (program change, approved withdrawal) or dropped. The trainee can cancel only while PENDING_VALIDATION, the enrollment leaves the form options, and no rule stops the later steps | Medium | Decide before MP-61 (`to-be-discussed.md` item 18) |
| F-3 | The form is read live from the trainee, enrollment and batch. A batch change or a profile edit changes what a submitted or released request and its claim stub show | Medium | Decide whether to keep a copy at submit (item 19) |
| F-4 | At PROCESSED the page says "Waiting for release" and does not say the Encoder will release it | Low | Change the wording |
| F-5 | The claim stub hours "Monday - Friday 8:00 AM - 8:30 PM" were read from a blurry scan of the paper form | Low | Confirm against the paper |
| F-6 | No unit tests for the controller or the list query DTO. No frontend tests | Low | Add controller and query tests |
| F-7 | History is append-only by convention only. The database allows edits | Low | Same as the withdrawal history |
| F-8 | Limits, page size, status and certificate lists are written in both the backend and the frontend | Low | Keep in step when one changes |
| F-9 | A NUL character in free text gives a 500. Also on the withdrawal submit, so not new | Low, existing | TECH-07 |
| F-10 | The ticket has no Acceptance Criteria or Definition of Done section. The backlog still says "Nothing needs to be migrated" and describes `ctrl_num_seq` (the build notes correct it) | Low | Add the criteria to Jira, tidy the backlog text |
| F-11 | The Registrar and Encoder "Clearance" sidebar links point to pages that do not exist (`/registrar/clearance`, `/encoder/clearance`) | Low, existing | MP-62 and MP-63 should point them to the new pages |
| F-12 | On a phone the floating sidebar button covers page content, seen over the claim stub | Low, existing | Shared layout fix |
| F-13 | Four weak unit tests found by the break-it check | Fixed in this audit | None |

## 11. Questions for the product owner

1. **An open request whose enrollment is withdrawn or dropped (F-2).** Options: cancel it automatically; block the withdrawal or program change while a request is open; or let it continue and show a warning to the validators.
2. **The form after submit (F-3).** Options: keep a copy of the trainee information at submit; or keep reading it live.
3. **Claim stub hours (F-5).** 8:30 PM or 5:30 PM?
4. **D-2 to D-4.** Are the control number format, the completion date and the clearance status after a cancel acceptable?

## 12. Release steps still open

1. Open a pull request `feature/MP-60` → `dev` and have it reviewed.
2. Apply `20261127_clearance_request_pipeline` to Supabase (`prisma migrate deploy`), with the project leader's approval.
3. Run the UAT scenarios.
4. Update the Jira ticket.
