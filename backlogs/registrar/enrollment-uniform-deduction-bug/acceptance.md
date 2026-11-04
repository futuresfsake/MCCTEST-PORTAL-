# Bug: Enrollment Does Not Deduct Uniform Stock When "Uniform Distributed" Is Selected

| Field | Value |
|-------|-------|
| **Jira** | MP-58 |
| **Type** | Bug |
| **Status** | NOT STARTED |
| **Sprint** | MP Sprint 4 |
| **Priority** | High |
| **Assignee** | Rhoddz Gerunda |
| **Related** | MP-35 (uniform inventory), MP-53 (Uniform Distribution page), MP-16 (enrollment form) |
| **Added** | 2026-11-04 |

---

## Problem

On the enrollment form, when the registrar selects **Uniform distributed**, the stock for the program and size should go down by one when the enrollment is saved. The stock is not deducted automatically.

## Expected

- Saving an enrollment with "Uniform distributed" deducts one unit for the chosen program and size.
- A `DISTRIBUTED` history entry is written, linked to the enrollment, with the trainee's name and ID card number.
- The distribution record is updated: `uniform_given`, `size_issued`, `date_distributed`, `distributed_by`, `inventory_id`.
- The enrollment, the stock change, the history row and the distribution record are saved in one transaction.
- Out of stock: the enrollment is rejected with "No M uniform is currently in stock for this program." and nothing is saved.
- The deduction uses `InventoryService.deductAndLog` (MP-35). The logic is not copied.

## Actual

Stock stays the same after the enrollment is saved with "Uniform distributed" selected.

## Root Cause

**Status: NOT CONFIRMED. Needs a reproduction before the fix.** Found by reading the code on 2026-11-04. Write the final cause here when it is confirmed.

What the code shows (same on `main`, `dev`, `staging` and the working branch):

- The backend does deduct. In `enrollments.service.ts` (enrollment creation), `if (uniformGiven)` calls `InventoryService.deductAndLog` inside the same transaction, then writes the distribution record with `uniform_given`, `size_issued`, `date_distributed` and `distributed_by`.
- `deductAndLog` takes one unit from the single inventory row for the program and size (the table has a unique key on program and size, so there is no "wrong row" case), and writes a `DISTRIBUTED` history row.
- The form sends `uniformGiven` from the radio buttons (`EnrollmentFormWizard.tsx`). The default is **"Not distributed"** (`uniformGiven: false`). Nothing is deducted unless the registrar picks "Distributed".
- The form does **not** show the stock left for the chosen size, so the registrar gets no feedback that the stock will go down, and the Inventory page only shows the change after it is reloaded.

So no defect was found in the deduction path itself. Candidates to check, in order:

1. **Not deployed:** the running backend does not include the MP-35 deduction code (the MP-35 notes say the backend must be deployed with it). Check the deployed commit.
2. **Not selected or not sent:** the registrar leaves the default "Not distributed", or the request body arrives with `uniformGiven = false`. Check the network request.
3. **Stale screen:** the deduction happened but the Inventory page was not refreshed. Check the database stock and history.
4. **Missing stock row:** the program has no stock row for the size. In that case the enrollment is rejected with the out-of-stock message, so check what the registrar saw.

**Open gap (logged in `to-be-discussed.md` item 4):** who reproduces the missing deduction, on which environment (dev, staging or main), and whether the deployed backend is on the same commit as `main`.

Steps to confirm: enroll a trainee with "Distributed" on each environment and compare the request body, the stock row and the `inventory_transactions` row.

## Also Included: Show Stock Left on the Enrollment Form

**Decided 2026-11-04:** this is part of MP-58, not a separate ticket.

The enrollment form shows the stock left for the chosen program and size (MP-35 criterion 13), using `GET /inventory/availability`. The number updates when the size or the program changes. A size with 0 stock is shown as out of stock, and "Distributed" is disabled for it.

## Out of Scope

Handing out a uniform after enrollment (MP-53). Returning stock when a trainee withdraws.

---

## Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---------|--------|-------|
| 1 | **Given** Program A size M at 5, **when** a trainee is enrolled with "Uniform distributed" and size M, **then** stock becomes 4 | NOT STARTED | |
| 2 | One `DISTRIBUTED` history entry exists: -1, quantity after 4, linked to the enrollment, performed by the logged-in user | NOT STARTED | |
| 3 | The distribution record shows `uniform_given = true`, `size_issued`, `date_distributed`, `distributed_by` and `inventory_id` | NOT STARTED | |
| 4 | Enrolling with "Not distributed" leaves stock unchanged and writes no history entry | NOT STARTED | |
| 5 | Size M at 0 with "Uniform distributed": the enrollment is rejected with the out-of-stock message and nothing is saved | NOT STARTED | |
| 6 | If the history write fails, the enrollment, stock and distribution record are all rolled back | NOT STARTED | |
| 7 | The same result occurs when Admin enrolls and when Registrar enrolls | NOT STARTED | |
| 8 | The deduction goes through `InventoryService.deductAndLog` | NOT STARTED | |
| 9 | The root cause is confirmed with a reproduction and written in the Root Cause section and in the Jira ticket | NOT STARTED | Candidates listed above |
| 10 | The enrollment form shows the stock left for the chosen program and size, and updates when either changes | NOT STARTED | MP-35 criterion 13 |
| 11 | A size with 0 stock is shown as out of stock on the form and "Distributed" cannot be selected for it | NOT STARTED | |
| 12 | Backend and frontend lint and build pass. A test covers the deduction at enrollment | NOT STARTED | |

---

## Test Cases

### TC-01: Distributed at enrollment
- **Precondition:** Program A size M has 5.
- **Steps:** Enroll a trainee with "Uniform distributed", size M.
- **Expected:** Stock is 4. One `DISTRIBUTED` entry, -1, balance 4. The record shows the uniform as given.

### TC-02: Not distributed
- **Steps:** Enroll a trainee with "Not distributed".
- **Expected:** Stock unchanged. No history entry. `uniform_given = false`.

### TC-03: Out of stock
- **Precondition:** Program A size M has 0.
- **Steps:** Enroll with "Uniform distributed", size M.
- **Expected:** Error "No M uniform is currently in stock for this program." No enrollment is created.

### TC-04: Rollback
- **Steps:** Make the history write fail (mocked database) during enrollment.
- **Expected:** No enrollment, no stock change, no distribution record.

### TC-05: Both roles
- **Steps:** Repeat TC-01 as Admin and as Registrar.
- **Expected:** Same result.

### TC-06: Stock shown on the form
- **Precondition:** Program A size M has 5, size L has 0.
- **Steps:** Open the enrollment form, choose Program A, size M, then size L.
- **Expected:** The form shows 5 left for M, then out of stock for L, and "Distributed" is disabled for L.

---

## Summary: 0/12 PASS, NOT STARTED
