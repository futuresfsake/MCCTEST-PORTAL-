# UAT: Sprint Acceptance

| Field | Value |
|---|---|
| **Tickets** | MP-7, MP-17, MP-27, MP-34 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 10 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-7-1 | Admin | Open the landing page and log in with the seeded Admin account | The Admin Dashboard opens | NOT RUN | |
| UAT-MP-7-2 | Visitor | Log in with a wrong password | An error shows on the form | NOT RUN | |
| UAT-MP-7-3 | Admin | Refresh the page, then log out | Still logged in after refresh; logout returns to the landing page | NOT RUN | |
| UAT-MP-17-1 | Registrar | Log in as each staff role and use every sidebar link | Only that role's pages, no missing page or crash | NOT RUN | |
| UAT-MP-17-2 | Admin | Create, edit and archive a program, then create a batch | Success messages, and the archived program cannot be chosen | NOT RUN | |
| UAT-MP-17-3 | Admin | Deactivate a staff account and try to log in with it | Login is refused | NOT RUN | |
| UAT-MP-27-1 | Admin | Create a batch, change its status and open its trainees | The list and statuses update with a success message | NOT RUN | |
| UAT-MP-27-2 | Registrar | Open pages with no records and submit empty forms | Empty states and clear validation messages | NOT RUN | |
| UAT-MP-34-1 | Registrar | Enroll a trainee through every step | Saved as ENROLLED with an ID card number | NOT RUN | |
| UAT-MP-34-2 | Registrar | Submit with missing or invalid information | Enrollment is not saved and an error explains why | NOT RUN | |
