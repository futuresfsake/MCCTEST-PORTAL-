# TECH-07: Technical — a NUL character in a text field gives a server error

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Technical Debt / Input handling                                                         |
| Priority    | Low                                                                                     |
| Discovered  | 2026-11-27, Definition of Done audit of MP-60                                           |
| Affected    | Seen on the clearance submit (`purpose_of_request`, `other_specify`) and the withdrawal submit (`requested_reason`). Other text fields were not tested |
| Status      | **LOGGED, NOT FIXED**                                                                   |
| Assignee    | Unassigned                                                                              |

---

## Problem

PostgreSQL cannot store the NUL character (`\u0000`) in text. The request passes validation, the insert fails, and the API answers 500 instead of 400.

## How it was seen

On a throwaway database, `POST /api/trainee/clearance-requests` and `POST /api/trainee/withdrawal-requests` with the text `a\u0000b` both returned 500. Nothing was saved.

## Why it is low

The pages cannot easily send this character, nothing is saved and no data is exposed. The effect is a wrong status code and an error in the server log.

## Suggested fix

Handle it once for every text field: a global pipe that refuses (400) or strips `\u0000`, or a shared validator next to the `Trim` decorator. Add a test on one endpoint of each kind.

## Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 1 | A NUL character in any text field gives 400 with a clear message, or is removed before saving | NOT STARTED |
| 2 | Nothing returns 500 for it | NOT STARTED |
