# Phase 01 — Backend: N-Sheet Profile Model + Schema API

## Overview
- **Priority:** P1
- **Status:** pending
- **Effort:** ~2h
- **Risk:** Medium — breaking data model change, inline migration required

## Key Insight
`primarySheet + secondarySheet` → `sheets: string[]`. All consumers updated.
New schema route: `/:sheetName` (actual name) instead of `/:sheetType` (primary|secondary).
Both old and new sheetType accepted during transition (resolveSheetName handles both).

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/schema-cache-service.js` | `defaultProfile()` + `getProfile()` migration |
| `backend/src/routes/config-routes.js` | Profile CRUD + schema route param |
| `backend/src/services/field-validator-service.js` | `sheets[0]` / `sheets[1]` refs |
| `backend/src/services/excel-parser-service.js` | `sheets[0]` / `sheets[1]` refs |

## Implementation Steps

### 1. `schema-cache-service.js` — defaultProfile + migration

```js
// defaultProfile: return sheets[] instead of primarySheet/secondarySheet
function defaultProfile(profileId) {
  if (profileId === 'TT05') {
    return { name: 'Thông tư 05', sheets: ['Ho_so', 'Van_ban'], description: '' };
  }
  return null;
}

// getProfile: inline migration — convert old shape to new if sheets missing
async function getProfile(profileId) {
  // ... existing cache + DB lookup ...
  if (data && !data.sheets) {
    // Migrate: { primarySheet, secondarySheet } → { sheets: [] }
    const sheets = [];
    if (data.primarySheet) sheets.push(data.primarySheet);
    if (data.secondarySheet) sheets.push(data.secondarySheet);
    data = { ...data, sheets };
    delete data.primarySheet;
    delete data.secondarySheet;
  }
  // ... cache and return ...
}
```

### 2. `config-routes.js` — resolveSheetName + profile CRUD

**resolveSheetName** — accept both legacy types and actual names:
```js
async function resolveSheetName(profileId, sheetNameOrType) {
  const profile = await schemaCacheService.getProfile(profileId);
  if (!profile) return null;
  if (sheetNameOrType === 'primary') return profile.sheets?.[0] || null;
  if (sheetNameOrType === 'secondary') return profile.sheets?.[1] || null;
  // New: actual sheet name — validate it belongs to this profile
  return profile.sheets?.includes(sheetNameOrType) ? sheetNameOrType : null;
}
```

**Profile POST body** change — accept `sheets[]` (also accept legacy `primarySheet/secondarySheet` and convert):
```js
router.post('/profiles', async (req, res, next) => {
  const { id, name, sheets, primarySheet, secondarySheet, description = '' } = req.body;
  // Normalize: accept either sheets[] or legacy primarySheet+secondarySheet
  const normalizedSheets = sheets?.length
    ? sheets
    : [primarySheet, secondarySheet].filter(Boolean);
  if (!normalizedSheets.length)
    return next(new ValidationError('Cần ít nhất 1 sheet'));
  // ... validate, save { name, sheets: normalizedSheets, description } ...
});
```

**Profile PUT** — same normalization as POST.

**Schema routes** — no code change needed (resolveSheetName already handles both).
Just update error message: "Tên sheet không thuộc tiêu chuẩn này".

**GET /profiles** response — include `sheets[]` (and drop primarySheet/secondarySheet).
Profile listing already returns `d.value` directly, so once DB shape is `sheets[]` it works.

**Note:** TT05 default profile never saved to DB, always from `defaultProfile()`.
When first saving TT05, use new `sheets[]` shape.

### 3. `field-validator-service.js`

```js
// validateHoSoRow
const sheet = profile?.sheets?.[0] || profile?.primarySheet || 'Ho_so';

// validateVanBanRows
const sheet = profile?.sheets?.[1] || profile?.secondarySheet || 'Van_ban';
```

### 4. `excel-parser-service.js`

```js
const primarySheet   = profile?.sheets?.[0] || profile?.primarySheet   || 'Ho_so';
const secondarySheet = profile?.sheets?.[1] || profile?.secondarySheet || 'Van_ban';
```

## Todo

- [ ] Update `defaultProfile()` in `schema-cache-service.js`
- [ ] Add inline migration to `getProfile()` in `schema-cache-service.js`
- [ ] Update `resolveSheetName()` in `config-routes.js` to accept actual names
- [ ] Update `POST /profiles` to accept `sheets[]` + legacy fallback
- [ ] Update `PUT /profiles/:id` same way
- [ ] Update `GET /profiles` list to normalize shape in response
- [ ] Fix `validateHoSoRow` + `validateVanBanRows` in `field-validator-service.js`
- [ ] Fix `parseExcel` in `excel-parser-service.js`
- [ ] Manual test: create new profile with `sheets:["Ho_so","Van_ban"]`, edit schema, reload

## Success Criteria

- `GET /api/config/profiles` returns `sheets: ["Ho_so","Van_ban"]` (not primarySheet)
- Old TT05 profile still works (migration converts at read time)
- `GET /api/config/profiles/TT05/schema/Ho_so` returns fields ✓
- `GET /api/config/profiles/TT05/schema/primary` still works (backward compat) ✓
- `validateHoSoRow` + `validateVanBanRows` still pass existing tests

## Risk Mitigation

- Migration is READ-ONLY (no DB write on conversion) → zero data loss
- Backward compat: legacy `primary|secondary` still resolve correctly
- `primarySheet/secondarySheet` fallbacks kept in field-validator + excel-parser
