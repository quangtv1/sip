# Phase 02 — Backend: Per-Standard Enum Clone

## Overview
- **Priority:** P1
- **Status:** pending (blocked by Phase 01)
- **Effort:** ~1.5h
- **Risk:** Low — additive change, global fallback preserved

## Key Design

```
Lookup order: enum:profileId:NAME → enum:NAME (global) → HARDCODED
DB key for clone: enum:{profileId}:{enumName}
```

Per-standard enum is opt-in. If not cloned, profile uses global value transparently.

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/schema-cache-service.js` | `getEnum(name, profileId?)` with per-standard lookup |
| `backend/src/routes/config-routes.js` | 3 new routes for per-standard enum CRUD |

## Implementation Steps

### 1. `schema-cache-service.js` — getEnum with profileId

```js
// Update signature: getEnum(name, profileId = null)
async function getEnum(name, profileId = null) {
  // 1. Try per-standard cache + DB
  if (profileId) {
    const perKey = `${profileId}:${name}`;
    if (enumCache.has(perKey)) return enumCache.get(perKey);
    if (isDbConnected()) {
      const stored = await AppConfig.findOne({ key: `enum:${profileId}:${name}` }).lean();
      if (stored?.value?.length > 0) {
        enumCache.set(perKey, stored.value);
        return stored.value;
      }
    }
  }
  // 2. Global (existing logic)
  if (enumCache.has(name)) return enumCache.get(name);
  let values = HARDCODED_ENUMS[name] || [];
  if (isDbConnected()) {
    try {
      const stored = await AppConfig.findOne({ key: `enum:${name}` }).lean();
      if (stored?.value?.length > 0) values = stored.value;
    } catch (err) { /* fallback to hardcoded */ }
  }
  enumCache.set(name, values);
  return values;
}
```

**resolveSchemaEnums** — pass profileId through:
```js
async function resolveSchemaEnums(fields, profileId = null) {
  const out = [];
  for (const field of fields) {
    if (field.type === 'enum' && field.enumKey) {
      const enumValues = await getEnum(field.enumKey, profileId);
      out.push({ ...field, enumValues });
    } else {
      out.push({ ...field });
    }
  }
  return out;
}

// getSchema passes profileId to resolveSchemaEnums
async function getSchema(profileId, sheet) {
  // ...existing logic...
  const resolved = await resolveSchemaEnums(baseFields, profileId);  // ← add profileId
  // ...
}
```

**dependent-enum in field-validator-service.js** — pass profileId:
```js
// validateField signature: add profileId param
async function validateField(field, value, rawRow, sheet, rowNum, resolvedSchema, profileId = 'TT05') {
  // ...
  case 'dependent-enum': {
    const enumValues = await schemaCacheService.getEnum(enumKey, profileId);  // ← pass profileId
    // ...
  }
}

// Callers (validateHoSoRow, validateVanBanRows) pass profileId to validateField
async function validateHoSoRow(hoSoRow, profileId = 'TT05') {
  // ...
  for (const field of schema) {
    const errs = await validateField(field, hoSoRow[field.name], hoSoRow, sheet, 1, schema, profileId);
    // ...
  }
}
// Same for validateVanBanRows
```

**invalidateAll / invalidateEnum** — clear per-standard keys too:
```js
function invalidateAll() {
  enumCache.clear();   // clears both global and per-standard keys
  schemaCache.clear();
  invalidateProfiles();
}
```

### 2. `config-routes.js` — 3 new per-standard enum routes

```js
// GET /profiles/:id/enums — list all enums, mark which are overridden per-standard
router.get('/profiles/:id/enums', async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));

    // Global enums (hardcoded + custom)
    const globalData = {};
    for (const name of ENUM_NAMES) {
      globalData[name] = { displayName: ENUM_DISPLAY_NAMES[name], builtin: true };
    }
    const metas = await AppConfig.find({ key: /^enum-meta:/ }).lean();
    for (const m of metas) {
      const name = m.key.replace('enum-meta:', '');
      if (!globalData[name]) globalData[name] = { displayName: m.value?.displayName || name, builtin: false };
    }

    // Check which are overridden per-standard
    const overrides = await AppConfig.find({ key: new RegExp(`^enum:${id}:`) }).lean();
    const overriddenNames = new Set(overrides.map(d => d.key.replace(`enum:${id}:`, '')));

    const result = {};
    for (const [name, info] of Object.entries(globalData)) {
      const values = await schemaCacheService.getEnum(name, id);
      result[name] = { ...info, values, overridden: overriddenNames.has(name) };
    }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /profiles/:id/enums/:name/clone — copy global enum to per-standard
router.post('/profiles/:id/enums/:name/clone', async (req, res, next) => {
  try {
    const { id, name } = req.params;
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));

    const globalValues = await schemaCacheService.getEnum(name); // global only
    await AppConfig.findOneAndUpdate(
      { key: `enum:${id}:${name}` },
      { $set: { value: [...globalValues] } },
      { upsert: true }
    );
    schemaCacheService.invalidateAll();
    res.json({ success: true, data: { profileId: id, name, values: globalValues } });
  } catch (err) { next(err); }
});

// PUT /profiles/:id/enums/:name — update per-standard enum values
router.put('/profiles/:id/enums/:name', async (req, res, next) => {
  try {
    const { id, name } = req.params;
    const { values } = req.body;
    if (!Array.isArray(values) || values.length === 0)
      return next(new ValidationError('values phải là mảng không rỗng'));
    const profile = await schemaCacheService.getProfile(id);
    if (!profile) return next(new ValidationError(`Profile "${id}" không tồn tại`));

    await AppConfig.findOneAndUpdate(
      { key: `enum:${id}:${name}` },
      { $set: { value: values } },
      { upsert: true }
    );
    schemaCacheService.invalidateAll();
    res.json({ success: true, data: { profileId: id, name, values } });
  } catch (err) { next(err); }
});

// DELETE /profiles/:id/enums/:name — remove per-standard override (revert to global)
router.delete('/profiles/:id/enums/:name', async (req, res, next) => {
  try {
    const { id, name } = req.params;
    await AppConfig.deleteOne({ key: `enum:${id}:${name}` });
    schemaCacheService.invalidateAll();
    res.json({ success: true });
  } catch (err) { next(err); }
});
```

## Todo

- [ ] Update `getEnum(name, profileId?)` in `schema-cache-service.js`
- [ ] Update `resolveSchemaEnums(fields, profileId?)` in `schema-cache-service.js`
- [ ] Update `getSchema()` call to `resolveSchemaEnums(baseFields, profileId)`
- [ ] Update `validateField` signature + dependent-enum case in `field-validator-service.js`
- [ ] Update `validateHoSoRow` + `validateVanBanRows` to pass profileId to validateField
- [ ] Add 4 new routes to `config-routes.js`

## Success Criteria

- `GET /api/config/profiles/TT05/enums` returns all enums, `overridden: false` initially
- `POST /api/config/profiles/TT04/enums/NGON_NGU/clone` creates a `enum:TT04:NGON_NGU` DB doc
- After clone, `GET /config/profiles/TT04/enums` shows `overridden: true` for NGON_NGU
- `DELETE /api/config/profiles/TT04/enums/NGON_NGU` restores global fallback
- `getSchema('TT04', 'Ho_so')` resolves enum fields using TT04-specific values when cloned
- Existing tests still pass (profileId defaults to 'TT05', behavior unchanged)
