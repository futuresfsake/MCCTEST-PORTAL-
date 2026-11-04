# SEC-02: Security — `multer` denial-of-service advisory in the backend

| Field       | Value                                                                                   |
|-------------|-----------------------------------------------------------------------------------------|
| Category    | Security (vulnerable dependency)                                                        |
| Severity    | **High** (per `npm audit`)                                                              |
| Discovered  | 2026-11-03, `npm audit --omit=dev` on `dev` after PR #46                                |
| Affected    | `backend-nestjs`: `multer` 2.0.0 – 2.4.0, pulled in by `@nestjs/platform-express`        |
| Advisory    | GHSA-q7qp-rjg7-q26m — denial of service through a pending asynchronous `fileFilter` after the request is torn down |
| Frontend    | Not affected (`npm audit` reports 0 vulnerabilities)                                    |
| Status      | **FIXED on `dev` 2026-11-04 (PR #75). Not yet on `staging` or `main`.**                  |
| Assignee    | Chelsea Cllj                                                                            |

---

## Problem

`npm audit --omit=dev` in `backend-nestjs` reports 2 high severity findings: `multer`, and
`@nestjs/platform-express` which depends on it. Only file upload routes that use `multer` are
exposed to the denial of service.

## Fix when picked up

1. Run `npm audit fix` in `backend-nestjs` and review the `package-lock.json` change.
2. Re-run `npm audit --omit=dev`, `npx tsc --noEmit`, ESLint and `npx jest`.
3. Check that every file upload route still works.

## Acceptance Criteria

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | `npm audit --omit=dev` in `backend-nestjs` reports 0 high or critical findings | PASS | 2026-11-04: 0 vulnerabilities. `multer` pinned to 2.5.0 with an `overrides` entry in `package.json`, lockfile updated (PR #75) |
| 2 | Backend builds, lints and passes `jest` after the update | PASS | `tsc`, ESLint, `nest build` and 101 of 101 tests pass on `dev` at `64e85d7` |
| 3 | File upload routes still work after the update | NOT APPLICABLE | The backend has no upload routes today. Re-check when the first one is added (MP-41 photo upload) |

## Summary: 2/3 PASS, 1 not applicable. FIXED on `dev` (PR #75)
