---
title: "Phase 4b: Schema Namespace Migration + Dossier profileId"
status: completed
priority: P1
effort: 4h
risk: Medium-High
blockedBy: []
completed: 2026-04-28
---

# Phase 4b: Schema Namespace Migration + Dossier profileId

## Overview

Migrate schema cache keys from `schema:{sheet}` → `schema:{profileId}:{sheet}`. Update `excel-parser-service` to read sheet names from the active profile. Add `profileId` to `Dossier` model. Ensure backward compatibility with existing DB data.

## Context Links

- Plan: `plan.md`
- Phase 4a (must complete first): `phase-04a-profile-crud-api-and-active-profile-ui.md`
- `backend/src/services/schema-cache-service.js`
- `backend/src/services/excel-parser-service.js`
- `backend/src/services/field-validator-service.js`
- `backend/src/models/dossier-model.js`
- `backend/src/routes/upload-routes.js`
- `backend/src/routes/config-routes.js`

## Migration Strategy

**Lazy migration** — no one-off script. Old keys `schema:Ho_so` and `schema:Van_ban` stay in DB untouched until admin saves a profile-scoped schema via the updated UI. New keys: `schema:TT05:Ho_so`.

`getSchema(profileId, sheet)` lookup order:
1. In-memory `schemaCache` (key = `${profileId}:${sheet}`)
2. DB key `schema:${profileId}:${sheet}`
3. DB key `schema:${sheet}` (legacy fallback — used until admin migrates)
4. Hardcoded default

## Requirements

- `getSchema(profileId, sheet)` replaces `getSchema(sheet)` — new required signature
- Old callers that pass only `sheet` must be updated
- `excel-parser-service` reads `primarySheet`/`secondarySheet` from active profile
- `dossier-model.js` gains `profileId: String` (default `'TT05'`)
- Upload route captures active profile at creation time → stores in dossier
- Schema API routes scoped by profileId: `GET/PUT /api/config/profiles/:id/schema/:sheetType`
- `sheetType` = `primary` or `secondary` (resolved to actual sheet name via profile)
- `SchemaManagementTab` in frontend gains profile selector (Ant Design Select)

## Related Code Files

**Modify:**
- `backend/src/services/schema-cache-service.js` — new `getSchema(profileId, sheet)` + legacy fallback
- `backend/src/services/excel-parser-service.js` — sheet names from active profile
- `backend/src/services/field-validator-service.js` — pass profileId to getSchema
- `backend/src/services/validation-orchestrator.js` — pass profileId through
- `backend/src/models/dossier-model.js` — add profileId field
- `backend/src/routes/upload-routes.js` — capture active profileId
- `backend/src/routes/config-routes.js` — add profile-scoped schema routes
- `frontend/src/pages/system-config/schema-management-tab.jsx` — profile selector

## Implementation Steps

### 1. schema-cache-service.js — new getSchema signature

```js
// schemaCache key changes from 'Ho_so' → 'TT05:Ho_so'
// schemaCache: Map<'profileId:sheet', resolvedField[]>

async function getSchema(profileId, sheet) {
  const cacheKey = `${profileId}:${sheet}`;
  if (schemaCache.has(cacheKey)) return schemaCache.get(cacheKey);

  let baseFields;
  if (!isDbConnected()) {
    baseFields = hardcodedWithKey(sheet);
  } else {
    try {
      // Try profile-scoped key first
      let stored = await AppConfig.findOne({ key: `schema:${profileId}:${sheet}` }).lean();
      // Legacy fallback: old key format
      if (!stored?.value?.length) {
        stored = await AppConfig.findOne({ key: `schema:${sheet}` }).lean();
      }
      if (stored?.value?.length > 0) {
        const hardcoded = getHardcodedSchema(sheet);
        const byName = new Map(hardcoded.map(f => [f.name, f]));
        baseFields = stored.value.map(f => {
          const hf = byName.get(f.name);
          return hf?.regex ? { ...f, regex: hf.regex } : { ...f };
        });
      } else {
        baseFields = hardcodedWithKey(sheet);
      }
    } catch (err) {
      console.error(`[schema-cache] DB error for schema:${profileId}:${sheet}, using hardcoded:`, err.message);
      baseFields = hardcodedWithKey(sheet);
    }
  }

  const resolved = await resolveSchemaEnums(baseFields);
  schemaCache.set(cacheKey, resolved);
  return resolved;
}

// invalidateSchema now takes profileId
function invalidateSchema(profileId, sheet) {
  schemaCache.delete(`${profileId}:${sheet}`);
}
```

Keep old `getSchema(sheet)` as deprecated shim for any missed callers:
```js
// DEPRECATED — remove after Phase 4b complete
async function getSchemaSingleArg(sheet) {
  const profileId = await getActiveProfileId();
  return getSchema(profileId, sheet);
}
```

### 2. excel-parser-service.js — sheet names from profile

```js
const schemaCacheService = require('./schema-cache-service');

async function parseExcel(filePathOrBuffer) {
  const profile = await schemaCacheService.getActiveProfile();
  const primarySheet = profile.primarySheet;
  const secondarySheet = profile.secondarySheet;
  const profileId = await schemaCacheService.getActiveProfileId();

  const [hoSoSchema, vanBanSchema] = await Promise.all([
    schemaCacheService.getSchema(profileId, primarySheet),
    schemaCacheService.getSchema(profileId, secondarySheet),
  ]);

  // Replace hardcoded 'Ho_so'/'Van_ban' references with primarySheet/secondarySheet
  // workbook.Sheets[primarySheet], workbook.Sheets[secondarySheet]
  ...
}
```

Also update `VALID_SHEETS` to be dynamic: remove export of static `VALID_SHEETS` constant; replace with `getValidSheets()` async function that reads from active profile.

### 3. field-validator-service.js — profileId param

`validateHoSoRow` and `validateVanBanRows` need profile context:

```js
async function validateHoSoRow(hoSoRow, profileId) {
  const profile = await schemaCacheService.getProfile(profileId);
  const sheet = profile?.primarySheet || 'Ho_so';
  const schema = await schemaCacheService.getSchema(profileId, sheet);
  ...
}

async function validateVanBanRows(vanBanRows, profileId) {
  const profile = await schemaCacheService.getProfile(profileId);
  const sheet = profile?.secondarySheet || 'Van_ban';
  const schema = await schemaCacheService.getSchema(profileId, sheet);
  ...
}
```

### 4. validation-orchestrator.js — thread profileId

```js
async function runValidation(dossierId) {
  const dossier = await Dossier.findById(dossierId);
  const profileId = dossier.profileId || 'TT05';
  const { hoSoData, vanBanData } = await parseExcel(dossier.filePath);
  const hoSoResult = await validateHoSoRow(hoSoData, profileId);
  const vanBanResult = await validateVanBanRows(vanBanData, profileId);
  ...
}

// validateInline: read profileId from dossier or active profile
async function validateInline(dossierId, sheet, rowData) {
  const dossier = await Dossier.findById(dossierId);
  const profileId = dossier?.profileId || await schemaCacheService.getActiveProfileId();
  const schema = await schemaCacheService.getSchema(profileId, sheet);
  ...
}
```

### 5. dossier-model.js — add profileId

```js
profileId: {
  type: String,
  default: 'TT05',
},
```

Add after `status` field.

### 6. upload-routes.js — capture active profileId on creation

When creating a new dossier from upload, capture the active profile:

```js
const profileId = await schemaCacheService.getActiveProfileId();
const dossier = new Dossier({
  ...otherFields,
  profileId,
});
```

### 7. config-routes.js — profile-scoped schema routes

Replace existing `GET/PUT /schema/:sheet` with profile-scoped versions:

```
GET  /api/config/profiles/:id/schema/primary    → read primary sheet schema
PUT  /api/config/profiles/:id/schema/primary    → update primary sheet schema
POST /api/config/profiles/:id/schema/primary/reset
GET  /api/config/profiles/:id/schema/secondary
PUT  /api/config/profiles/:id/schema/secondary
POST /api/config/profiles/:id/schema/secondary/reset
```

`primary`/`secondary` resolved to actual sheet name via `getProfile(id).primarySheet/.secondarySheet`.

On PUT: store to key `schema:${profileId}:${sheetName}`, call `schemaCacheService.invalidateSchema(profileId, sheetName)`.

Keep old `GET/PUT /schema/:sheet` routes for backward compat during transition (read-only → redirect to active profile).

### 8. frontend schema-management-tab.jsx — profile selector

Add `<Select>` at top of tab to choose which profile's schemas to edit. Default = active profile. On change, reload schemas for selected profile. API calls updated to `/api/config/profiles/{profileId}/schema/{primary|secondary}`.

## Todo

- [ ] Update `getSchema(profileId, sheet)` in `schema-cache-service.js` with legacy fallback
- [ ] Update `invalidateSchema(profileId, sheet)` signature
- [ ] Add `invalidateProfiles()` call in `invalidateAll()`
- [ ] Update `excel-parser-service.js` to read sheet names from active profile
- [ ] Update `field-validator-service.js` — add `profileId` param to both validators
- [ ] Update `validation-orchestrator.js` — thread profileId from dossier
- [ ] Add `profileId` field to `dossier-model.js`
- [ ] Update `upload-routes.js` to capture active profileId at dossier creation
- [ ] Add profile-scoped schema routes to `config-routes.js`
- [ ] Update `schema-management-tab.jsx` with profile selector
- [ ] Verify all existing tests still pass (hardcoded fallback path)
- [ ] Test: upload with TT04 active → dossier stores `profileId: 'TT04'` → validates against TT04 schema

## Success Criteria

- Existing dossiers (no profileId) validate correctly — fallback to TT05
- Upload creates dossier with `profileId` = current active profile
- `getSchema('TT04', 'MucLuc')` returns TT04-specific schema
- Old `schema:Ho_so` DB key still readable as legacy fallback
- Profile-scoped schema API routes work independently per profile

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing validators | Legacy fallback path in getSchema; existing tests run without DB = hardcoded |
| Validation-orchestrator misses profileId | Thread dossier.profileId through; `|| 'TT05'` fallback everywhere |
| Old VALID_SHEETS consumers break | Grep for all `VALID_SHEETS` usages before removing; replace with dynamic lookup |
| Upload route not updated | Search for all `new Dossier(` instantiation points |
