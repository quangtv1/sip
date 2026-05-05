---
title: "Configuration Management System"
description: "Add SystemConfigPage with MinIO config, dynamic enum management, and dynamic field schema editing"
status: completed
priority: P1
effort: 12h
branch: main
tags: [config, admin, schema, enums]
created: 2026-04-28
completed: 2026-04-28
---

# Configuration Management System

3 sequential phases — each independently deployable. All config stored in `app_configs` collection via `AppConfig` model (key/value pattern already established for MinIO).

## Data Flow

```
Admin UI (SystemConfigPage)
  |
  v
POST/PUT /api/config/* --> config-routes.js --> AppConfig (MongoDB)
  |                                                |
  v                                                v
schema-cache-service.js <-- reads on miss <-- app_configs collection
  |
  v
field-validator-service.js / excel-parser-service.js (consumers)
```

## Phase Summary

| # | Phase | Status | Effort | Risk | File |
|---|-------|--------|--------|------|------|
| 1 | [SystemConfigPage (MinIO UI)](phase-01-system-config-page.md) | Completed | 2h | Low | phase-01 |
| 2 | [Dynamic Enum Management](phase-02-dynamic-enum-management.md) | Completed | 4h | Medium | phase-02 |
| 3 | [Dynamic Field Schema](phase-03-dynamic-field-schema.md) | Completed | 6h | High | phase-03 |

## Dependencies

- Phase 1: standalone, no blockers
- Phase 2: depends on Phase 1 (tab added to same page), creates `schema-cache-service.js` used by Phase 3
- Phase 3: depends on Phase 2 (extends cache service, adds tab to same page)

## Key Architectural Decisions

1. **Single cache service** (`schema-cache-service.js`) for both enums and schemas — avoids duplicate DB/cache logic
2. **Fallback to hardcoded** — if DB has no config, use existing frozen arrays/objects from `enum-definitions.js` and `ho-so-schema.js` / `van-ban-schema.js`
3. **Explicit invalidation only** — no TTL; cache cleared on save via `invalidateAll()` / `invalidateSchema()`
4. **AppConfig model reuse** — keys: `enum:{name}`, `schema:Ho_so`, `schema:Van_ban`
5. **All routes under `/api/config`** — existing router already mounted at this path with Admin RBAC

## Rollback Strategy

- Phase 1: Delete `SystemConfigPage.jsx`, remove route from `App.jsx` — zero impact on existing functionality
- Phase 2: Remove enum routes from `config-routes.js`, delete `schema-cache-service.js`, revert validator to sync imports — existing hardcoded enums resume
- Phase 3: Remove schema routes, revert validator/parser to direct imports — hardcoded schemas resume

## Test Strategy

- **Existing tests**: `field-validator.test.js`, `cross-validator.test.js`, `pdf-mapping-validator.test.js`, `folder-structure-validator.test.js` — must remain green after each phase
- Phase 2-3: Add unit tests for `schema-cache-service.js` (cache hit, miss, invalidation, fallback)
- Phase 3: Add schema validation tests (reject duplicate indices, missing required props, invalid types)

## Files Touched Per Phase

| File | P1 | P2 | P3 |
|------|----|----|-----|
| `frontend/src/pages/SystemConfigPage.jsx` | Create | Add tab | Add tab |
| `frontend/src/App.jsx` | Add route | - | - |
| `backend/src/routes/config-routes.js` | - | Add enum routes | Add schema routes |
| `backend/src/services/schema-cache-service.js` | - | Create | Extend |
| `backend/src/services/field-validator-service.js` | - | Update | Update |
| `backend/src/services/excel-parser-service.js` | - | - | Update |
| `backend/src/validators/enum-definitions.js` | - | Add async exports | - |

Note: `SystemConfigPage.jsx` touched in all 3 phases — sequential execution required to avoid conflicts.
