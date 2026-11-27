# MP-44: Legacy Data Import from Excel

Route `/admin/import-data`, `ADMIN` only. Criteria copied from Jira on 2026-11-27. Test with `uat.md`.

**Status key:** NOT VERIFIED means the criterion has not been checked for this file. It does not mean it fails.

---

## Acceptance Criteria

## MP-44: Legacy Data Import — Excel Student Records Ingestion

Jira status on 2026-11-27: **To Do**. 12 criteria.

### Acceptance Criteria

| # | Criteria | Status | Notes |
|---|---|---|---|
| DI-1 | Admin can upload an Excel file (`.xlsx` / `.xls`) from the import page. | NOT VERIFIED | |
| DI-2 | The system parses the file and maps columns to the expected database fields. | NOT VERIFIED | |
| DI-3 | Data is cleaned: whitespace trimmed, dates standardized, casing normalized. | NOT VERIFIED | |
| DI-4 | Each row is validated against database constraints before insertion. | NOT VERIFIED | |
| DI-5 | A preview screen shows valid rows (ready to import) and flagged rows (errors/warnings) with clear reasons. | NOT VERIFIED | |
| DI-6 | On confirmation, valid rows are inserted in a single transaction — if the transaction fails, nothing is inserted. | NOT VERIFIED | |
| DI-7 | Rejected/flagged rows can be downloaded as an annotated Excel file showing why each was rejected. | NOT VERIFIED | |
| DI-8 | Duplicate detection: students already in the system are flagged, not duplicated. | NOT VERIFIED | |
| DI-9 | Enrollment status is inferred from existing system records, not from a column in the Excel file. | NOT VERIFIED | |
| DI-10 | Only Admin role can access the import page and endpoints; other roles get 403. | NOT VERIFIED | |
| DI-11 | Large files (1,000+ rows) are handled without timeout — use streaming or chunked processing if needed. | NOT VERIFIED | |
| DI-12 | Import history is logged: who imported, when, how many records inserted, how many rejected. | NOT VERIFIED | |
