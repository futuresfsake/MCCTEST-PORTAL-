# MP-35: Uniform Inventory Module (Admin and Registrar)

| Field | Value |
|-------|-------|
| **Jira** | MP-35 |
| **Type** | Feature |
| **Status** | In Review (not merged) |
| **Assignee** | Rhoddz Gerunda |
| **Sprint** | MP Sprint 3 |
| **Branch** | `MP-35-uniform-inventory` |
| **Routes** | `/admin/inventory`, `/registrar/inventory` (one shared page) |
| **Migrations** | `20261019_add_inventory_transactions` (on `main`, applied to Supabase), `20261022_inventory_unique_program_size` (this branch, **already applied to Supabase**), `20261103_inventory_transactions_created_index` and `20261103_restore_mp24_indexes` (this branch, **applied to Supabase 2026-11-03 14:55**), `20261104_default_inventory_for_every_program` (this branch, **written, not applied to Supabase**) |

Status key: PASS = verified. NOT TESTED = code exists and builds, but it was read, not run against a database or a browser. FAIL / NOT STARTED = missing.

Last reviewed 2026-11-03 against `main` at `4386ee7` after merging `main` into the branch. Backend `tsc`, ESLint and `nest build`, frontend ESLint, `tsc` and `vite build` pass. `inventory.service.spec.ts` has 10 tests against a mocked database. Nothing has been run against a real database or in a browser.

---

## Acceptance Criteria

### Access Control

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | Admin opens Inventory from the sidebar at `/admin/inventory` | NOT TESTED | Route guarded for ADMIN only. Renders `AdminInventoryPage`, a thin wrapper around the shared `InventoryPage` |
| 2 | Registrar opens the same page at `/registrar/inventory` | NOT TESTED | Route guarded for REGISTRAR only. Renders `RegistrarInventoryPage`, a thin wrapper around the same shared `InventoryPage` |
| 3 | Trainee, trainer and encoder get 403 from the inventory endpoints | NOT TESTED | Controller has `@Roles(Role.ADMIN, Role.REGISTRAR)` with JWT and roles guards |

### Stock Management

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 4 | Add an item for a program with a size and starting quantity. A duplicate is rejected with "restock it instead", enforced by the database | NOT TESTED | Backend: `POST /inventory`, unique index on program and size, 409 on a duplicate. **Page: "Add Item" button and dialog added (fix F9, `f00d685`)**: program, size, starting quantity, shows the server's "already exists" message. Was FAIL (UI) before the fix. Not yet used in a browser |
| 5 | Restock adds to the quantity (10 + 20 = 30) | NOT TESTED | Atomic `quantity = quantity + n` |
| 6 | A restock saves a `RESTOCK` history entry with the change, quantity after, user and time | NOT TESTED | Written in the same transaction |
| 7 | Restock must be a positive whole number. Adjustments need a reason and cannot make stock negative | NOT TESTED | DTO and service checks, conditional update |
| 14 | Items at or below 5 show "Low stock", items at 0 show "Out of stock" | NOT TESTED | One `LOW_STOCK_THRESHOLD` constant |
| 18 | List is paginated on the server. Search, filters and sorting work together and survive a refresh (URL state) | PARTIAL | Server side: yes. Filters are kept in component state, not the URL, and the shared list toolkit is not used |
| 19 | The per-program summary matches the list and is calculated in the database | NOT TESTED | Raw SQL `GROUP BY` |
| 22 | List endpoints run a fixed number of queries per request | NOT TESTED | `findMany` plus `count` in one transaction |
| 25 | **Every program has inventory by default.** Each program has one row per size (XS, S, M, L, XL, XXL, XXXL), all at quantity 0, and each row has an `INITIAL` history entry of 0 | NOT TESTED | **Not in the original ticket.** Built (fix F8, `f00d685`): new programs get rows from the app, existing programs from the migration `20261104_default_inventory_for_every_program`. **The migration is not applied to Supabase yet**, so the page is unchanged until it is. Read-only dry run on Supabase: 7 programs, 3 rows now, 46 rows would be added (49 rows, history 13 to 59) |
| 26 | A new program gets its seven size rows (quantity 0, with history) automatically, in the same transaction as the program | NOT TESTED | `ProgramsService.create` runs in one transaction and calls `InventoryService.seedDefaultStock`. 3 unit tests (seeds in the same transaction, program not created if seeding fails, nothing seeded for a duplicate program) and 2 for the seeding itself. Not run against a database |
| 27 | Existing programs without rows are backfilled by a migration. Rows that already exist are not changed | NOT TESTED | Migration `20261104_default_inventory_for_every_program` inserts only missing program + size rows (`ON CONFLICT DO NOTHING`) and one `INITIAL` 0 history row each, performed by the user who created the program. Read-only dry run on Supabase: the SQL parses and plans, adds 46 rows, and the 2 rows that have stock are untouched. Not applied |
| 28 | The size filter lists all seven sizes, including XXXL | NOT TESTED | Fixed (F9, `f00d685`): the filter and the Add Item dialog use one shared `INVENTORY_SIZES` list with all seven sizes. Not yet checked in a browser |

### Automatic Deduction on Enrollment

The deduction is automatic. When staff submit the enrollment form with "Uniform distributed" selected, stock for that program and size goes down by 1 and a `DISTRIBUTED` history row is written, linked to the enrollment. Verified by reading `enrollments.service.ts` (`createEnrollment` calls `inventoryService.deductAndLog`). It has not been run against a database, and there is no test for it.

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 8 | Program A size M has 5. Enrolling with size M and uniform given makes it 4 and saves a `DISTRIBUTED` entry linked to the enrollment | PARTIAL | `deductAndLog` runs inside the enrollment transaction, after the enrollment row exists. Unit test (mocked database) checks the log row: -1, quantity after, linked enrollment. Not run against a database |
| 9 | Stock is 0. Enrolling with uniform given is blocked with an out-of-stock message and nothing is saved | PARTIAL | Unit test checks the message and that no log row is written. The rollback of the trainee and enrollment depends on the transaction and was not run. `deductAndLog` throws "No M uniform is currently in stock for this program.", the whole transaction rolls back, including the trainee |
| 10 | If enrollment fails for any other reason, stock is not deducted | NOT TESTED | Deduction and enrollment share one `Serializable` transaction. A retry starts a new transaction, so it cannot deduct twice |
| 11 | Two enrollments for the last item cannot both succeed | NOT TESTED | The query locks the row (`FOR UPDATE`) and rechecks `quantity > 0` |
| 12 | Marking a uniform as given later, from the enrollment edit flow, deducts and logs the same way | NOT STARTED | There is no edit flow. If "not distributed" is chosen at enrollment and the shirt is handed out later, nothing deducts stock. Depends on MP-42 |
| 13 | The enrollment wizard shows the available quantity for the chosen program and size | FAIL | The availability endpoint and API function exist, but the wizard never calls them |
| 23 | The deduct-and-log logic exists in one shared method | PASS (code) | `InventoryService.deductAndLog`, used by `createEnrollment`. The edit flow does not exist yet |
| — | No deduction happens when "Uniform distributed" is not selected | NOT TESTED | By design: the default is "not distributed", so stock is only deducted when staff select the other option |

### History

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 15 | An item's history lists all movements, newest first, with timestamps, and cannot be edited or deleted | NOT TESTED | Per-row History dialog, now with date and time, the staff member's name and role, and the recipient for a distribution. No update or delete endpoint exists for the log |
| 17 | Two restocks at the same moment end at the right total, with consistent `quantity_after` values | NOT TESTED | `quantity_after` is read from the row returned by the atomic update |
| 20 | History loads in pages and stays fast with 10,000+ rows | NOT TESTED | Cursor on `(created_at, id)` with a matching index. Not measured |
| 24 | Every stock change has exactly one matching row in `inventory_transactions` | NOT TESTED | Create, restock, adjust and distribute all write the log row in the same transaction |

### Performance

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 21 | The availability endpoint answers in under 100 ms and the wizard uses it | FAIL | Endpoint exists, not used by the wizard. Not measured |

### Build and Migration

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 16 | Backend and frontend lint and build pass. The migrations run on a fresh database and on one with existing inventory rows | PARTIAL | Lint and builds pass. `20261022` is already applied to Supabase and ran cleanly there (no program had two rows for the same size). The two newer migrations were applied to Supabase on 2026-11-03 and the database matches `schema.prisma` afterwards. Not tested on a fresh database |

---

## Additions beyond the ticket

Added after the review, from the senior-developer suggestions. Built and unit tested with a mocked database, not run against a database or in a browser.

| # | Addition | Status | Notes |
|---|---------|--------|-------|
| A1 | Program-level stock log: `GET /inventory/history?programId=&type=&from=&to=&cursor=`, shown in a "Stock Log" dialog with program, type and date filters and "Load more" | NOT TESTED | Same cursor pagination as the per-item history. `from` is inclusive and `to` exclusive. The dialog sends local-day boundaries. New index `idx_inventory_transactions_created` on `(created_at DESC, id DESC)`, migration `20261103_inventory_transactions_created_index` |
| A2 | A distribution shows who received it: the trainee's name and ID card number | NOT TESTED | Joined in the history query's `select` (`enrollments.trainee.users`), no query per row. Blank if the enrollment was deleted |
| A3 | History shows who did each change: staff name and role | NOT TESTED | `users` select now includes `role`. Never selects the email or password hash (unit test) |
| A4 | "Last Restocked" column on the main table | NOT TESTED | One grouped query per page for `RESTOCK` rows. Shows "Never" if the item has only an opening balance |

---

## Gaps Found Against the Ticket

Found 2026-11-03 while checking why the inventory page could not create inventory. "Original branch" is the work on `MP-35-uniform-inventory` up to `852657c`.

| Item | In the Jira ticket? | In the original branch? | Criterion | Fix |
|------|---------------------|-------------------------|-----------|-----|
| Every program has rows by default, at quantity 0 | No. The ticket only says the table already exists with one row per program, item and size | No. Nothing creates rows when a program is made | 25, 26, 27 | F8 (built, `f00d685`) |
| Add a new item (program, size, starting quantity) from the page | Yes (Stock Management, criterion 4) | Backend only. The API function exists but the page has no Add control | 4 | F9 (built, `f00d685`) |
| Size filter lists all sizes | Implied. The ticket lists XS to XXXL | No. The filter stops at XXL. The database enum also has XXXL | 28 | F9 (built, `f00d685`) |

State of the data when found: 7 programs, 3 inventory rows, and 5 programs with no rows (so absent from the page). The seven sizes in the database enum would give 49 rows.

---

## Folder Structure

Follows the shared-module convention used by enrollments, payments and trainee information: logic once in a shared place, a thin wrapper per role.

| Layer | Location | Notes |
|-------|----------|-------|
| Backend service | `src/inventory/inventory.service.ts` | Shared. Exported by `InventoryModule` and also used by `EnrollmentsService` (`deductAndLog`) |
| Backend controller | `src/inventory/inventory.controller.ts` | One controller, `@Roles(ADMIN, REGISTRAR)`, route `/api/inventory`, as the ticket specifies. There are no per-role controllers, because that would change the endpoints listed in the ticket |
| Program hook | `src/users/admin/programs/programs.service.ts` calls `InventoryService.seedDefaultStock` | `ProgramsModule` imports `InventoryModule` (which exports `InventoryService`), the same way `EnrollmentsModule` does. Inventory does not depend on programs, so there is no circular dependency |
| Frontend API | `src/api/inventory.api.ts` | Shared |
| Frontend page | `src/components/inventory/InventoryPage.tsx` | Shared page. Takes `scope` (`admin` or `registrar`) |
| Frontend parts | `src/components/inventory/InventoryHistoryEntry.tsx`, `InventoryStockLogDialog.tsx`, `InventoryAddItemDialog.tsx` | Shared. `InventoryAddItemDialog` also exports the shared `INVENTORY_SIZES` list |
| Admin wrapper | `src/pages/users/admin/inventory/AdminInventoryPage.tsx` | 6 lines, `scope="admin"` |
| Registrar wrapper | `src/pages/users/registrar/inventory/RegistrarInventoryPage.tsx` | 6 lines, `scope="registrar"` |

Each URL is limited to its own role: `/admin/inventory` allows ADMIN, `/registrar/inventory` allows REGISTRAR. Before 2026-11-03 both routes allowed both roles and both rendered the page named `AdminInventoryPage`, which lived in the Admin folder. The sidebar already follows the logged-in user's role, so the registrar sees the registrar menu.

---

## Notes

- **Uniqueness differs from the ticket.** The ticket says program + item + size. The branch enforces program + size (`uq_inventory_program_size`) and always saves the item as `Uniform Shirt`. One program can have one row per size.
- **MP-24 indexes dropped on Supabase.** `20261022_inventory_unique_program_size` was generated from a schema that did not list `idx_enrollments_enrolled_at` and `idx_insurance_coverage_trainee` (MP-24), so it also dropped them. It has already been applied to the shared Supabase database (checked 2026-11-03 with read-only queries: the checksum matches the original file and neither index exists there). Effect: slower trainee list sorting by enrolled date and slower insurance lookups. Nothing breaks.
- **Fix.** An applied migration must not be edited, because Prisma compares checksums and `prisma migrate dev` would ask to reset the database. `20261022` is restored to its original content. The new migration `20261103_restore_mp24_indexes` recreates both indexes with `CREATE INDEX IF NOT EXISTS`. `schema.prisma` lists both indexes, so the schema matches the database after the migration runs. Applied to Supabase on 2026-11-03 14:55 with `npx prisma migrate deploy`. Both indexes exist again and `migrate diff` reports no difference between Supabase and `schema.prisma`.
- **Prisma client.** Anyone pulling the branch must run `npx prisma generate`, otherwise `tsc` reports missing `inventory_transactions` types.
- **Limited tests.** `inventory.service.spec.ts` covers the history filters, cursor, selected fields, last-restocked query and `deductAndLog`. Restock, adjust, duplicate handling and concurrency still have no automated tests.

## Summary: 28 criteria. 1 PASS (code), 4 PARTIAL, 2 FAIL, 1 NOT STARTED, 20 NOT TESTED. Additions A1 to A4 NOT TESTED

---

## Test Cases

### TC-D1: Every program has inventory by default
- **Precondition:** Seven sizes exist (XS, S, M, L, XL, XXL, XXXL). Run after F8 is built and the backfill migration has run.
- **Steps:**
  1. Open `/admin/inventory` and set the page size so all rows show, or filter by one program at a time.
  2. For each program in Programs, count its rows.
- **Expected:** Every program has exactly 7 rows, one per size. Programs that never had stock show quantity 0 with the "Out of stock" badge. The summary cards count every program.

### TC-D2: Default rows are zero and have history
- **Precondition:** A program that had no inventory before the backfill.
- **Steps:** Open History on any of its rows.
- **Expected:** One `INITIAL` entry, change 0, balance 0, with a date and a performer. The row's quantity is 0.

### TC-D3: A new program gets its rows automatically
- **Precondition:** None.
- **Steps:**
  1. As Admin, create a new program.
  2. Open the inventory page and search for the program.
- **Expected:** 7 rows at quantity 0, each with an `INITIAL` 0 history entry performed by the admin who created the program. If the program creation fails, no inventory rows remain.

### TC-D4: Backfill does not change existing stock
- **Precondition:** Programs that already have rows with stock, for example one with 11 units.
- **Steps:** Run the backfill migration, then compare their rows before and after.
- **Expected:** Quantities, item names and history of existing rows are unchanged. Only the missing size rows are added. There are no duplicate program + size rows.

### TC-D5: Restock a default row
- **Precondition:** A program with a default row at 0.
- **Steps:** Restock size M by 10.
- **Expected:** Quantity becomes 10, history shows the `INITIAL` 0 entry then a `RESTOCK` +10 entry with balance 10. The Last Restocked column shows today's date.

### TC-D6: Enrollment with a default row at 0
- **Precondition:** A program whose size M row is at 0.
- **Steps:** Enroll a trainee in that program, size M, with "Uniform distributed" selected.
- **Expected:** The enrollment is rejected with "No M uniform is currently in stock for this program." Nothing is saved.

### TC-D7: Add a missing item from the page
- **Precondition:** A program with one size row removed (or deliberately missing).
- **Steps:** Use "Add item", choose the program and size, enter a starting quantity.
- **Expected:** The row appears, with an `INITIAL` history entry equal to the starting quantity. Adding the same program and size again is rejected with "This item already exists, restock it instead."

### TC-D8: Size filter lists every size
- **Steps:** Open the size filter on the inventory page.
- **Expected:** XS, S, M, L, XL, XXL and XXXL are all listed. Selecting XXXL shows only XXXL rows.

---

## Still Not Verified

- **Browser walkthrough as Admin and as Registrar.** Nothing in the module has been used in a browser: the `/admin/inventory` and `/registrar/inventory` pages, restock, adjust, History, Stock Log and its filters, the Last Restocked column, and the low and out-of-stock badges. Most criteria are marked NOT TESTED for this reason.
- **Enrollment with a uniform.** No enrollment has been run with "Uniform distributed" selected: stock available, stock at 0 (the enrollment must be blocked and nothing saved), and two enrollments for the last shirt at the same time.
- **Concurrency.** Two restocks or two adjustments of the same item at the same moment (criterion 17) have no test.
- **Performance.** History with 10,000+ rows for one item (criterion 20) and the availability endpoint under 100 ms (criterion 21) have not been measured.
- **Migrations on an empty database.** The migrations have not been run from scratch on a new database. The shared Supabase database is up to date and matches `schema.prisma`.
- **Default inventory.** The migration `20261104_default_inventory_for_every_program` has not been applied to Supabase, so TC-D1 to TC-D4 have not run. The Add Item dialog and the XXXL filter (TC-D7, TC-D8) have not been used in a browser.

## Follow-ups

| # | Follow-up | Related criteria | Priority | Status |
|---|-----------|------------------|----------|--------|
| F1 | Show the available quantity for the chosen program and size in the enrollment wizard. The endpoint `GET /inventory/availability` and the API function `getUniformAvailability` already exist, but the wizard never calls them. Today staff only learn a size is empty after submitting the whole form | 13, 21 | High | NOT STARTED |
| F2 | Deduct stock when a uniform is marked given after enrollment. If staff choose "not distributed" at enrollment and hand out the shirt later, nothing reduces the stock. Needs an enrollment edit flow, so it depends on MP-42. Reuse `InventoryService.deductAndLog`. Written up as its own backlog: MP-53, `admin/uniform-distribution/acceptance.md` | 12 | High | NOT STARTED (MP-53 created) |
| F3 | Update the Jira ticket MP-35 text to say one row per program and size, and that the item is always "Uniform Shirt". The ticket still says program + item + size. The code and the database (`uq_inventory_program_size`) use program + size on purpose, and no duplicates existed | 4 | Medium | NOT STARTED |
| F4 | Run the browser walkthrough and the enrollment checks listed under "Still Not Verified", then update the statuses in this file | most | High | NOT STARTED |
| F5 | Add tests for restock, adjust, duplicate handling (409) and concurrent restocks. Today only the history, last-restocked and `deductAndLog` logic has tests (`inventory.service.spec.ts`) | 4, 5, 7, 17 | Medium | NOT STARTED |
| F6 | Keep the filters and sorting in the URL (survive a refresh) and use the shared list toolkit, as the ticket asks. The page keeps them in component state | 18 | Low | NOT STARTED |
| F7 | `multer` denial-of-service advisory in the backend (SEC-02). Not specific to inventory, but the file upload routes depend on it. Logged and deferred. See `technical/multer-dos-advisory/acceptance.md` | — | High | LOGGED, NOT FIXED |
| F8 | **Fix: default inventory for every program (criteria 25, 26, 27).** Seed seven size rows at quantity 0, each with an `INITIAL` 0 history entry, when a program is created, and backfill every existing program with a migration. Items that already exist are not changed | 25, 26, 27 | High | BUILT (`f00d685`). Migration not applied, not tested against a database |
| F9 | **Fix: Add item on the inventory page, and the XXXL filter (criteria 4 and 28).** Add a control that calls the existing `createInventory` API (program, size, starting quantity) and show `XXXL` in the size filter | 4, 28 | High | BUILT (`f00d685`). Not tested in a browser |
| F10 | Rename the "BPP Uniform" item to "Uniform Shirt" for consistency (one row was created before the name was standardized) | 4 | Low | NOT STARTED |

---

## Change Log

All times are UTC+8. "User" is the person who made or ran the change. Commits are on `MP-35-uniform-inventory`.

### Original branch work (before this review)

| Date and time | User | Change | Commit |
|---------------|------|--------|--------|
| 2026-10-20 09:36 | erunzd (git author; Jira assignee is Rhoddz Gerunda) | Inventory transaction schema and migration `20261019_add_inventory_transactions` | `32b9a1d` |
| 2026-10-20 20:07 | erunzd | Enrollment uniform deduction integrated | `94c3ec2` |
| 2026-10-21 00:32 | erunzd | Stock management and enrollment deduction API endpoints | `e03c707` |
| 2026-10-22 20:39 | erunzd | Inventory uniqueness by program and size (migration `20261022_inventory_unique_program_size`) | `77dc239` |
| 2026-10-22 20:44 | erunzd | Standardized uniform shirt inventory creation | `837e2e7` |
| 2026-10-22 22:50 | erunzd | Completed the uniform inventory module (page, API, history dialog) | `852657c` |

### Review and changes (2026-11-03)

| Time | User | Change | Commit |
|------|------|--------|--------|
| 14:26 | Chelsea Cllj | Merged `main` into the branch. One conflict in `app.module.ts`, kept all modules | `36af68b` |
| 14:26 | Chelsea Cllj | First attempt at the migration fix: restored the MP-24 indexes in `schema.prisma` and removed the two `DROP INDEX` lines from `20261022`. **Superseded at 14:52**, because `20261022` was already applied to Supabase | `e2d69a5` |
| 14:31 | Chelsea Cllj | Prettier formatting of the inventory module (backend lint 25 errors to 0) | `56d791d` |
| 14:46 | Chelsea Cllj | Program-level stock log (`GET /inventory/history`, Stock Log dialog), recipient name and ID card on distributions, staff name and role on history rows, Last Restocked column, `idx_inventory_transactions_created` index and migration, 10 tests in `inventory.service.spec.ts` | `cbca15b` |
| 14:46 | Chelsea Cllj | Added this file, with the review of all 24 ticket criteria | `555393c` |
| 14:52 | Chelsea Cllj | Restored `20261022` to its original content (checksum matches Supabase). Added migration `20261103_restore_mp24_indexes` to recreate the two dropped MP-24 indexes | `d78af8f` |
| 15:20 | Chelsea Cllj | Moved the inventory page into the shared `components/inventory/InventoryPage.tsx`. `AdminInventoryPage` and a new `RegistrarInventoryPage` are 6-line wrappers. Each route is limited to its own role. `AdminPageShell` accepts an optional `variant` | `c22d500` |
| 15:39 | Chelsea Cllj | **Review finding:** the inventory page cannot create inventory. The ticket's "add a new item" (criterion 4) is built in the backend only, the page has no Add control. Criterion 4 changed from NOT TESTED to FAIL (UI) | `docs/mp35-default-inventory-test-cases` |
| 15:39 | Chelsea Cllj | **Review finding:** 5 of 7 programs have no inventory rows, so they do not appear on the page. Default rows for every program (quantity 0, with history) were not in the original ticket and not built. Added as criteria 25, 26, 27 and test cases TC-D1 to TC-D6, fix F8 | `docs/mp35-default-inventory-test-cases` |
| 15:39 | Chelsea Cllj | **Review finding:** the size filter stops at XXL, the database also has XXXL. Added as criterion 28 and test case TC-D8, fix F9 | `docs/mp35-default-inventory-test-cases` |
| 15:47 | Chelsea Cllj | **Fix F8:** default inventory for every program. `InventoryService.seedDefaultStock` (seven size rows at 0 with `INITIAL` history), called from `ProgramsService.create` in the same transaction. `ProgramsModule` now imports `InventoryModule`. Backfill migration `20261104_default_inventory_for_every_program` written, **not applied**. 5 new tests | `f00d685` |
| 15:47 | Chelsea Cllj | **Fix F9:** "Add Item" button and dialog on the inventory page (calls the existing `createInventory`), and the size filter now lists XXXL (shared `INVENTORY_SIZES`) | `f00d685` |
| 15:47 | Chelsea Cllj | Checks run before this commit. Read-only dry run of the backfill on Supabase: parses, adds 46 rows, 2 rows with stock untouched. Nothing was written to Supabase. Backend: 50 of 50 tests, `tsc`, ESLint, build and a boot with no errors. Frontend: ESLint, `tsc`, `vite build` pass | `f00d685` |

### Database (Supabase, shared)

| Time | User | Change |
|------|------|--------|
| 2026-10-20 11:20 | Not recorded by Prisma | `20261019_add_inventory_transactions` applied: history table, opening-balance backfill, unique index on program + item + size |
| 2026-10-22 20:32 | Not recorded by Prisma | `20261022_inventory_unique_program_size` applied (original version). Replaced the unique index with program + size and **dropped `idx_enrollments_enrolled_at` and `idx_insurance_coverage_trainee`** |
| 2026-11-03 14:55 | Chelsea Cllj | `20261103_inventory_transactions_created_index` applied with `prisma migrate deploy` |
| 2026-11-03 14:55 | Chelsea Cllj | `20261103_restore_mp24_indexes` applied with `prisma migrate deploy`. Both MP-24 indexes are back |
| 2026-11-03 14:55 | Chelsea Cllj | Check after the deploy: `migrate status` reports up to date, `migrate diff` between Supabase and `schema.prisma` reports no difference |

Read-only checks on Supabase on 2026-11-03 (Chelsea Cllj): applied migrations and checksums, and which indexes exist. Nothing was changed except the two migrations above.
