# UAT: Enrollment Form

| Field | Value |
|---|---|
| **Tickets** | MP-16 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 4 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-16-1 | Registrar | Search an existing trainee and enroll them in a new program | Their record is reused | NOT RUN | |
| UAT-MP-16-2 | Registrar | Enroll a new trainee through all steps | Saved with a receipt number and shown in the list | NOT RUN | |
| UAT-MP-16-3 | Registrar | Pick a batch | Only open batches with free slots are offered | NOT RUN | |
| UAT-MP-16-4 | Registrar | Enroll the same trainee in the same batch again | Refused | NOT RUN | |
