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
| **Migrations** | `20261019_add_inventory_transactions` (on `main`, applied to Supabase), `20261022_inventory_unique_program_size` (this branch, **already applied to Supabase**), `20261103_inventory_transactions_created_index` and `20261103_restore_mp24_indexes` (this branch, **applied to Supabase 2026-11-03 14:55**) |

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
| 4 | Add an item for a program with a size and starting quantity. A duplicate is rejected with "restock it instead", enforced by the database | NOT TESTED | Unique index on program and size, `P2002` mapped to 409. The item name is always `Uniform Shirt` |
| 5 | Restock adds to the quantity (10 + 20 = 30) | NOT TESTED | Atomic `quantity = quantity + n` |
| 6 | A restock saves a `RESTOCK` history entry with the change, quantity after, user and time | NOT TESTED | Written in the same transaction |
| 7 | Restock must be a positive whole number. Adjustments need a reason and cannot make stock negative | NOT TESTED | DTO and service checks, conditional update |
| 14 | Items at or below 5 show "Low stock", items at 0 show "Out of stock" | NOT TESTED | One `LOW_STOCK_THRESHOLD` constant |
| 18 | List is paginated on the server. Search, filters and sorting work together and survive a refresh (URL state) | PARTIAL | Server side: yes. Filters are kept in component state, not the URL, and the shared list toolkit is not used |
| 19 | The per-program summary matches the list and is calculated in the database | NOT TESTED | Raw SQL `GROUP BY` |
| 22 | List endpoints run a fixed number of queries per request | NOT TESTED | `findMany` plus `count` in one transaction |

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

## Folder Structure

Follows the shared-module convention used by enrollments, payments and trainee information: logic once in a shared place, a thin wrapper per role.

| Layer | Location | Notes |
|-------|----------|-------|
| Backend service | `src/inventory/inventory.service.ts` | Shared. Exported by `InventoryModule` and also used by `EnrollmentsService` (`deductAndLog`) |
| Backend controller | `src/inventory/inventory.controller.ts` | One controller, `@Roles(ADMIN, REGISTRAR)`, route `/api/inventory`, as the ticket specifies. There are no per-role controllers, because that would change the endpoints listed in the ticket |
| Frontend API | `src/api/inventory.api.ts` | Shared |
| Frontend page | `src/components/inventory/InventoryPage.tsx` | Shared page. Takes `scope` (`admin` or `registrar`) |
| Frontend parts | `src/components/inventory/InventoryHistoryEntry.tsx`, `InventoryStockLogDialog.tsx` | Shared |
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

## Summary: 1 PASS (code), 4 PARTIAL, 2 FAIL, 1 NOT STARTED, rest NOT TESTED. Additions A1 to A4 NOT TESTED

---

## Still Not Verified

- **Browser walkthrough as Admin and as Registrar.** Nothing in the module has been used in a browser: the `/admin/inventory` and `/registrar/inventory` pages, restock, adjust, History, Stock Log and its filters, the Last Restocked column, and the low and out-of-stock badges. Most criteria are marked NOT TESTED for this reason.
- **Enrollment with a uniform.** No enrollment has been run with "Uniform distributed" selected: stock available, stock at 0 (the enrollment must be blocked and nothing saved), and two enrollments for the last shirt at the same time.
- **Concurrency.** Two restocks or two adjustments of the same item at the same moment (criterion 17) have no test.
- **Performance.** History with 10,000+ rows for one item (criterion 20) and the availability endpoint under 100 ms (criterion 21) have not been measured.
- **Migrations on an empty database.** The migrations have not been run from scratch on a new database. The shared Supabase database is up to date and matches `schema.prisma`.

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

### Database (Supabase, shared)

| Time | User | Change |
|------|------|--------|
| 2026-10-20 11:20 | Not recorded by Prisma | `20261019_add_inventory_transactions` applied: history table, opening-balance backfill, unique index on program + item + size |
| 2026-10-22 20:32 | Not recorded by Prisma | `20261022_inventory_unique_program_size` applied (original version). Replaced the unique index with program + size and **dropped `idx_enrollments_enrolled_at` and `idx_insurance_coverage_trainee`** |
| 2026-11-03 14:55 | Chelsea Cllj | `20261103_inventory_transactions_created_index` applied with `prisma migrate deploy` |
| 2026-11-03 14:55 | Chelsea Cllj | `20261103_restore_mp24_indexes` applied with `prisma migrate deploy`. Both MP-24 indexes are back |
| 2026-11-03 14:55 | Chelsea Cllj | Check after the deploy: `migrate status` reports up to date, `migrate diff` between Supabase and `schema.prisma` reports no difference |

Read-only checks on Supabase on 2026-11-03 (Chelsea Cllj): applied migrations and checksums, and which indexes exist. Nothing was changed except the two migrations above.
