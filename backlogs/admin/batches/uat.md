# UAT: Admin Batches and Batch Trainees

| Field | Value |
|---|---|
| **Tickets** | MP-22, MP-23 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 5 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-22-1 | Admin | Create a batch | A name is generated and it appears in the list | NOT RUN | |
| UAT-MP-22-2 | Admin | Edit it and change its status | Pre-filled form, confirmation, saved | NOT RUN | |
| UAT-MP-23-1 | Admin | Open the trainees of a batch and filter by status | Correct trainees or an empty state | NOT RUN | |
| UAT-MP-23-2 | Admin | Set a trainee to Withdrawn or Dropped without a reason, then with one | Refused without, saved with | NOT RUN | |
| UAT-MP-23-3 | Admin | Open a trainee | Full profile, ID card number cannot be edited | NOT RUN | |
