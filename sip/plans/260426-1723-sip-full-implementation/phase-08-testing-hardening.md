# Phase 8: Testing & Hardening

## Context
- **Priority:** P2
- **Status:** Complete (2026-04-26)
- **Effort:** 80h (actual)
- **Depends on:** Phase 7 (all features implemented)
- **Docs:** `docs/code-standards.md` (testing section)

## Overview

Comprehensive testing (unit, integration, E2E), security audit, performance optimization, and production readiness. No new features — only quality assurance and hardening.

## Key Insights

- Target: >80% code coverage on backend business logic
- Use real MongoDB in integration tests (not mocks — per user preference)
- Sample Excel in `tmp/` for realistic test data
- Performance targets: <2s validation (1000 rows), <30s packaging, <1s dashboard
- Security: input validation, JWT, CORS, rate limiting, XSS prevention

## Files to Create

```
backend/
  tests/
    unit/
      field-validator.test.js
      cross-validator.test.js
      pdf-mapping-validator.test.js
      folder-structure-validator.test.js
      excel-parser.test.js
      auto-fix-service.test.js
      workflow-engine.test.js
      mets-generator.test.js
      ead-generator.test.js
      premis-generator.test.js
      checksum-service.test.js
    integration/
      auth-api.test.js
      upload-validate-api.test.js
      workflow-api.test.js
      packaging-api.test.js
      dossier-api.test.js
      stats-api.test.js
    e2e/
      full-workflow.test.js           # Upload → Validate → Approve → Package → Done
    fixtures/
      valid-dossier/                  # Complete valid dossier folder
      invalid-dossier/                # Dossier with known errors
      expected-errors.json            # Expected validation output
    helpers/
      test-setup.js                   # DB connection, cleanup, seed
      test-auth-helper.js             # Generate test JWT tokens
  jest.config.js

frontend/
  src/
    __tests__/
      ExcelGrid.test.jsx
      ErrorPanel.test.jsx
      UploadPanel.test.jsx
      WorkflowBar.test.jsx

.github/
  workflows/
    ci.yml                           # GitHub Actions CI pipeline
```

## Implementation Steps

### Unit Tests

1. **Field validators** — Test each validation rule: required (empty, null, whitespace), enum (exact match, partial, wrong), date (valid DD/MM/YYYY, serial number, wrong format), positive int (0, negative, string). Cover all 18 Ho_so + 21 Van_ban fields.

2. **Cross-validators** — Test: document count match/mismatch, MaLuuTru prefix match/mismatch, duplicate MaLuuTru, PDF mapping (present, missing, extra).

3. **Excel parser** — Test: valid 2-sheet Excel, missing sheet, empty rows, date serial numbers, Unicode Vietnamese text.

4. **Auto-fix service** — Test: date reformat suggestions, trim whitespace, fuzzy enum match, extract numbers. Verify suggested values are exact enum strings.

5. **Workflow engine** — Test: all valid transitions, invalid transitions (skip, wrong role), pre-conditions (ERRORs block approval), terminal state.

6. **XML generators** — Test: METS well-formed, EAD maps all fields, PREMIS includes file info. Validate against XSD if available.

### Integration Tests

7. **Auth API** — Login with valid/invalid creds, token expiry, role-based access, password change.

8. **Upload + Validate API** — Upload valid dossier → get validation result. Upload invalid → get errors. Inline validation for single field.

9. **Workflow API** — Full state transition: UPLOAD → VALIDATED → APPROVED → DONE. Test rejection flow. Test RBAC enforcement per endpoint.

10. **Packaging API** — Package approved dossier, verify ZIP contents, verify job status polling.

11. **Stats API** — Verify aggregation returns correct counts after seeding test data.

### E2E Test

12. **Full workflow** — Single test covering complete flow: seed user → login → upload dossier → validate → fix errors → save → approve → package → verify ZIP in temp storage → verify audit log entries.

### Security Hardening

13. **Input validation** — Add express-validator or Joi on all endpoints. Sanitize string inputs. Reject unexpected fields.

14. **Rate limiting** — Add express-rate-limit: 100 req/min for API, 5 req/min for login.

15. **CORS** — Configure whitelist from env `CORS_ORIGINS`.

16. **Helmet** — Add helmet middleware for security headers.

17. **File upload limits** — Multer limits: 100MB max file size, allowed extensions (xlsx, pdf, zip).

### Performance

18. **Virtual scrolling** — Verify ExcelGrid handles 1000+ rows without lag.

19. **MongoDB indexes** — Audit all queries, ensure indexes exist for common patterns.

20. **Code splitting** — Lazy load routes (Dashboard, Admin, AuditLog). Verify bundle size.

21. **Compression** — Add gzip compression middleware.

### CI Pipeline

22. **GitHub Actions** — CI workflow: install → lint → unit tests → integration tests (with MongoDB service). Run on push to main and PRs.

### Production Readiness

23. **Environment config** — Verify all env vars documented in `.env.example`. Validate required vars on startup.

24. **Docker production build** — Multi-stage Dockerfile. Non-root user. Health checks in docker-compose.

25. **Logging** — Verify Winston logs at appropriate levels. No secrets in logs.

## Todo

- [x] Unit tests: field validators (all rules)
- [x] Unit tests: cross-validators
- [x] Unit tests: Excel parser
- [x] Unit tests: auto-fix service
- [x] Unit tests: workflow engine
- [x] Unit tests: XML generators (covered in integration tests)
- [x] Integration tests: auth API
- [x] Integration tests: upload + validate
- [x] Integration tests: workflow transitions
- [x] Integration tests: packaging (via workflow API)
- [x] E2E: full workflow test
- [x] Security: input validation middleware
- [x] Security: rate limiting
- [x] Security: CORS + Helmet
- [x] Security: file upload limits
- [x] Performance: virtual scrolling verified
- [x] Performance: MongoDB indexes audit
- [x] Performance: code splitting + compression
- [x] CI: GitHub Actions pipeline
- [x] Production: env config validation
- [x] Production: Docker optimization

## Success Criteria

1. >80% unit test coverage on backend business logic
2. All integration tests pass with real MongoDB
3. E2E test completes full workflow without errors
4. No known security vulnerabilities (rate limit, CORS, XSS, input validation)
5. Validation <2s for 1000-row Excel
6. Dashboard loads <1s
7. Packaging <30s for 100-page dossier
8. CI pipeline passes on clean checkout
9. Docker production build starts without errors
10. Zero console.log in production code

## Test Matrix

| Layer | What | Tool | Coverage Target |
|-------|------|------|----------------|
| Unit | Validators, parsers, generators | Jest | >80% |
| Unit | React components | React Testing Library | Key interactions |
| Integration | API endpoints | Jest + Supertest | All routes |
| E2E | Full workflow | Jest + Supertest | 1 happy path |
| Security | Input validation, auth | Manual + automated | Checklist |
| Performance | Load, response time | Artillery / manual | Targets met |
