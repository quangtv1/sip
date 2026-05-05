---
title: "Unified Standards Tab"
description: "Merge 3 config tabs (Tiêu chuẩn, Cấu trúc bảng, Danh mục) into one hub; N-sheet profiles; per-standard enum clone"
status: pending
priority: P1
effort: 8h
branch: main
tags: [config, admin, schema, profile, enum, ux]
created: 2026-04-30
blockedBy: []
blocks: []
---

# Unified Standards Tab

Replace 3 separate config tabs with a single "Tiêu chuẩn" hub.
Profile data model changes from fixed `primarySheet/secondarySheet` to dynamic `sheets: string[]`.

## Brainstorm
`plans/reports/brainstorm-260430-0228-unified-standards-tab.md`

## Phase Summary

| # | Phase | File | Status | Effort | Risk |
|---|-------|------|--------|--------|------|
| 1 | Backend — N-sheet profile model + schema API | [phase-01](phase-01-backend-n-sheet-profile-api.md) | pending | 2h | Medium |
| 2 | Backend — Per-standard enum clone | [phase-02](phase-02-backend-per-standard-enum.md) | pending | 1.5h | Low |
| 3 | Frontend — Unified standards hub | [phase-03](phase-03-frontend-standards-hub.md) | pending | 4.5h | Medium |

## Dependencies
- Phase 1 → Phase 2 → Phase 3 (sequential)
- Phase 1 must complete before any frontend changes (API contract changes)

## DB Keys After This Plan

```
AppConfig:
  active_profile              → 'TT05'
  profile:TT05                → { name, sheets: ['Ho_so','Van_ban'], description }
  schema:TT05:Ho_so           → [ fieldDefs ]
  schema:TT05:Van_ban         → [ fieldDefs ]
  enum:THOI_HAN_BAO_QUAN      → [ values ]        ← global (unchanged)
  enum:TT04:THOI_HAN_BAO_QUAN → [ values ]        ← per-standard clone (NEW)
  enum-meta:MY_CUSTOM         → { displayName }   ← custom enum (from prev work)
```

## API Changes

| Old | New |
|-----|-----|
| `POST /config/profiles` body: `{ primarySheet, secondarySheet }` | body: `{ sheets: [] }` |
| `GET/PUT /config/profiles/:id/schema/:sheetType` (primary\|secondary) | `/:sheetName` (actual name) |
| — | `GET /config/profiles/:id/enums` |
| — | `POST /config/profiles/:id/enums/:name/clone` |
| — | `DELETE /config/profiles/:id/enums/:name` |

## Frontend New Files

| New File | Replaces |
|----------|---------|
| `frontend/src/pages/system-config/standards-hub-tab.jsx` | `profile-management-tab.jsx` |
| `frontend/src/pages/system-config/sheet-editor-modal.jsx` | `schema-management-tab.jsx` |
| `frontend/src/pages/system-config/enum-section.jsx` | `enum-management-tab.jsx` |

Old tab files deleted after hub is wired in `SystemConfigPage.jsx`.

## Files Touched

| File | Phase |
|------|-------|
| `backend/src/routes/config-routes.js` | 1 + 2 |
| `backend/src/services/schema-cache-service.js` | 1 + 2 |
| `backend/src/services/field-validator-service.js` | 1 |
| `backend/src/services/excel-parser-service.js` | 1 |
| `frontend/src/pages/SystemConfigPage.jsx` | 3 |
| `frontend/src/pages/system-config/standards-hub-tab.jsx` | 3 (CREATE) |
| `frontend/src/pages/system-config/sheet-editor-modal.jsx` | 3 (CREATE) |
| `frontend/src/pages/system-config/enum-section.jsx` | 3 (CREATE) |
| `frontend/src/pages/system-config/profile-management-tab.jsx` | 3 (DELETE) |
| `frontend/src/pages/system-config/schema-management-tab.jsx` | 3 (DELETE) |
| `frontend/src/pages/system-config/enum-management-tab.jsx` | 3 (DELETE) |
