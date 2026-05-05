---
title: "Phase 4: Generalized Validation Profile System"
description: "Profile-scoped schemas with configurable sheet names, extended field types (float/boolean/regex/email/url/range), and dependent-enum"
status: completed
priority: P1
effort: 14h
branch: main
tags: [profile, schema, validation, config, admin]
created: 2026-04-28
completed: 2026-04-28
blockedBy: []
blocks: []
---

# Phase 4: Generalized Validation Profile System

Builds on Phase 2+3 (config-schema-management). Adds named validation profiles, profile-scoped schema namespacing, configurable Excel sheet names, and 7 new field types.

## Context

- Brainstorm: `plans/reports/brainstorm-260428-0821-generalized-validation-profile-system.md`
- Predecessor plan: `plans/260428-0700-config-schema-management/plan.md` (completed)

## DB Keys (after this phase)

```
AppConfig:
  active_profile         → 'TT05'
  profile:TT05           → { name, primarySheet, secondarySheet, description }
  profile:TT04           → { name, primarySheet, secondarySheet, description }
  schema:TT05:Ho_so      → [ fieldDefs ]
  schema:TT05:Van_ban    → [ fieldDefs ]
  enum:NGON_NGU          → [ values ]   (unchanged — global, not profile-scoped)
```

## Phase Summary

| # | Phase | File | Status | Effort | Risk |
|---|-------|------|--------|--------|------|
| 4a | Profile CRUD API + UI tab | [phase-04a](phase-04a-profile-crud-api-and-active-profile-ui.md) | completed | 4h | Medium |
| 4b | Schema namespace migration + dossier profileId | [phase-04b](phase-04b-schema-namespace-migration-and-dossier-profileid.md) | completed | 4h | Medium-High |
| 4c | Extended types: float, boolean, regex, email, url, range | [phase-04c](phase-04c-extended-field-types.md) | completed | 3h | Low |
| 4d | Dependent-enum cascading type | [phase-04d](phase-04d-dependent-enum-type.md) | completed | 3h | Medium |

## Key Dependencies

- Phase 4a must complete before 4b (profile API used in migration)
- Phase 4b must complete before 4c/4d (schema service signature changes)
- Phase 4c and 4d can run in parallel after 4b

## Files Touched

| File | 4a | 4b | 4c | 4d |
|------|----|----|----|----|
| `backend/src/services/schema-cache-service.js` | Profile methods | New getSchema sig | — | Resolve dep-enum |
| `backend/src/routes/config-routes.js` | Profile routes | Schema key migrate | — | — |
| `backend/src/services/excel-parser-service.js` | — | Sheet from profile | — | — |
| `backend/src/services/field-validator-service.js` | — | Updated calls | New types | dep-enum type |
| `backend/src/models/dossier-model.js` | — | +profileId field | — | — |
| `backend/src/routes/upload-routes.js` | — | Capture profileId | — | — |
| `frontend/src/pages/SystemConfigPage.jsx` | +Tiêu chuẩn tab | — | — | — |
| `frontend/src/pages/system-config/profile-management-tab.jsx` | Create | — | — | — |
| `frontend/src/pages/system-config/schema-management-tab.jsx` | — | Profile selector | +new types | +dep-enum UI |
