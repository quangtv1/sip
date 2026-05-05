---
title: "Phase 4c: Extended Field Types (float, boolean, regex, email, url, range)"
status: completed
priority: P1
effort: 3h
risk: Low
blockedBy: []
completed: 2026-04-28
---

# Phase 4c: Extended Field Types

## Overview

Add 6 new field types to `field-validator-service.js`. Each type gets a validator function. Update `schema-payload-validator.js` to accept new type names + their params. Update `SchemaManagementTab` to show type-specific param inputs.

## Context Links

- Plan: `plan.md`
- Phase 4b (must complete first): `phase-04b-schema-namespace-migration-and-dossier-profileid.md`
- `backend/src/services/field-validator-service.js`
- `backend/src/utils/schema-payload-validator.js`
- `frontend/src/pages/system-config/schema-management-tab.jsx`

## New Types Reference

| Type | Extra Params | Validation Rule |
|------|-------------|-----------------|
| `float` | `min?`, `max?` | Parses as float; if min/max set, checks range |
| `boolean` | — | Accepts: `true/false/1/0/có/không/yes/no` (case-insensitive) |
| `regex` | `pattern: string` | Compiles pattern, tests value; pattern stored in field def |
| `email` | — | RFC 5321 simplified: `x@y.z` format |
| `url` | — | Must start with `http://` or `https://`, parseable via `new URL()` |
| `range` | `min: number`, `max: number`, `isFloat?: bool` | Numeric in [min, max] inclusive |

## Related Code Files

**Modify:**
- `backend/src/services/field-validator-service.js` — new type dispatchers
- `backend/src/utils/schema-payload-validator.js` — accept new types + params validation
- `frontend/src/pages/system-config/schema-management-tab.jsx` — param inputs per type

## Implementation Steps

### 1. field-validator-service.js — type dispatchers

Add to the `validateField` type switch (currently handles: `string`, `date`, `positiveInt`, `enum`):

```js
case 'float': {
  const num = parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return makeError(field, value, 'INVALID_FLOAT', `${field.label} phải là số thực`);
  if (field.min != null && num < field.min)
    return makeError(field, value, 'FLOAT_TOO_SMALL', `${field.label} tối thiểu ${field.min}`);
  if (field.max != null && num > field.max)
    return makeError(field, value, 'FLOAT_TOO_LARGE', `${field.label} tối đa ${field.max}`);
  break;
}

case 'boolean': {
  const TRUTHY = new Set(['true','1','có','yes','x']);
  const FALSY  = new Set(['false','0','không','no','']);
  const norm = String(value).toLowerCase().trim();
  if (!TRUTHY.has(norm) && !FALSY.has(norm))
    return makeError(field, value, 'INVALID_BOOLEAN', `${field.label} phải là có/không`);
  break;
}

case 'regex': {
  if (!field.pattern) break; // pattern required but be lenient if missing
  let re;
  try { re = new RegExp(field.pattern); }
  catch { break; } // invalid pattern — skip, caught at save time
  if (!re.test(String(value)))
    return makeError(field, value, 'REGEX_MISMATCH', `${field.label} không đúng định dạng`);
  break;
}

case 'email': {
  // RFC 5321 simplified — no full spec validation, just practical check
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(String(value).trim()))
    return makeError(field, value, 'INVALID_EMAIL', `${field.label} không đúng định dạng email`);
  break;
}

case 'url': {
  try {
    const u = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(u.protocol))
      return makeError(field, value, 'INVALID_URL', `${field.label} phải là http/https URL`);
  } catch {
    return makeError(field, value, 'INVALID_URL', `${field.label} không đúng định dạng URL`);
  }
  break;
}

case 'range': {
  const isFloat = !!field.isFloat;
  const num = isFloat
    ? parseFloat(String(value).replace(',', '.'))
    : parseInt(String(value), 10);
  if (isNaN(num))
    return makeError(field, value, 'INVALID_RANGE', `${field.label} phải là số`);
  if (field.min != null && num < field.min)
    return makeError(field, value, 'RANGE_BELOW_MIN', `${field.label} tối thiểu ${field.min}`);
  if (field.max != null && num > field.max)
    return makeError(field, value, 'RANGE_ABOVE_MAX', `${field.label} tối đa ${field.max}`);
  break;
}
```

### 2. schema-payload-validator.js — accept new types + param validation

```js
const VALID_TYPES = new Set([
  'string', 'date', 'positiveInt', 'enum',    // existing
  'float', 'boolean', 'regex', 'email', 'url', 'range',  // new Phase 4c
  'dependent-enum',                            // Phase 4d
]);

// Per-type param validation (after type check):
if (f.type === 'regex' && f.pattern) {
  try { new RegExp(f.pattern); }
  catch { errors.push(`Field [${f.name}] pattern is invalid regex`); }
}
if (f.type === 'range') {
  if (f.min == null || f.max == null) errors.push(`Field [${f.name}] range requires min and max`);
  if (f.min != null && f.max != null && f.min > f.max)
    errors.push(`Field [${f.name}] min must be ≤ max`);
}
if (f.type === 'float') {
  if (f.min != null && f.max != null && f.min > f.max)
    errors.push(`Field [${f.name}] float min must be ≤ max`);
}
```

### 3. schema-management-tab.jsx — param inputs per type

Below the type `<Select>` for each field, show contextual extra params:

```jsx
// When type === 'regex': show Input for pattern
// When type === 'float': show optional min/max InputNumber
// When type === 'range': show required min/max InputNumber + isFloat checkbox
// Other new types (boolean, email, url): no extra params
```

Use a small helper component `<TypeParamInputs type={...} value={...} onChange={...} />` that renders the right inputs based on selected type.

## Todo

- [ ] Add `float`, `boolean`, `regex`, `email`, `url`, `range` cases to type switch in `field-validator-service.js`
- [ ] Update `VALID_TYPES` set in `schema-payload-validator.js`
- [ ] Add per-type param validation in `schema-payload-validator.js`
- [ ] Add `<TypeParamInputs>` component in `schema-management-tab.jsx`
- [ ] Verify existing tests unaffected (no schema field uses new types yet)
- [ ] Manual test: create `regex` field with pattern `^\d{4}$` → validates 4-digit string

## Success Criteria

- `float` type: `"3.14"` passes, `"abc"` fails
- `boolean` type: `"có"`, `"1"`, `"true"` all pass; `"maybe"` fails
- `regex` type: pattern `^\d{4}$` → `"2024"` passes, `"abc"` fails
- `email` type: `"user@example.com"` passes; `"notanemail"` fails
- `url` type: `"https://example.com"` passes; `"ftp://x"` fails
- `range` type with min=1/max=100: `"50"` passes; `"0"` fails
- Invalid regex pattern rejected at save time by `schema-payload-validator.js`
- `SchemaManagementTab` shows pattern input when type = `regex`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| ReDoS via regex from DB | Validate regex compile on save; optionally timeout eval |
| Float parsing locale (`3,14` vs `3.14`) | Normalize comma→dot before parseFloat |
| `new URL()` availability | Available in Node 10+ and all modern browsers |
