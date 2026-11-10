# TECH-06: Technical — a search for `%` or `_` matches every row

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Technical Debt / Input handling                                                         |
| Priority    | Low                                                                                     |
| Discovered  | 2026-11-10, while auditing `dev` before staging (admin withdrawal list, MP-49)          |
| Affected    | `backend-nestjs/src/withdrawal/withdrawal.service.ts` (the trainer list and the shared registrar and admin list). Other services that search with `contains` were not tested |
| Status      | **LOGGED, NOT FIXED**                                                                   |
| Assignee    | Unassigned                                                                              |
| Related     | `requirements.service.ts` already has an `escapeLike` helper that does this correctly   |

---

## Problem

The withdrawal lists search the trainee's name and system ID with Prisma `contains`. Prisma does not escape the SQL wildcards `%` and `_` in that value. A search for `%` or for `_` matches every row, and a search such as `TRN_26_004` matches `TRN-26-004` because `_` stands for any one character.

## How it was seen

On a throwaway database with 17 withdrawal requests, `GET /api/admin/withdrawal-requests?status=ALL&search=%25` returned all 17, and `search=_` returned all 17. A search with no match (`zzz`) returned 0, and `TRN-26-004` returned 1.

## Why it is low

It is not an injection: the value is still a bound parameter, and the result only holds rows the logged-in role is already allowed to see. The effect is an unexpected result, not a leak. The registrar list shares the same code, so the same behaviour applies there.

## Suggested fix

Escape `%`, `_` and the escape character in the term before it reaches `contains`, the way `escapeLike` does in `requirements.service.ts`, or move that helper to a shared file and use it in every search. Add a test that `%` and `_` match only text that really contains them. Check the other services that search with `contains`: announcements, enrollments, inventory, payments, programs and batches.
