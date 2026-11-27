# UAT: Trainer Attendance

| Field | Value |
|---|---|
| **Tickets** | MP-67 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 7 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

Detailed steps and the last results are in `review-test-cases.md` on `feature/MP-67`. Several of these failed in the review of 2026-11-27.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-67-1 | Trainer | Open Attendance with a normal trainer account | Your ongoing batches and roster | NOT RUN | |
| UAT-MP-67-2 | Trainer | Mark all present, change exceptions and save | Saved, counts correct | NOT RUN | |
| UAT-MP-67-3 | Trainer | Correct a past session without and then with a reason | Reason required | NOT RUN | |
| UAT-MP-67-4 | Trainer | Save an old copy from a second tab | Told to reload, nothing overwritten | NOT RUN | |
| UAT-MP-67-5 | Trainer | Open today after a trainee enrolls today | The trainee is on the roster | NOT RUN | |
| UAT-MP-67-6 | Trainer | Print a session and export the batch | Clean sheet and complete export | NOT RUN | |
| UAT-MP-67-7 | Trainee | Open the dashboard | Your attendance, percentage never above 100% | NOT RUN | |
