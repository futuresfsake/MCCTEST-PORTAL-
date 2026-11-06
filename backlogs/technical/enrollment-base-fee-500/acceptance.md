# TECH-04: Technical — enrollment base fee is 500 without insurance coverage, but it should always be 450

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Technical Debt / Business rule                                                          |
| Priority    | Medium                                                                                  |
| Discovered  | 2026-11-06, while auditing MP-43 (commitment fee)                                        |
| Affected    | `backend-nestjs/src/enrollments/enrollments.service.ts` line 789. Data in `official_receipts.base_fee` |
| Status      | **LOGGED, NOT FIXED.** Rule confirmed by the owner on 2026-11-06: the base fee is always 450 |
| Assignee    | Unassigned                                                                               |
| Related     | MP-43 audit finding F-1 and gap G-1 (commitment fee)                                      |

---

## Problem

When a trainee is enrolled with a payment, the base fee is chosen by a coverage check:

```ts
const baseFee = activeCoverage ? 450 : 500;
```

So a trainee with **no active insurance coverage** is charged **500**, and one with coverage is charged **450**. The owner says the only fee is **450**, and the 500 should not exist. The chatbot text already says "Enrollment fee: PHP 450" (`chatbot.service.ts` line 143), so the app tells users one thing and charges another.

## Data affected (read-only count on Supabase, 2026-11-06)

| `base_fee` | Receipts |
|-----------|----------|
| 450.00 | 2 |
| 500.00 | **7** |

7 of 9 receipts carry the wrong base fee. Changing the code only fixes **new** receipts. The 7 existing ones need a decision (see below).

## Not part of MP-43

It was found while auditing MP-43 and does not change that ticket. Fix it on its own branch.

## Fix notes

1. Set the base fee to 450 in one named constant, not a number inside the enrollment code. Check `payments.service.ts` and `create-payment.dto.ts`, which also use `base_fee`.
2. The insurance coverage record is still created for a first payment. Only the amount rule changes. Confirm with the owner that coverage should still be created.
3. Decide what to do with the 7 existing receipts at 500: leave them (they are issued receipts), or correct them with a reviewed data change and a note. Do not change issued receipts silently.
4. Add a unit test for the enrollment payment with and without active coverage, both expecting 450.

## Acceptance Criteria

| #  | Criteria                                                                                       | Status      | Notes |
|----|------------------------------------------------------------------------------------------------|-------------|-------|
| 1  | A new enrollment payment always records a base fee of 450, with or without insurance coverage   | NOT STARTED | Today 500 without coverage |
| 2  | The fee is one named constant, used by every code path that sets it                              | NOT STARTED | |
| 3  | The decision on the 7 existing receipts at 500 is written down and carried out                  | NOT STARTED | Issued receipts: do not change without approval |
| 4  | A test covers enrollment with and without active coverage                                       | NOT STARTED | No test mentions the fee today |
| 5  | The chatbot text, the enrollment form and the receipts all show the same amount                 | NOT STARTED | Chatbot already says 450 |
