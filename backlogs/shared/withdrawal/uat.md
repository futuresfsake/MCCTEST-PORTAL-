# UAT: Withdrawal Pipeline

| Field | Value |
|---|---|
| **Tickets** | MP-45, MP-46, MP-48, MP-47, MP-49 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 9 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-45-1 | Developer | Apply the migration to a test database | It applies and a trainee cannot hold two open requests | NOT RUN | |
| UAT-MP-46-1 | Trainee | Submit a withdrawal request and watch its progress | It shows as waiting for the Trainer | NOT RUN | |
| UAT-MP-46-2 | Trainee | Submit a second one while the first is open | Refused | NOT RUN | |
| UAT-MP-48-1 | Trainer | Open your pending requests and validate one | It moves to the Registrar | NOT RUN | |
| UAT-MP-48-2 | Trainer | Look for another trainer's request | Not visible | NOT RUN | |
| UAT-MP-47-1 | Registrar | Validate a request the Trainer approved | It moves to the Admin | NOT RUN | |
| UAT-MP-47-2 | Registrar | Try a request the Trainer has not approved | Not possible | NOT RUN | |
| UAT-MP-49-1 | Admin | Give the final sign-off | The trainee is withdrawn and set inactive | NOT RUN | |
| UAT-MP-49-2 | Trainee | Check the request | Each step and its result | NOT RUN | |
