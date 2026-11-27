# UAT: Uniform Distribution

| Field | Value |
|---|---|
| **Tickets** | MP-53 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 4 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-53-1 | Registrar | Mark a uniform as distributed | Marked, and stock drops by one | NOT RUN | |
| UAT-MP-53-2 | Registrar | Distribute with no stock, then to someone who already has one | Both refused with a message | NOT RUN | |
| UAT-MP-53-3 | Registrar | Pick a different size, then distribute | That size is deducted | NOT RUN | |
| UAT-MP-53-4 | Encoder | Open the page | Access is blocked | NOT RUN | |
