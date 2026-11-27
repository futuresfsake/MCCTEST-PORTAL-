# UAT: Payments

| Field | Value |
|---|---|
| **Tickets** | MP-25 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 4 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-25-1 | Registrar | Record a payment for an enrolled trainee | A unique receipt number and the amount in pesos | NOT RUN | |
| UAT-MP-25-2 | Registrar | Check the payment reasons and submit invalid input | Only the four reasons, and a clear error | NOT RUN | |
| UAT-MP-25-3 | Registrar | Click Save twice quickly | Only one payment is recorded | NOT RUN | |
| UAT-MP-25-4 | Admin | Search, filter, sort, refresh, then open a receipt | Filters are kept, totals match, details show | NOT RUN | |
