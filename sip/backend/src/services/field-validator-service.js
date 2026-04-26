/**
 * Per-field validation for Ho_so and Van_ban rows.
 * Each check returns an array of error objects:
 *   { sheet, row, field, label, code, message, value, severity }
 *
 * row is 1-based (data row number shown to users).
 * For Ho_so the single data row is always row 1.
 */

const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');

// DD/MM/YYYY — strict: no single-digit day/month
const DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;

// ---- Type validators -------------------------------------------------------

function validateRequired(value, field, sheet, rowNum) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return {
      sheet,
      row: rowNum,
      field: field.name,
      label: field.label,
      code: 'REQUIRED',
      message: `"${field.label}" là bắt buộc`,
      value,
      severity: field.severity,
    };
  }
  return null;
}

function validateEnum(value, field, sheet, rowNum) {
  // Exact string match — no trim, no normalize
  if (!field.enumValues.includes(value)) {
    return {
      sheet,
      row: rowNum,
      field: field.name,
      label: field.label,
      code: 'INVALID_ENUM',
      message: `"${field.label}" phải là một trong: ${field.enumValues.join(' | ')}`,
      value,
      severity: field.severity,
    };
  }
  return null;
}

function validateDate(value, field, sheet, rowNum) {
  if (!DATE_REGEX.test(value)) {
    return {
      sheet,
      row: rowNum,
      field: field.name,
      label: field.label,
      code: 'INVALID_DATE',
      message: `"${field.label}" phải có định dạng DD/MM/YYYY`,
      value,
      severity: field.severity,
    };
  }
  // Validate actual calendar date
  const [dd, mm, yyyy] = value.split('/').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() + 1 !== mm || d.getDate() !== dd) {
    return {
      sheet,
      row: rowNum,
      field: field.name,
      label: field.label,
      code: 'INVALID_DATE_VALUE',
      message: `"${field.label}" không phải ngày hợp lệ (${value})`,
      value,
      severity: field.severity,
    };
  }
  return null;
}

function validatePositiveInt(value, field, sheet, rowNum) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return {
      sheet,
      row: rowNum,
      field: field.name,
      label: field.label,
      code: 'INVALID_POSITIVE_INT',
      message: `"${field.label}" phải là số nguyên dương`,
      value,
      severity: field.severity,
    };
  }
  return null;
}

function validateRegex(value, field, sheet, rowNum) {
  if (!field.regex.test(value)) {
    return {
      sheet,
      row: rowNum,
      field: field.name,
      label: field.label,
      code: 'INVALID_FORMAT',
      message: `"${field.label}" không đúng định dạng yêu cầu`,
      value,
      severity: field.severity,
    };
  }
  return null;
}

// ---- Single-field dispatcher ------------------------------------------------

/**
 * Validate one field value against its schema definition.
 * rawRow: full row object (used for conditional checks).
 */
function validateField(field, value, rawRow, sheet, rowNum) {
  const errors = [];
  const strVal = value !== undefined && value !== null ? String(value) : '';

  // Determine effective required status
  let isRequired = field.required;
  if (field.required === 'conditional' && field.conditionalOn) {
    const { fieldIndex, value: triggerValue } = field.conditionalOn;
    // rawRow may be keyed by index or by name; look up by index via schema
    const schema = sheet === 'Ho_so' ? HO_SO_SCHEMA : VAN_BAN_SCHEMA;
    const triggerField = schema.find((f) => f.index === fieldIndex);
    const triggerVal = triggerField ? rawRow[triggerField.name] : undefined;
    isRequired = triggerVal === triggerValue;
  }

  const isEmpty = strVal.trim() === '';

  if (isRequired && isEmpty) {
    const err = validateRequired(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
    return errors; // no further checks on empty required field
  }

  if (!isRequired && isEmpty) return errors; // optional and empty — OK

  // Type-specific validation (value is non-empty at this point)
  if (field.type === 'enum') {
    const err = validateEnum(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
  } else if (field.type === 'date') {
    const err = validateDate(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
  } else if (field.type === 'positiveInt') {
    const err = validatePositiveInt(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
  }

  // Additional regex check (on top of type check)
  if (field.regex && !isEmpty) {
    const err = validateRegex(strVal, field, sheet, rowNum);
    if (err) errors.push(err);
  }

  return errors;
}

// ---- Sheet-level validators -------------------------------------------------

/**
 * Validate the single Ho_so data row.
 * @param {Object} hoSoRow — field-name keyed object
 * @returns {Array} error array
 */
function validateHoSoRow(hoSoRow) {
  const errors = [];
  for (const field of HO_SO_SCHEMA) {
    const errs = validateField(field, hoSoRow[field.name], hoSoRow, 'Ho_so', 1);
    errors.push(...errs);
  }
  return errors;
}

/**
 * Validate all Van_ban rows.
 * @param {Object[]} vanBanRows — array of field-name keyed objects
 * @returns {Array} error array
 */
function validateVanBanRows(vanBanRows) {
  const errors = [];
  vanBanRows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return; // guard against null/undefined rows
    for (const field of VAN_BAN_SCHEMA) {
      const errs = validateField(field, row[field.name], row, 'Van_ban', idx + 1);
      errors.push(...errs);
    }
  });
  return errors;
}

module.exports = { validateHoSoRow, validateVanBanRows, validateField };
