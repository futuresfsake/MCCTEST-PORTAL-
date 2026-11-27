# UAT: Admin Announcements

| Field | Value |
|---|---|
| **Tickets** | MP-21 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 4 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-21-1 | Admin | Post a global, a program and a batch announcement | Each is saved with its scope | NOT RUN | |
| UAT-MP-21-2 | Admin | Submit with empty content | Refused with a message | NOT RUN | |
| UAT-MP-21-3 | Admin | Edit and then delete an announcement posted by someone else | Both work | NOT RUN | |
| UAT-MP-21-4 | Trainee | Open the dashboard and dismiss an announcement, then log in again | Only relevant ones show; the dismissed one returns | NOT RUN | |
