# Phase 3: Dynamic Field Schema

## Context Links
- Ho_so schema: `backend/src/validators/ho-so-schema.js` (18 fields, frozen array)
- Van_ban schema: `backend/src/validators/van-ban-schema.js` (21 fields, frozen array)
- Cache service: `backend/src/services/schema-cache-service.js` (created in Phase 2)
- Validator: `backend/src/services/field-validator-service.js` (async after Phase 2)
- Parser: `backend/src/services/excel-parser-service.js` (sync, imports schemas directly)
- Existing tests: `backend/src/tests/*.test.js`

## Overview
- **Priority:** P1
- **Status:** Completed
- **Effort:** 6h
- **Risk:** HIGH — bad schema = broken validator/parser for ALL dossier uploads

## Key Insights
- Schemas are `Object.freeze([ { index, name, label, type, required, enumValues?, regex?, severity, conditionalOn? } ])` arrays
- `excel-parser-service.js` uses `field.index` to map Excel columns → field names (position-based)
- `field-validator-service.js` iterates schema fields, validates each value by type
- `regex` fields (e.g., `MA_HO_SO_REGEX`, `MA_LUU_TRU_REGEX`) — these should NOT be editable via UI (security risk: regex injection). Keep hardcoded.
- `conditionalOn` — complex dependency logic, should be editable but with strict validation

## Requirements

### Functional
**Backend:**
- `GET /api/config/schema/:sheet` — return current schema for Ho_so or Van_ban
- `PUT /api/config/schema/:sheet` — validate and save schema
- `POST /api/config/schema/:sheet/reset` — delete DB entry, revert to hardcoded
- Schema validation before save (detailed below)
- Extend `schema-cache-service.js` with `getSchema(sheet)`, `invalidateSchema(sheet)`

**Frontend:**
- New tab "Cau truc bang" on SystemConfigPage
- Sub-tabs: Ho_so / Van_ban
- Table showing all fields: index, name, label, type, required, enumKey, severity, actions
- Inline edit per row
- Add row button
- Delete row button (with confirmation)
- "Khoi phuc mac dinh" button → `POST /api/config/schema/:sheet/reset`
- Client-side validation before submit

### Non-functional
- Fallback to hardcoded schemas if no DB entry
- Schema validation is critical gate — reject any invalid schema
- Preserve `regex` fields from hardcoded (non-editable via UI)
- Preserve `conditionalOn` references (must reference valid `fieldIndex`)

## Architecture

### Schema Validation Rules (PUT /api/config/schema/:sheet)
```
1. Must be non-empty array
2. Each field must have: index (int >= 0), name (string, non-empty), label (string), 
   type (one of: string|date|positiveInt|enum), severity (ERROR|WARNING)
3. No duplicate indices
4. No duplicate names  
5. Indices must be contiguous (0..N-1) — Excel column mapping depends on this
6. If type=enum → must have enumKey that exists in ENUM_NAMES
7. If required='conditional' → must have conditionalOn with valid fieldIndex
8. conditionalOn.fieldIndex must reference a valid index in the same schema
9. Do NOT allow regex field via API — strip it, apply from hardcoded if field name matches
```

### Cache Extension
```
schema-cache-service.js additions:

const schemaCache = new Map(); // 'Ho_so' | 'Van_ban' → resolved schema

async function getSchema(sheet) {
  if (schemaCache.has(sheet)) return schemaCache.get(sheet);
  const stored = await AppConfig.findOne({ key: `schema:${sheet}` }).lean();
  let schema = stored?.value || getHardcodedSchema(sheet);
  schema = await resolveSchemaEnums(schema); // replace enumKey with live values
  schemaCache.set(sheet, schema);
  return schema;
}

function invalidateSchema(sheet) { schemaCache.delete(sheet); }
```

### DB Schema
```
app_configs collection:
  { key: 'schema:Ho_so', value: [ { index: 0, name: 'maHoSo', ... }, ... ] }
  { key: 'schema:Van_ban', value: [ { index: 0, name: 'maDinhDanh', ... }, ... ] }
```

Note: stored schema uses `enumKey` (e.g., `'NGON_NGU'`) instead of `enumValues` array. Values resolved at cache load time from enum cache.

## Related Code Files

### Modify
- `backend/src/services/schema-cache-service.js` — add `getSchema()`, `invalidateSchema()`, `resolveSchemaEnums()`
- `backend/src/routes/config-routes.js` — add schema CRUD routes
- `backend/src/services/field-validator-service.js` — load schema from cache instead of direct import
- `backend/src/services/excel-parser-service.js` — make `parseExcel` async, load schema from cache
- `frontend/src/pages/SystemConfigPage.jsx` — add "Cau truc bang" tab

### Must NOT Break
- All existing tests
- `ho-so-schema.js` and `van-ban-schema.js` — keep as-is (hardcoded fallback source)

## Implementation Steps

### Backend

1. **Extend `schema-cache-service.js`**
   - Add `schemaCache` Map
   - Add `getHardcodedSchema(sheet)`: returns `HO_SO_SCHEMA` or `VAN_BAN_SCHEMA`
   - Add `resolveSchemaEnums(schemaFields)`: for each field with `enumKey`, call `getEnum(enumKey)` and set `enumValues`
   - Add `getSchema(sheet)`: cache-miss → DB lookup → fallback to hardcoded → resolve enums → cache
   - Add `invalidateSchema(sheet)`: clear specific schema from cache
   - Update `invalidateAll()`: clear both enum and schema caches
   - Export: `getEnum`, `getSchema`, `invalidateAll`, `invalidateSchema`

2. **Add schema routes to `config-routes.js`**
   ```
   GET  /api/config/schema/:sheet
   PUT  /api/config/schema/:sheet
   POST /api/config/schema/:sheet/reset
   ```
   - Validate `:sheet` is `Ho_so` or `Van_ban`
   - GET: return schema from cache (includes resolved enumValues)
   - PUT: validate schema structure (see validation rules above), strip `regex`/`enumValues` (those are derived), save `enumKey` for enum fields
   - POST reset: delete `AppConfig` with key `schema:{sheet}`, invalidate cache
   - On PUT success: `invalidateSchema(sheet)` 

3. **Create schema validation helper** (in `config-routes.js` or separate util)
   ```js
   function validateSchemaPayload(fields, sheet) {
     const errors = [];
     if (!Array.isArray(fields) || fields.length === 0) errors.push('Schema must be non-empty array');
     const indices = new Set();
     const names = new Set();
     for (const f of fields) {
       // check required props, valid types, duplicates
       if (indices.has(f.index)) errors.push(`Duplicate index: ${f.index}`);
       indices.add(f.index);
       if (names.has(f.name)) errors.push(`Duplicate name: ${f.name}`);
       names.add(f.name);
       // type validation, enumKey check, conditionalOn check
     }
     // contiguous index check: should be 0..N-1
     return errors;
   }
   ```

4. **Update `field-validator-service.js`**
   - Replace direct `require('../validators/ho-so-schema')` with `schemaCacheService.getSchema('Ho_so')`
   - `validateHoSoRow` becomes: load schema from cache → iterate fields → validate
   - `validateVanBanRows` becomes: load schema from cache → iterate
   - `validateField` itself stays sync (receives pre-resolved schema field)
   - Keep `HO_SO_SCHEMA` and `VAN_BAN_SCHEMA` imports as fallback for conditional logic reference

5. **Update `excel-parser-service.js`**
   - Make `parseExcel` async
   - Load schemas from cache: `const hoSoSchema = await schemaCacheService.getSchema('Ho_so')`
   - Replace hardcoded `HO_SO_SCHEMA` / `VAN_BAN_SCHEMA` references with cached versions
   - `mapRowToObject(row, schema)` — unchanged (uses `field.index` and `field.name`)
   - **Find all callers of `parseExcel`** and update to `await`

6. **Find and update all callers**
   - Search: `parseExcel(`, `validateHoSoRow(`, `validateVanBanRows(` 
   - Add `await` to all call sites
   - Verify tests still pass

### Frontend

7. **Add `SchemaManagementTab` to `SystemConfigPage.jsx`**
   - Sub-tabs: Ho_so / Van_ban (Ant Design `Tabs` nested)
   - Fetch `GET /api/config/schema/:sheet` on tab change
   - Display as editable `Table`:
     - Columns: index, name, label, type (Select), required (Select: true/false/conditional), enumKey (Select, shown when type=enum), severity (Select), actions
     - Inline edit: click row → fields become editable
     - Add row: append with next index
     - Delete row: remove with confirmation, re-index remaining
   - "Khoi phuc mac dinh" button with confirmation modal → `POST /api/config/schema/:sheet/reset`
   - Save button → client-side validation → `PUT /api/config/schema/:sheet`

8. **Client-side validation before save**
   - No duplicate indices or names
   - All required props filled
   - If type=enum, enumKey must be selected
   - If required=conditional, conditionalOn must be configured
   - Show validation errors inline

9. **Add tab to page**
   ```jsx
   { key: 'schema', label: 'Cau truc bang', children: <SchemaManagementTab /> }
   ```

## Todo List

- [x] Extend `schema-cache-service.js` with `getSchema()`, `invalidateSchema()`, `resolveSchemaEnums()`
- [x] Create schema validation helper
- [x] Add GET/PUT/POST schema routes to `config-routes.js`
- [x] Update `field-validator-service.js` — load schema from cache
- [x] Update `excel-parser-service.js` — make `parseExcel` async, use cached schema
- [x] Find and update ALL callers of `parseExcel`, `validateHoSoRow`, `validateVanBanRows`
- [x] Run all existing tests — verify pass
- [x] Add schema validation tests (duplicate index, missing props, invalid type, contiguous check)
- [x] Add cache service tests for schema (hit, miss, fallback, invalidation)
- [x] Create `SchemaManagementTab` component
- [x] Test: edit schema via UI, verify validator/parser use updated schema
- [x] Test: reset to defaults works
- [x] Test: bad schema rejected (duplicate index, missing name, etc.)

## Success Criteria
- `GET /api/config/schema/Ho_so` returns 18 fields with current values
- `PUT /api/config/schema/Ho_so` with valid schema → saved, cache invalidated
- `PUT /api/config/schema/Ho_so` with duplicate indices → 400 error with details
- `POST /api/config/schema/Ho_so/reset` → DB entry deleted, hardcoded schema returned
- Empty DB → hardcoded schemas used (zero-config deployment)
- All existing tests pass
- Excel parsing uses dynamic schema
- Validation uses dynamic schema

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bad schema breaks ALL dossier validation | High | Critical | Strict server-side validation; reject bad schemas before save |
| Async `parseExcel` breaks callers | Medium | High | Search ALL callers, update to async; run full test suite |
| Regex injection via schema API | Low | Critical | Strip `regex` from API input; only apply from hardcoded if field name matches |
| Schema drift between DB and hardcoded | Medium | Medium | Reset button restores hardcoded; schema version tracking (future) |
| `conditionalOn` references broken index | Medium | High | Validate `conditionalOn.fieldIndex` exists in same schema on save |
| Non-contiguous indices break Excel parsing | High | Critical | Validate indices are 0..N-1 contiguous on save |

## Security Considerations
- Admin-only routes
- `regex` fields NOT editable via API — prevents regex injection / ReDoS
- Schema validation is the critical safety gate
- No user-provided code execution (enum values are data, not code)

## Failure Modes & Mitigation
| Failure Mode | Detection | Mitigation |
|-------------|-----------|------------|
| Cache returns stale schema | Validator produces unexpected results | Explicit invalidation on every save; admin can reset |
| DB schema corrupt | Validator crashes on load | Try/catch in `getSchema()` → fallback to hardcoded + log error |
| All enum values deleted | Validator rejects all rows | Minimum 1 value validation on PUT |
| Parser gets wrong field count | Rows map to wrong columns | Contiguous index validation prevents this |

## Next Steps
- Consider schema versioning / audit trail (future enhancement)
- Consider schema diff preview before save (future enhancement)
