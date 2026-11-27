# MP-67 bug: trainers cannot see their own batches

| Field | Value |
|-------|-------|
| **Jira** | MP-67 |
| **Found** | 2026-11-25, during the Definition of Done audit (`audit-dod.md`, F-1) |
| **Severity** | High, blocks the whole feature |
| **Status** | LOGGED, not fixed |
| **Introduced by** | Commit `d08b532` ("MP-67", 2026-11-23). Not on `dev` |

## Problem

A trainer gets an empty batch list, and 404 on the sheet, session list, summary and export of their own batch.

## Cause

`backend-nestjs/src/users/trainer/attendance/attendance.service.ts` compares `batch.trainer_id` with the logged-in user's id:

| Line | Code | Used by |
|---|---|---|
| 29 | `where: { trainer_id: trainerId, ... }` | Batch list |
| 546 | `trainer_id: trainerId,` | `findBatch`, the ownership check of the other endpoints |

`batch.trainer_id` points to `trainer.id`, not `users.id`. The user is linked through `trainer.user_id`. This link has existed since `0_init`. The MP-67 migration is not the cause.

## Evidence

- Throwaway database, trainer whose `trainer.id` differs from the user id: batch list `[]`, own batch 404.
- Supabase, read only (2026-11-25): 2 trainer rows, none with `id` equal to `user_id`. None of the 7 batches with a trainer would be found.

## Suggested fix

In both places, filter through the trainer relation (check the relation name in `schema.prisma`), for example `trainer: { user_id: trainerId }`. `trainee-information.service.ts` (lines 139 and 274) already looks up the trainer through `user_id`.

`recorded_by`, `created_by`, `updated_by` and `changed_by` point to `users.id` and stay as they are.

No migration change is needed.

## Done when

- A trainer with different `trainer.id` and user id sees their `ONGOING` batches and can save attendance.
- Another trainer's batch still returns 404.
- A unit test uses different user and trainer ids.
