# UAT: Trainer Announcements

| Field | Value |
|---|---|
| **Tickets** | MP-39 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 5 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-39-1 | Trainer | Create a batch announcement and a program announcement | Both listed, showing only your own posts | NOT RUN | |
| UAT-MP-39-2 | Trainer | Check the scope picker | No global scope | NOT RUN | |
| UAT-MP-39-3 | Trainer | Submit blank or too long text | Refused with a message | NOT RUN | |
| UAT-MP-39-4 | Trainer | Edit your own announcement | Saved | NOT RUN | |
| UAT-MP-39-5 | Trainee | Log in as a trainee of that batch | The announcement shows on the dashboard | NOT RUN | |
