# App Health Log

## 2026-10-22 — Checked by: Chelsea Colleje

**Branch:** `main` @ `fc4406a`  
**Overall Status:** Healthy with warnings

### Check Results

| #  | Check                  | Scope    | Status | Details                          |
|----|------------------------|----------|--------|----------------------------------|
| 1  | ESLint                 | Backend  | PASS   | No errors or warnings            |
| 2  | Build (`nest build`)   | Backend  | PASS   | TypeScript compiled cleanly      |
| 3  | Jest Tests             | Backend  | PASS   | 2 suites, 2 tests (18.8s)       |
| 4  | Prisma Schema          | Backend  | PASS   | Valid — 35 models                |
| 5  | ESLint                 | Frontend | PASS   | No errors or warnings            |
| 6  | TypeScript (`tsc -b`)  | Frontend | PASS   | Type checking passed             |
| 7  | Vite Build             | Frontend | PASS   | Built in 1.21s                   |

### Security Audit

| Package            | Layer    | Severity              | Fix Available |
|--------------------|----------|-----------------------|---------------|
| `qs`               | Backend  | 1 critical, 7 high, 1 moderate | `npm audit fix` |
| `vite/launch-editor` | Frontend | 3 high              | `npm audit fix` |

**Total vulnerabilities:** 12 (9 backend, 3 frontend)

### Warnings

- [ ] **Bundle size** — Frontend JS chunk is 536 KB (above 500 KB threshold). Code-split with dynamic `import()`.
- [ ] **Vite config** — Uses `__dirname` in `vite.config.ts`. Migrate to `import.meta.dirname`.
- [ ] **Prisma update** — CLI recommends updating `prisma` and `@prisma/client` to latest.
- [ ] **Test coverage** — Only 2 test suites for 118 backend source files. Add tests for critical services.

### Project Stats

| Metric             | Backend | Frontend |
|--------------------|---------|----------|
| Source files       | 118     | 84       |
| Modules / Pages    | 19      | 28       |
| Controllers / Components | 18 | 35      |
| Services           | 16      | —        |
| Dependencies       | 19      | 7        |
| Dev dependencies   | 27      | 16       |
| Prisma models      | 35      | —        |

### Environment

- **Node.js:** v22.14.0
- **npm:** 10.9.2
- **Platform:** Windows 11
- **Backend:** `backend-nestjs@0.0.1`
- **Frontend:** `frontend@0.0.0` (Vite 8.2.2)
- **Total commits:** 525
- **Pull requests merged:** 32

---
