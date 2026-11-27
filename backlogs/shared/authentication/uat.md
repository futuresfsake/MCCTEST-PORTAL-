# UAT: Authentication and Landing Page

| Field | Value |
|---|---|
| **Tickets** | MP-4, MP-5, MP-6 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 7 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-4-1 | Admin | Log in with correct details | The Admin Dashboard opens | NOT RUN | |
| UAT-MP-4-2 | Visitor | Log in with a wrong password | An error, and no access | NOT RUN | |
| UAT-MP-4-3 | Trainee | Log in with each role in turn | Each lands on its own dashboard | NOT RUN | |
| UAT-MP-4-4 | Trainee | Type the address of an admin page | The 403 page | NOT RUN | |
| UAT-MP-4-5 | Visitor | Open a protected page while logged out | Sent to login | NOT RUN | |
| UAT-MP-5-1 | Admin | Log in with the seeded Admin account on a new environment | Login works | NOT RUN | |
| UAT-MP-6-1 | Registrar | Log in, refresh, then log out and press Back | Session survives refresh and is gone after logout | NOT RUN | |
