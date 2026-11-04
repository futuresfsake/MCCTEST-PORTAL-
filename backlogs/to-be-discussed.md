# To Be Discussed

Items that need a team decision before they become a ticket or a backlog.

## 1. Where to store trainee profile photos (MP-41)

| Field | Value |
|-------|-------|
| **Related** | MP-41 (Trainee Profile Page), SEC-02 (`multer` advisory) |
| **Added** | 2026-11-04 |
| **Status** | PROPOSED, NOT DECIDED |

**Question:** If trainees upload their own photo, do we need another database for the images?

**Proposal:** No second database. The files go to object storage and the database keeps only the path or URL.

- **Storage:** a `trainee-photos` bucket in Supabase Storage, in the same Supabase project.
- **Database:** the existing `users.avatar_url` column holds the file path or URL. No schema change expected. Check first that nothing else already writes to it.
- **Why not the database:** storing image bytes in Postgres makes backups and queries heavier.

**To decide**

| # | Decision | Suggestion |
|---|----------|------------|
| 1 | Private or public bucket | **OPEN GAP.** Suggestion: private with short-lived signed URLs, so links cannot be guessed |
| 2 | File limits | JPG or PNG, up to 2 MB, resized on upload (for example 400x400) |
| 3 | Upload path | Browser sends the file to the NestJS backend. The backend checks role, type and size, then stores it. No direct browser upload to Supabase |
| 4 | Who can view a photo | **Decided 2026-11-04:** everyone who is logged in (all roles) |
| 5 | Replacing a photo | Delete or overwrite the old file so old photos do not pile up |
| 6 | Storage size | Supabase free tier allows about 1 GB. Enough if photos are compressed. Confirm the plan |
| 7 | Upload security | Fix the `multer` denial-of-service advisory (SEC-02, `technical/multer-dos-advisory/`) before adding a new upload route |
| 8 | Other uses | **OPEN GAP.** Should the photo appear on the ID card or in the registrar's enrollment view? |
| 9 | Email | **Decided 2026-11-04:** login credentials are fixed. The trainee can change only the password. The email is read-only |

**Outcome:** once decided, update the MP-41 backlog and ticket (the ticket already carries these points as open decisions).

---

## 2. Restock reminder: note only, or also a quantity to order (MP-59)

| Field | Value |
|-------|-------|
| **Related** | MP-59 (Uniform Restock Reminder), MP-53 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Is an optional note enough on the reminder the registrar sends to the admin, or should the registrar also enter how many uniforms to order?

**Current assumption:** note only. No quantity field in the MP-59 criteria yet.

**To answer:** note only, or add a quantity field (and whether it is required).

---

## 3. Restock reminder: one per program and size per 24 hours (MP-59)

| Field | Value |
|-------|-------|
| **Related** | MP-59 (Uniform Restock Reminder), MP-52 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Is one reminder per program and size per 24 hours the right limit, so the admin's bell is not flooded?

**Current assumption:** yes, 24 hours. Later reminders inside the window are refused with a clear message.

**To answer:** confirm 24 hours, or choose another window (or no limit).

---

## 4. Enrollment bug MP-58: who reproduces it, and on which environment

| Field | Value |
|-------|-------|
| **Related** | MP-58 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Decided 2026-11-04:** showing the stock left on the enrollment form is **included in MP-58**, not split out.

**Still open:** who reproduces the missing deduction and on which environment (dev, staging or main), and whether the deployed backend is on the same commit as `main`. The root cause stays unconfirmed until this is done.

---

## 5. Trainee profile photo (MP-41): open gaps to answer before building

| Field | Value |
|-------|-------|
| **Related** | MP-41, item 1 above (storage design), SEC-02 (`multer` advisory) |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAPS (4) |

| Gap | Question | Current assumption | Answer |
|-----|----------|--------------------|--------|
| G-41-1 | Is the photo bucket private with signed URLs, or public? "Everyone logged in can see it" fits either one | Private with short-lived signed URLs (suggested, not decided) | OPEN |
| G-41-2 | Does the photo also appear on the ID card or in the registrar's enrollment view? | Not included in MP-41 | OPEN |
| G-41-3 | Is the free Supabase plan (about 1 GB of files) enough? | Enough if photos are resized and compressed (about 400x400, up to 2 MB) | OPEN |
| G-41-4 | Is the `multer` fix (SEC-02) a blocker that must be done before MP-41 is built? | Yes, suggested. The photo upload adds a new upload route | OPEN |

**Already decided (not a gap):** everyone who is logged in can see the photo. The email is read-only for the trainee, because login credentials are fixed and only the password can be changed.

---

## 6. MP-42 admin edit trainee: open gaps

| Field | Value |
|-------|-------|
| **Related** | MP-42 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAPS (2) |

| Gap | Question | Current assumption | Answer |
|-----|----------|--------------------|--------|
| G-42-1 | Who takes MP-42? The ticket has no assignee | Unassigned | OPEN |
| G-42-2 | All programs have the same payment, so is the "record a new payment instead" option on a program change still needed? | Kept as an option | OPEN |

**Decided 2026-11-04:** on a program change, payment carries over by default, because all programs have the same payment.

---

## 7. Sprint placement for MP-41, MP-42, MP-43 and MP-59

| Field | Value |
|-------|-------|
| **Related** | MP-41, MP-42, MP-43, MP-59 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Only MP-53 and MP-58 are in MP Sprint 4. Do MP-41, MP-42, MP-43 and MP-59 stay in the backlog, or move into Sprint 4?

**Current assumption:** they stay in the backlog. MP-59 also depends on MP-52 and MP-54.

---

## 8. MP-53: can a PENDING enrollment receive a uniform

| Field | Value |
|-------|-------|
| **Related** | MP-53 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Can an enrollment in `PENDING` status receive a uniform, or only `ENROLLED` ones?

**Current assumption:** only `ENROLLED`. Trainees are accepted and enrolled right away, so `PENDING` is rare. Withdrawn, dropped and completed are shown greyed out as Inactive.

---

## 9. Withdrawal pipeline: what happens to the trainee's account after approval (MP-49)

| Field | Value |
|-------|-------|
| **Related** | MP-49 (Admin final sign-off), MP-45 (schema), MP-42 (program change creates a new enrollment), MP-57 (Encoder notifications) |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** When the admin approves a withdrawal, the enrollment becomes `WITHDRAWN`. Should the trainee also be blocked from logging in?

**Current plan:** option A. MP-49 sets only the enrollment to `WITHDRAWN`, leaves the account as is, and carries a TODO in the service ("Account deactivation after withdrawal, decision pending").

**Options**

| # | Option | Effect | Trade-off |
|---|--------|--------|-----------|
| A | Enrollment only (current plan) | A withdrawn trainee can still log in and sees a WITHDRAWN status | Simplest. Keeps their history viewable |
| B | Deactivate the account on approval | Set `users.is_active = false` in the same transaction as the sign-off. The login guard then rejects them | Could lock out a trainee who just shifted programs (MP-42), because one trainee can hold several enrollments |
| C | Deactivate only if no other active enrollment remains | Same as B, but only when the trainee has no other `PENDING` or `ENROLLED` enrollment | Safest if deactivation is wanted. Slightly more logic |

**Facts checked in the code**
- `users.is_active` already exists (`Boolean @default(true)`), so B and C need no schema change.
- Login already rejects inactive accounts: `auth.service.ts` checks `is_active` at login and `jwt.strategy.ts` checks it on every request, so B and C take effect immediately, including for already-issued tokens.

**To answer:** A, B or C. Suggestion: C if deactivation is wanted, otherwise stay on A. Decide before MP-49 is built, then update the MP-49 ticket.

---

## 10. Supabase row level security is off on every table

| Field | Value |
|-------|-------|
| **Related** | Withdrawal pre-staging audit A-2 (`shared/withdrawal/audit-pre-staging.md`). Affects all 38 `public` tables, including `users` |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP, needs confirming |

**Question:** Row level security (RLS) is off on all 38 tables in `public`. Is the Supabase REST API able to read or write them?

**What is known:** the Supabase API roles (`anon`, `authenticated`) hold only `REFERENCES`, `TRIGGER` and `TRUNCATE` on the tables checked (the two new withdrawal tables, `users` and `official_receipts`), and no `SELECT`, `INSERT`, `UPDATE` or `DELETE`. So the REST API should not be able to read or write them. This came from the grants, **not from calling the API with the anon key**.

**To answer:** call the REST API with the anon key and confirm it returns nothing. If it does, turn RLS on for every table with no policies (the backend connects as the database owner and keeps working). Also find out why `anon` and `authenticated` hold `TRUNCATE`.

---

## 11. Security headers and the `X-Powered-By` header

| Field | Value |
|-------|-------|
| **Related** | Withdrawal pre-staging audit A-1. App-wide, not caused by the withdrawal work |
| **Added** | 2026-11-04 |
| **Status** | **RESOLVED 2026-11-04** (PR #75, on `dev`) |

**Question:** Do we add `helmet` and turn off `X-Powered-By` in `main.ts`?

**Current:** the server replies `X-Powered-By: Express` and sends no `X-Content-Type-Options`, frame protection or HSTS.

**Resolved:** `helmet` was added in `main.ts` (PR #75). `X-Powered-By` is gone and the standard security headers are sent. CORS and a cross-origin login were checked on real responses. A real login on the app is still worth doing once after it reaches `staging`. See `shared/withdrawal/audit-dev-retest.md`.

---

## 12. Withdrawal tests that are not in the repo

| Field | Value |
|-------|-------|
| **Related** | Withdrawal pre-staging audit A-4 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Do we keep the real-database tests and add frontend tests?

**Current:** the 30-check HTTP run, the 60-race test and the security run were temporary scripts. The controller, DTO validation and database behaviour have no test in the repo. The frontend has no test runner, so the stage logic (`withdrawal-pipeline.ts`, 10 cases) is also unprotected.

**To answer:** add an opt-in integration spec that needs a Postgres server, and add Vitest to the frontend. Decide whether CI can run a Postgres.

---

## 13. Withdrawal: what the trainee may see about staff

| Field | Value |
|-------|-------|
| **Related** | Withdrawal pre-staging audit A-8, MP-46 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Should the trainee see the names of the trainer, registrar and admin who acted, and the remarks written on each status change?

**Current:** the trainee sees both, in the stepper and the history. A rejection reason travels in those remarks, which is the reason for showing them. Validators' separate private remarks are not returned.

**To answer:** keep names and remarks, or show the role only (for example "Trainer") and keep the remarks.

---

## 14. Withdrawal: keep or retire the old `request_status`

| Field | Value |
|-------|-------|
| **Related** | Withdrawal pre-staging audit A-9, MP-45, MP-49 |
| **Added** | 2026-11-04 |
| **Status** | OPEN GAP |

**Question:** Do we keep `withdrawal_request.request_status` next to the new `withdrawal_status`?

**Current:** new code uses `withdrawal_status` only. The old column stays at `PENDING` on every new request, so after a cancel or an approval the two disagree. It was kept for consistency when the migration was written.

**To answer:** retire it in a later migration, or keep it in sync. Decide before the admin sign-off ticket (MP-49).

---

## Gap Summary (all open gaps on 2026-11-04)

| Gap | Ticket | Where logged |
|-----|--------|--------------|
| Restock reminder: note only or also a quantity | MP-59 | item 2 |
| Restock reminder: 24-hour limit per program and size | MP-59 | item 3 |
| Who reproduces the missing deduction, and on which environment | MP-58 | item 4 |
| G-41-1 Photo bucket private or public | MP-41 | item 5 |
| G-41-2 Photo on the ID card or the registrar's enrollment view | MP-41 | item 5 |
| G-41-3 Is the free Supabase plan (about 1 GB) enough | MP-41 | item 5 |
| G-41-4 Is the `multer` fix (SEC-02) a blocker | MP-41 | item 5 |
| G-42-1 Who takes MP-42 | MP-42 | item 6 |
| G-42-2 Is "record a new payment instead" still needed | MP-42 | item 6 |
| Sprint placement for MP-41, MP-42, MP-43, MP-59 | several | item 7 |
| Can a PENDING enrollment receive a uniform | MP-53 | item 8 |
| Withdrawal approved: deactivate the trainee's account or not (A, B or C) | MP-49 | item 9 |
| Supabase RLS is off on every table: confirm the REST API cannot read or write | audit A-2 | item 10 |
| ~~Add `helmet` and remove `X-Powered-By`~~ Resolved 2026-11-04 (PR #75) | audit A-1 | item 11 |
| Withdrawal tests not in the repo (integration and frontend) | audit A-4 | item 12 |
| Trainee sees staff names and remarks | audit A-8, MP-46 | item 13 |
| Keep or retire the old `request_status` | audit A-9, MP-45, MP-49 | item 14 |
