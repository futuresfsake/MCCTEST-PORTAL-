# UAT: Uniform Stock at Enrollment

| Field | Value |
|---|---|
| **Tickets** | MP-58 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 4 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-58-1 | Registrar | Enroll with "Uniform distributed" selected | Stock for that size drops by one | NOT RUN | |
| UAT-MP-58-2 | Registrar | Enroll without selecting it | Stock is unchanged | NOT RUN | |
| UAT-MP-58-3 | Registrar | Select it when the size has no stock | Refused with a message and nothing saved | NOT RUN | |
| UAT-MP-58-4 | Admin | Repeat as Admin | Same behaviour | NOT RUN | |
