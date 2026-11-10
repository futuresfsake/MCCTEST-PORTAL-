# TECH-05: Technical — an ID card number clash comes back as a server error

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Technical Debt / Error handling                                                         |
| Priority    | Low                                                                                     |
| Discovered  | 2026-11-09, while auditing MP-42 (Definition of Done audit)                              |
| Affected    | `backend-nestjs/src/enrollments/enrollments.service.ts`, `generateIdCardNumber` and the `enrollments.create` call that uses it (`createEnrollment`, and now `changeProgram`) |
| Status      | **LOGGED, NOT FIXED**                                                                   |
| Assignee    | Unassigned                                                                              |
| Related     | MP-42 audit finding F-11                                                                |

---

## Problem

`generateIdCardNumber` builds the number from a per-program, per-year counter in `batch_seq`. It never checks whether that number is already used by an enrollment. `enrollments.id_card_number` is unique.

If an enrollment already holds a number the counter has not reached yet (for example a number typed in by hand, or a counter row that was reset), the next enrollment or program change gets the same number. The database refuses it with `Unique constraint failed on the constraint: enrollments_id_card_number_key`, and the API answers **500 Internal server error** with no message the admin can act on.

## How it was seen

On a throwaway database during the MP-42 audit. Enrollments were seeded with numbers `2026-BB001` and `2026-AA001` while the counter rows were missing, so the counter started again at 1. Every program change into those programs returned 500, and the transaction rolled back cleanly (nothing was saved).

## Why it is low

On the normal path the counter only goes up inside the same transaction, so a clash needs the counter and the data to disagree. Nothing on Supabase was checked for this (writes and counter reads were out of scope for the audit).

## Suggested fix

Either skip numbers that already exist (loop on the counter), or catch the unique violation on `id_card_number` and return a clear 409, as the MP-42 service already does for the email clash. Add a unit test for the clash.
