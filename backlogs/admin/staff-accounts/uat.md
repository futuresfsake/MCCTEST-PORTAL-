# UAT: Staff Accounts

| Field | Value |
|---|---|
| **Tickets** | MP-14 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 5 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-14-1 | Admin | Create a staff account for each role | The account appears and can log in | NOT RUN | |
| UAT-MP-14-2 | Admin | Create a second account with the same email | Refused with a message | NOT RUN | |
| UAT-MP-14-3 | Admin | Edit a staff member's details | Saved | NOT RUN | |
| UAT-MP-14-4 | Admin | Deactivate, try to log in, then reactivate | Blocked while inactive, works after | NOT RUN | |
| UAT-MP-14-5 | Admin | Send a password reset | The staff member can set a new password | NOT RUN | |
