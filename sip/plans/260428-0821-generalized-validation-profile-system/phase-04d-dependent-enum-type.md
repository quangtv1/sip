---
title: "Phase 4d: Dependent-Enum Cascading Type"
status: completed
priority: P2
effort: 3h
risk: Medium
blockedBy: []
completed: 2026-04-28
---

# Phase 4d: Dependent-Enum Cascading Type

## Overview

Add `dependent-enum` field type: field B's allowed values depend on the value of field A (sibling field). The mapping `{ fieldAValue → enumKey }` is stored in the field definition. Validation reads sibling value from the same row.

## Context Links

- Plan: `plan.md`
- Phase 4b (must complete first): `phase-04b-schema-namespace-migration-and-dossier-profileid.md`
- `backend/src/services/field-validator-service.js`
- `backend/src/utils/schema-payload-validator.js`
- `frontend/src/pages/system-config/schema-management-tab.jsx`

## Field Definition Shape

```js
{
  index: 5,
  name: 'loai_tai_lieu_chi_tiet',
  label: 'Loại tài liệu chi tiết',
  type: 'dependent-enum',
  required: true,
  severity: 'ERROR',
  dependsOn: {
    fieldIndex: 3,          // index of the controlling field in same schema
    valueMap: {             // controlling field value → enum key to use
      'VAN_BAN': 'LOAI_VAN_BAN',
      'HINH_ANH': 'LOAI_HINH_ANH',
      // fallback: if controlling value not in map → no validation (skip)
    }
  }
}
```

`valueMap` keys are the controlling field's raw cell value (string, case-insensitive match). Values are enum keys looked up via `getEnum(enumKey)`.

## Requirements

- `validateField` receives full `resolvedSchema` (already passed as 6th param)
- For `dependent-enum`: look up controlling field by `dependsOn.fieldIndex` from `resolvedSchema`
- Read controlling value from `rawRow` (already 3rd param of `validateField`)
- Resolve enum key via `valueMap[controllingValue]`
- If controlling value not in `valueMap` → skip validation (field not applicable)
- If enum key resolves to empty → skip (misconfiguration, be lenient)
- Circular dependency check at save time: field cannot depend on itself or form a cycle

## Related Code Files

**Modify:**
- `backend/src/services/field-validator-service.js` — `dependent-enum` case
- `backend/src/utils/schema-payload-validator.js` — validate `dependsOn` shape + cycle detection
- `frontend/src/pages/system-config/schema-management-tab.jsx` — dep-enum UI config

## Implementation Steps

### 1. field-validator-service.js — dependent-enum case

```js
case 'dependent-enum': {
  const { dependsOn } = field;
  if (!dependsOn?.fieldIndex != null || !dependsOn?.valueMap) break;

  // Find controlling field in resolvedSchema
  const controlField = resolvedSchema?.find(f => f.index === dependsOn.fieldIndex);
  if (!controlField) break;

  // Read controlling value from rawRow (rawRow is keyed by field name)
  const controlValue = String(rawRow?.[controlField.name] ?? '').trim();
  const enumKey = dependsOn.valueMap[controlValue]
    ?? dependsOn.valueMap[controlValue.toUpperCase()]
    ?? null;

  if (!enumKey) break; // controlling value not mapped → field not applicable

  // Load enum values
  const enumValues = await getEnum(enumKey);
  if (!enumValues?.length) break; // misconfigured enum → skip

  if (!enumValues.includes(value)) {
    return makeError(
      field, value, 'INVALID_DEPENDENT_ENUM',
      `${field.label} không hợp lệ với ${controlField.label} = "${controlValue}"`
    );
  }
  break;
}
```

Note: `validateField` must be `async` (already is) to call `getEnum`.

### 2. schema-payload-validator.js — dependent-enum validation

```js
if (f.type === 'dependent-enum') {
  if (!f.dependsOn?.fieldIndex == null)
    errors.push(`Field [${f.name}] dependent-enum requires dependsOn.fieldIndex`);
  if (!f.dependsOn?.valueMap || typeof f.dependsOn.valueMap !== 'object')
    errors.push(`Field [${f.name}] dependent-enum requires dependsOn.valueMap object`);
}

// Cycle detection: build dependency graph, check for cycles
function detectCycles(fields) {
  const depMap = new Map(); // fieldIndex → dependsOnFieldIndex
  for (const f of fields) {
    if (f.type === 'dependent-enum' && f.dependsOn?.fieldIndex != null) {
      depMap.set(f.index, f.dependsOn.fieldIndex);
    }
  }
  for (const [start] of depMap) {
    let cur = start;
    const visited = new Set();
    while (depMap.has(cur)) {
      if (visited.has(cur)) return true; // cycle
      visited.add(cur);
      cur = depMap.get(cur);
    }
  }
  return false;
}

if (detectCycles(fields)) errors.push('Circular dependency detected in dependent-enum fields');
```

### 3. schema-management-tab.jsx — dep-enum UI config

When type = `dependent-enum`, show:
- **Phụ thuộc vào trường (index)**: `<InputNumber>` for `dependsOn.fieldIndex`
- **Ánh xạ giá trị**: editable key-value list where each row is `{ controlValue, enumKey }`

```jsx
// Simple key-value editor for valueMap
// Show 2 columns: "Giá trị điều kiện" (string input) + "Enum key" (Select from ENUM_NAMES)
// Add/remove rows with +/- buttons
```

On save: construct `dependsOn = { fieldIndex: N, valueMap: { key: enumKey, ... } }`.

## Todo

- [ ] Add `dependent-enum` case to `validateField` switch in `field-validator-service.js`
- [ ] Add `dependsOn` shape validation + `detectCycles()` to `schema-payload-validator.js`
- [ ] Add `dependent-enum` to `VALID_TYPES` set (already added in phase-04c)
- [ ] Add dep-enum config UI to `schema-management-tab.jsx` (in `TypeParamInputs` component)
- [ ] Test: field B depends on field A; when A = 'VAN_BAN', B must be in LOAI_VAN_BAN enum
- [ ] Test: controlling value not in valueMap → B skips validation (no error)
- [ ] Test: cycle detection rejects schema with A→B→A dependency

## Success Criteria

- Field B with `dependent-enum` on field A:
  - A = 'VAN_BAN', B = valid LOAI_VAN_BAN value → passes
  - A = 'VAN_BAN', B = invalid value → INVALID_DEPENDENT_ENUM error
  - A = 'UNKNOWN_TYPE' (not in valueMap) → no error (skip)
- Circular dependency in schema → rejected at save time with clear error
- Missing `dependsOn.fieldIndex` → schema save rejected
- UI renders valueMap editor when type = `dependent-enum`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| rawRow field lookup by name fails | controlField.name from resolvedSchema must match rawRow keys; document naming contract |
| Case mismatch (controlValue vs valueMap keys) | Try exact match then `.toUpperCase()` fallback |
| `getEnum` called inside validateField loop (N+1) | Enum cache hit on 2nd+ row — acceptable; no extra DB call |
| Cycle involving non-dependent-enum fields | detectCycles only traverses dep-enum deps; other types ignored |
