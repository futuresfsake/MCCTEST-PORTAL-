# UAT: Legacy Data Import

| Field | Value |
|---|---|
| **Tickets** | MP-44 |
| **Written** | 2026-11-27, from the acceptance criteria and test cases |
| **Result** | 6 scenarios, **NOT RUN** |

Run these on a test environment with test accounts. Do not create test data on the shared database. Mark each **PASS**, **FAIL** or **BLOCKED** and sign with name and date.

| UAT | As | Do this | You should see | Result | Tester and date |
|---|---|---|---|---|---|
| UAT-MP-44-1 | Admin | Upload an Excel file with good and bad rows | A preview separating valid and flagged rows with reasons | NOT RUN | |
| UAT-MP-44-2 | Admin | Confirm the import | Only valid rows are added | NOT RUN | |
| UAT-MP-44-3 | Admin | Download the rejected rows | An Excel file with the reason for each | NOT RUN | |
| UAT-MP-44-4 | Admin | Upload a student who already exists | Flagged as duplicate, not added twice | NOT RUN | |
| UAT-MP-44-5 | Admin | Import 1,000 rows and open the import history | No timeout, and who, when and counts are logged | NOT RUN | |
| UAT-MP-44-6 | Registrar | Open the import page | Access is blocked | NOT RUN | |
