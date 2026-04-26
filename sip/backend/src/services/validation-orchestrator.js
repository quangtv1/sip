/**
 * Orchestrates all validation steps in order:
 * 1. Folder structure
 * 2. Excel parse
 * 3. Field validation (Ho_so + Van_ban)
 * 4. Cross-validation
 * 5. PDF mapping
 * 6. Auto-fix suggestions
 *
 * Returns a unified result object ready to persist in MongoDB and return to client.
 */

const { validateFolderStructure } = require('./folder-structure-validator');
const { parseExcel } = require('./excel-parser-service');
const { validateHoSoRow, validateVanBanRows, validateField } = require('./field-validator-service');
const { crossValidate } = require('./cross-validator-service');
const { validatePdfMapping } = require('./pdf-mapping-validator');
const { generateSuggestions } = require('./auto-fix-service');
const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');

/**
 * Run full validation pipeline.
 *
 * @param {object} params
 * @param {string[]} params.fileList   — relative paths of all uploaded files
 * @param {string}   params.excelBuffer — Buffer or absolute path of the Excel file
 * @returns {ValidationResult}
 */
async function runValidation({ fileList, excelBuffer }) {
  const result = {
    valid: false,
    hasErrors: false,
    hasWarnings: false,
    errorCount: 0,
    warningCount: 0,
    errors: [],
    suggestions: [],
    hoSoRow: null,
    vanBanRows: [],
  };

  // Step 1: folder structure
  const folderResult = validateFolderStructure(fileList);
  if (!folderResult.valid) {
    result.errors.push(...folderResult.errors);
    _tallyErrors(result);
    return result; // hard block — cannot proceed without valid structure
  }

  // Step 2: parse Excel
  const parseResult = parseExcel(excelBuffer);
  if (parseResult.errors.length > 0) {
    result.errors.push(...parseResult.errors);
    _tallyErrors(result);
    return result;
  }

  const { hoSoRow, vanBanRows } = parseResult;
  result.hoSoRow = hoSoRow;
  result.vanBanRows = vanBanRows;

  // Step 3: field validation
  const fieldErrors = [
    ...validateHoSoRow(hoSoRow),
    ...validateVanBanRows(vanBanRows),
  ];
  result.errors.push(...fieldErrors);

  // Step 4: cross-validation
  const crossErrors = crossValidate(hoSoRow, vanBanRows);
  result.errors.push(...crossErrors);

  // Step 5: PDF mapping
  const pdfErrors = validatePdfMapping(vanBanRows, folderResult.pdfFiles);
  result.errors.push(...pdfErrors);

  // Step 6: auto-fix suggestions (only for field + cross errors, not structural)
  const fixableErrors = [...fieldErrors, ...crossErrors, ...pdfErrors];
  result.suggestions = generateSuggestions(fixableErrors, hoSoRow, vanBanRows);

  _tallyErrors(result);
  result.valid = result.errorCount === 0;

  return result;
}

/**
 * Run validation on an already-parsed dossier (re-validate after edits).
 *
 * @param {Object}   hoSoRow
 * @param {Object[]} vanBanRows
 * @param {string[]} pdfFiles  — basenames in Attachment/
 * @returns {ValidationResult}
 */
async function reValidate({ hoSoRow, vanBanRows, pdfFiles }) {
  const result = {
    valid: false,
    hasErrors: false,
    hasWarnings: false,
    errorCount: 0,
    warningCount: 0,
    errors: [],
    suggestions: [],
    hoSoRow,
    vanBanRows,
  };

  const fieldErrors = [
    ...validateHoSoRow(hoSoRow),
    ...validateVanBanRows(vanBanRows),
  ];
  const crossErrors = crossValidate(hoSoRow, vanBanRows);
  const pdfErrors = validatePdfMapping(vanBanRows, pdfFiles || []);

  result.errors = [...fieldErrors, ...crossErrors, ...pdfErrors];
  result.suggestions = generateSuggestions(result.errors, hoSoRow, vanBanRows);

  _tallyErrors(result);
  result.valid = result.errorCount === 0;

  return result;
}

/**
 * Validate a single field value inline (for real-time cell editing).
 *
 * @param {string}   sheet    — 'Ho_so' | 'Van_ban'
 * @param {string}   field    — field name
 * @param {string}   value    — new value to validate
 * @param {Object}   rowContext — full row for conditional checks
 * @param {number}   rowNum   — 1-based row number
 * @returns {{ errors: Array, suggestions: Array }}
 */
function validateInline({ sheet, field, value, rowContext, rowNum }) {
  const schema = sheet === 'Ho_so' ? HO_SO_SCHEMA : VAN_BAN_SCHEMA;
  const fieldDef = schema.find((f) => f.name === field);

  if (!fieldDef) return { errors: [], suggestions: [] };

  const errors = validateField(fieldDef, value, rowContext || {}, sheet, rowNum || 1);
  const suggestions = generateSuggestions(errors, {}, []);

  return { errors, suggestions };
}

function _tallyErrors(result) {
  result.errorCount = result.errors.filter((e) => e.severity === 'ERROR').length;
  result.warningCount = result.errors.filter((e) => e.severity === 'WARNING').length;
  result.hasErrors = result.errorCount > 0;
  result.hasWarnings = result.warningCount > 0;
}

module.exports = { runValidation, reValidate, validateInline };
