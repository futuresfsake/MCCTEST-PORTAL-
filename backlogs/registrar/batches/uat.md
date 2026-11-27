# UAT: Batch Configuration

| Field | Value |
|---|---|
| **Tickets** | MP-15 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 4 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-15-1 | Registrar | Create a batch choosing program and trainer | The batch code is generated and live lists are offered | NOT RUN | |
| UAT-MP-15-2 | Registrar | Filter the batch list | Matching batches and remaining slots | NOT RUN | |
| UAT-MP-15-3 | Registrar | Move a batch forward in status, then try to go back | Forward works, backward is refused | NOT RUN | |
| UAT-MP-15-4 | Registrar | Edit a locked field of an ongoing batch | Not allowed | NOT RUN | |
