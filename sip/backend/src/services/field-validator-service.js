/**
 * Per-field validation for Ho_so and Van_ban rows.
 * Each check returns an array of error objects:
 *   { sheet, row, field, label, code, message, value, severity }
 *
 * row is 1-based (data row number shown to users).
 * For Ho_so the single data row is always row 1.
 *
 * validateHoSoRow and validateVanBanRows are async — they load the current
 * schema (with live enum values) from schema-cache-service on each call.
 * The cache serves resolved schemas so validation stays fast.
 */

const schemaCacheService = require('./schema-cache-service');
// Keep hardcoded imports for validateField fallback (backward compat with direct callers)
const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');

// DD/MM/YYYY — strict: no single-digit day/month
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

// ── Type validators ───────────────────────────────────────────────────────────

function validateRequired(value, field, sheet, rowNum) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return {
      sheet, row: rowNum, field: field.name, label: field.label,
      code: 'REQUIRED', message: `"${field.label}" là bắt buộc`,
      value, severity: field.severity,
    };
  }
  return null;
}

function validateEnum(value, field, sheet, rowNum) {
  if (!field.enumValues.includes(value)) {
    return {
      sheet, row: rowNum, field: field.name, label: field.label,
      code: 'INVALID_ENUM',
      message: `"${field.label}" phải là một trong: ${field.enumValues.join(' | ')}`,
      value, severity: field.severity,
    };
  }
  return null;
}

function validateDate(value, field, sheet, rowNum) {
  if (!DATE_REGEX.test(value)) {
    return {
      sheet, row: rowNum, field: field.name, label: field.label,
      code: 'INVALID_DATE', message: `"${field.label}" phải có định dạng DD/MM/YYYY`,
      value, severity: field.severity,
    };
  }
  const [dd, mm, yyyy] = value.split('/').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() + 1 !== mm || d.getDate() !== dd) {
    return {
      sheet, row: rowNum, field: field.name, label: field.label,
      code: 'INVALID_DATE_VALUE',
      message: `"${field.label}" không phải ngày hợp lệ (${value})`,
      value, severity: field.severity,
    };
  }
  return null;
}

function validatePositiveInt(value, field, sheet, rowNum) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return {
      sheet, row: rowNum, field: field.name, label: field.label,
      code: 'INVALID_POSITIVE_INT', message: `"${field.label}" phải là số nguyên dương`,
      value, severity: field.severity,
    };
  }
  return null;
}

function validateRegex(value, field, sheet, rowNum) {
  if (!field.regex.test(value)) {
    return {
      sheet, row: rowNum, field: field.name, label: field.label,
      code: 'INVALID_FORMAT', message: `"${field.label}" không đúng định dạng yêu cầu`,
      value, severity: field.severity,
    };
  }
  return null;
}

// ── Extended type validators (Phase 4c) ───────────────────────────────────────

const BOOLEAN_TRUTHY = new Set(['true','1','có','yes','x']);
const BOOLEAN_FALSY  = new Set(['false','0','không','no','']);

function makeError(field, value, sheet, rowNum, code, message) {
  return { sheet, row: rowNum, field: field.name, label: field.label, code, message, value, severity: field.severity };
}

function validateFloat(value, field, sheet, rowNum) {
  const num = parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return makeError(field, value, sheet, rowNum, 'INVALID_FLOAT', `"${field.label}" phải là số thực`);
  if (field.min != null && num < field.min) return makeError(field, value, sheet, rowNum, 'FLOAT_TOO_SMALL', `"${field.label}" tối thiểu ${field.min}`);
  if (field.max != null && num > field.max) return makeError(field, value, sheet, rowNum, 'FLOAT_TOO_LARGE', `"${field.label}" tối đa ${field.max}`);
  return null;
}

function validateBoolean(value, field, sheet, rowNum) {
  const norm = String(value).toLowerCase().trim();
  if (!BOOLEAN_TRUTHY.has(norm) && !BOOLEAN_FALSY.has(norm)) {
    return makeError(field, value, sheet, rowNum, 'INVALID_BOOLEAN', `"${field.label}" phải là có/không (true/false/1/0)`);
  }
  return null;
}

function validatePattern(value, field, sheet, rowNum) {
  if (!field.pattern) return null;
  let re;
  try { re = new RegExp(field.pattern); } catch { return null; } // invalid pattern — skip
  if (!re.test(String(value))) {
    return makeError(field, value, sheet, rowNum, 'REGEX_MISMATCH', `"${field.label}" không đúng định dạng (pattern: ${field.pattern})`);
  }
  return null;
}

function validateEmail(value, field, sheet, rowNum) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) {
    return makeError(field, value, sheet, rowNum, 'INVALID_EMAIL', `"${field.label}" không đúng định dạng email`);
  }
  return null;
}

function validateUrl(value, field, sheet, rowNum) {
  try {
    const u = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('not http/https');
  } catch {
    return makeError(field, value, sheet, rowNum, 'INVALID_URL', `"${field.label}" phải là URL http/https hợp lệ`);
  }
  return null;
}

function validateRange(value, field, sheet, rowNum) {
  const num = field.isFloat
    ? parseFloat(String(value).replace(',', '.'))
    : parseInt(String(value), 10);
  if (isNaN(num)) return makeError(field, value, sheet, rowNum, 'INVALID_RANGE', `"${field.label}" phải là số`);
  if (field.min != null && num < field.min) return makeError(field, value, sheet, rowNum, 'RANGE_BELOW_MIN', `"${field.label}" tối thiểu ${field.min}`);
  if (field.max != null && num > field.max) return makeError(field, value, sheet, rowNum, 'RANGE_ABOVE_MAX', `"${field.label}" tối đa ${field.max}`);
  return null;
}

// ── Single-field dispatcher ───────────────────────────────────────────────────

/**
 * Validate one field value against its schema definition.
 * Async to support dependent-enum (needs getEnum lookup).
 *
 * @param {Object}   field           — schema field definition (with enumValues resolved)
 * @param {*}        value           — raw cell value
 * @param {Object}   rawRow          — full row (for conditional required / dependent-enum)
 * @param {string}   sheet           — sheet name
 * @param {number}   rowNum          — 1-based display row number
 * @param {Array}    [resolvedSchema] — pre-loaded schema; falls back to hardcoded if omitted
 */
async function validateField(field, value, rawRow, sheet, rowNum, resolvedSchema) {
  const errors = [];
  const strVal = value !== undefined && value !== null ? String(value) : '';

  let isRequired = field.required;
  if (field.required === 'conditional' && field.conditionalOn) {
    const { fieldIndex, value: triggerValue } = field.conditionalOn;
    const schema = resolvedSchema || (sheet === 'Ho_so' ? HO_SO_SCHEMA : VAN_BAN_SCHEMA);
    const triggerField = schema.find(f => f.index === fieldIndex);
    const triggerVal = triggerField ? rawRow[triggerField.name] : undefined;
    isRequired = triggerVal === triggerValue;
  }

  const isEmpty = strVal.trim() === '';
  if (isRequired && isEmpty) {
    const err = validateRequired(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
    return errors;
  }
  if (!isRequired && isEmpty) return errors;

  // ── Type dispatch ─────────────────────────────────────────────────────────
  switch (field.type) {
    case 'enum': {
      const err = validateEnum(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'date': {
      const err = validateDate(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'positiveInt': {
      const err = validatePositiveInt(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    // Phase 4c extended types
    case 'float': {
      const err = validateFloat(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'boolean': {
      const err = validateBoolean(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'regex': {
      const err = validatePattern(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'email': {
      const err = validateEmail(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'url': {
      const err = validateUrl(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    case 'range': {
      const err = validateRange(strVal, field, sheet, rowNum);
      if (err) errors.push(err);
      break;
    }
    // Phase 4d dependent-enum
    case 'dependent-enum': {
      const { dependsOn } = field;
      if (dependsOn?.fieldIndex != null && dependsOn?.valueMap) {
        const controlField = resolvedSchema?.find(f => f.index === dependsOn.fieldIndex);
        if (controlField) {
          const controlValue = String(rawRow?.[controlField.name] ?? '').trim();
          const enumKey = dependsOn.valueMap[controlValue]
            ?? dependsOn.valueMap[controlValue.toUpperCase()]
            ?? null;
          if (enumKey) {
            const enumValues = await schemaCacheService.getEnum(enumKey);
            if (enumValues?.length && !enumValues.includes(strVal)) {
              errors.push(makeError(field, strVal, sheet, rowNum, 'INVALID_DEPENDENT_ENUM',
                `"${field.label}" không hợp lệ với ${controlField.label} = "${controlValue}"`));
            }
          }
          // If enumKey not found in valueMap → field not applicable for this control value → skip
        }
      }
      break;
    }
    default:
      break; // unknown type — skip (forward compat)
  }

  // Legacy hardcoded regex check (field.regex = compiled RegExp from hardcoded schema)
  if (field.regex && !isEmpty) {
    const err = validateRegex(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
  }

  return errors;
}

// ── Sheet-level validators ────────────────────────────────────────────────────

/**
 * Validate the single Ho_so (primary sheet) data row.
 * @param {Object} hoSoRow  — field-name keyed object
 * @param {string} [profileId='TT05'] — validation profile to use
 * @returns {Promise<Array>} error array
 */
async function validateHoSoRow(hoSoRow, profileId = 'TT05') {
  const profile = await schemaCacheService.getProfile(profileId);
  const sheet   = profile?.primarySheet || 'Ho_so';
  const schema  = await schemaCacheService.getSchema(profileId, sheet);
  const errors  = [];
  for (const field of schema) {
    const errs = await validateField(field, hoSoRow[field.name], hoSoRow, sheet, 1, schema);
    errors.push(...errs);
  }
  return errors;
}

/**
 * Validate all Van_ban (secondary sheet) rows.
 * @param {Object[]} vanBanRows — array of field-name keyed objects
 * @param {string}   [profileId='TT05'] — validation profile to use
 * @returns {Promise<Array>} error array
 */
async function validateVanBanRows(vanBanRows, profileId = 'TT05') {
  const profile = await schemaCacheService.getProfile(profileId);
  const sheet   = profile?.secondarySheet || 'Van_ban';
  const schema  = await schemaCacheService.getSchema(profileId, sheet);
  const errors  = [];
  for (let idx = 0; idx < vanBanRows.length; idx++) {
    const row = vanBanRows[idx];
    if (!row || typeof row !== 'object') continue;
    for (const field of schema) {
      const errs = await validateField(field, row[field.name], row, sheet, idx + 1, schema);
      errors.push(...errs);
    }
  }
  return errors;
}

module.exports = { validateHoSoRow, validateVanBanRows, validateField };
