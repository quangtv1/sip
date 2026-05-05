# Phase 2: Dynamic Enum Management

## Context Links
- Current enums: `backend/src/validators/enum-definitions.js` (8 frozen arrays)
- Validator consumer: `backend/src/services/field-validator-service.js` (sync, uses `field.enumValues`)
- Hot-reload pattern: `backend/src/services/minio-storage-service.js` (`reloadConfig()` / `buildClient()`)
- DB model: `backend/src/models/app-config-model.js` (key/value, `app_configs` collection)
- Frontend: `frontend/src/pages/SystemConfigPage.jsx` (created in Phase 1)

## Overview
- **Priority:** P1
- **Status:** Completed
- **Effort:** 4h
- **Risk:** Medium — changes how validators resolve enum values; must maintain backwards compat

## Key Insights
- 8 enums, each a frozen array of `"XX: Label"` strings
- `field-validator-service.js` reads `field.enumValues` synchronously — field schemas embed the array directly
- `enum-definitions.js` is imported by both `ho-so-schema.js` and `van-ban-schema.js`
- Strategy: cache service provides enums; schemas reference enum by key (`enumKey`) instead of embedding values
- **Critical constraint**: `validateField()` is sync — must pre-resolve enums into schema before validation loop

## Requirements

### Functional
**Backend:**
- `GET /api/config/enums` — return all 8 enum names + values
- `GET /api/config/enums/:name` — return values for one enum
- `PUT /api/config/enums/:name` — update values array (Admin only), invalidate cache
- `schema-cache-service.js` — in-memory cache with `getEnum(name)`, `invalidateAll()`

**Frontend:**
- New tab "Danh muc" on SystemConfigPage
- List all 8 enums by display name
- Click enum → inline editor: ordered list of values, add/remove/reorder
- Save per enum → `PUT /api/config/enums/:name`

### Non-functional
- Fallback to hardcoded if no DB entry for an enum
- No TTL — explicit invalidation only
- Existing tests must pass without modification

## Architecture

### Cache Data Flow
```
validator calls getEnum('NGON_NGU')
  |
  v
schema-cache-service (in-memory Map)
  |-- cache hit? --> return cached value
  |-- cache miss? --> AppConfig.findOne({ key: 'enum:NGON_NGU' })
       |-- found? --> cache + return DB value
       |-- not found? --> return hardcoded from enum-definitions.js
```

### DB Schema
```
app_configs collection:
  { key: 'enum:THOI_HAN_BAO_QUAN', value: ['01: Vinh vien', '02: 70 nam', ...] }
  { key: 'enum:CHE_DO_SU_DUNG', value: ['01: Cong khai', ...] }
  ...
```

## Related Code Files

### Create
- `backend/src/services/schema-cache-service.js`

### Modify
- `backend/src/routes/config-routes.js` — add enum CRUD routes
- `backend/src/services/field-validator-service.js` — make `validateHoSoRow` / `validateVanBanRows` async, pre-resolve enums
- `backend/src/validators/enum-definitions.js` — export `ENUM_NAMES` list and `HARDCODED_ENUMS` map
- `frontend/src/pages/SystemConfigPage.jsx` — add "Danh muc" tab

### Must NOT Break
- `backend/src/tests/field-validator.test.js`
- `backend/src/tests/cross-validator.test.js`
- `backend/src/validators/ho-so-schema.js` — keep sync exports, enum values still embedded for backwards compat
- `backend/src/validators/van-ban-schema.js` — same

## Implementation Steps

### Backend

1. **Create `schema-cache-service.js`**
   ```
   const AppConfig = require('../models/app-config-model');
   const hardcodedEnums = require('../validators/enum-definitions');
   
   const enumCache = new Map();
   
   async function getEnum(name) {
     if (enumCache.has(name)) return enumCache.get(name);
     const stored = await AppConfig.findOne({ key: `enum:${name}` }).lean();
     const values = stored?.value || hardcodedEnums[name];
     if (values) enumCache.set(name, values);
     return values || [];
   }
   
   function invalidateAll() { enumCache.clear(); }
   
   module.exports = { getEnum, invalidateAll };
   ```

2. **Update `enum-definitions.js`** — add exports:
   ```js
   const ENUM_NAMES = [
     'THOI_HAN_BAO_QUAN', 'CHE_DO_SU_DUNG', 'NGON_NGU',
     'TINH_TRANG_VAT_LY', 'MUC_DO_TIN_CAY', 'CHE_DO_DU_PHONG',
     'TINH_TRANG_DU_PHONG', 'TEN_LOAI_TAI_LIEU'
   ];
   // Add at bottom, keep existing exports intact
   module.exports = { ..., ENUM_NAMES };
   ```

3. **Add enum routes to `config-routes.js`**
   ```js
   // GET /api/config/enums — all enums
   router.get('/enums', async (req, res, next) => { ... });
   // GET /api/config/enums/:name — one enum
   router.get('/enums/:name', async (req, res, next) => { ... });
   // PUT /api/config/enums/:name — update + invalidate cache
   router.put('/enums/:name', async (req, res, next) => { ... });
   ```
   - Validate `:name` is in `ENUM_NAMES`
   - Validate `body.values` is non-empty array of strings
   - On save: `AppConfig.findOneAndUpdate({ key: 'enum:{name}' }, { value }, { upsert: true })`
   - Call `schemaCacheService.invalidateAll()` after save

4. **Update `field-validator-service.js`**
   - Add `resolveEnumValues(schema)` async helper: for each field with `type: 'enum'`, replace `enumValues` with live values from cache
   - Make `validateHoSoRow` → `async validateHoSoRow`: call `resolveEnumValues(HO_SO_SCHEMA)` before looping
   - Make `validateVanBanRows` → `async validateVanBanRows`: same pattern
   - **Key**: create a resolved copy of schema (don't mutate frozen original)
   - Existing tests import these functions — they'll need `await` added. If tests use sync calls, they still work because cache falls back to hardcoded synchronously on first call. But safer to update tests to use async.

5. **Backwards Compat Strategy for Tests**
   - The hardcoded enums remain the default fallback
   - Tests that call `validateHoSoRow` synchronously will break if signature changes to async
   - **Solution A** (preferred): Make validators async, update test files to use `await`
   - **Solution B** (if tests are complex): Keep sync wrappers that use hardcoded, add new async versions
   - Go with Solution A — test changes are mechanical (add `async/await`)

### Frontend

6. **Add `EnumManagementTab` to `SystemConfigPage.jsx`**
   - Fetch `GET /api/config/enums` on mount
   - Display as `Collapse` or `List` with enum display names
   - Each enum panel: ordered list of `<Input />` values, drag-to-reorder (or up/down buttons)
   - Add value button, delete value button per item
   - Save button per enum → `PUT /api/config/enums/:name`
   - Success/error feedback via `message.success` / `message.error`

7. **Add tab to page**
   ```jsx
   { key: 'enums', label: 'Danh muc', children: <EnumManagementTab /> }
   ```

## Enum Display Name Map
```
THOI_HAN_BAO_QUAN    → "Thoi han bao quan"
CHE_DO_SU_DUNG       → "Che do su dung"
NGON_NGU             → "Ngon ngu"
TINH_TRANG_VAT_LY   → "Tinh trang vat ly"
MUC_DO_TIN_CAY       → "Muc do tin cay"
CHE_DO_DU_PHONG      → "Che do du phong"
TINH_TRANG_DU_PHONG  → "Tinh trang du phong"
TEN_LOAI_TAI_LIEU    → "Ten loai tai lieu"
```
(Use Vietnamese diacritics from schema labels in actual implementation)

## Todo List

- [x] Create `backend/src/services/schema-cache-service.js` with `getEnum()`, `invalidateAll()`
- [x] Update `backend/src/validators/enum-definitions.js` — add `ENUM_NAMES` export
- [x] Add GET/PUT enum routes to `backend/src/routes/config-routes.js`
- [x] Update `field-validator-service.js` — async validators with enum resolution
- [x] Update existing test files to use async/await for validator calls
- [x] Run existing tests — verify all pass
- [x] Add unit tests for `schema-cache-service.js`
- [x] Create `EnumManagementTab` component in `SystemConfigPage.jsx`
- [x] Test: edit enum values via UI, verify validator uses updated values

## Success Criteria
- `GET /api/config/enums` returns all 8 enums with their current values
- `PUT /api/config/enums/NGON_NGU` with new values → cache invalidated → validator uses new values
- Empty DB → hardcoded values returned (zero-config deployment)
- All 4 existing test files pass
- Admin can add/remove/reorder enum values via UI

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Async validator breaks callers | Medium | High | Search all callers of `validateHoSoRow`/`validateVanBanRows`, update to async |
| Cache serves stale data | Low | Medium | Explicit invalidation on every PUT; no TTL drift |
| Bad enum values corrupt validation | Medium | Medium | Validate values are non-empty strings array before save |

## Security Considerations
- Admin-only routes (existing `requireRole(ROLES.ADMIN)` middleware on router)
- Validate enum name against whitelist (`ENUM_NAMES`)
- Validate values array structure (non-empty, all strings)

## Next Steps
- Phase 3 extends `schema-cache-service.js` with `getSchema(sheet)` for field schemas
