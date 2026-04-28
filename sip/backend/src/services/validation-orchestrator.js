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
const schemaCacheService = require('./schema-cache-service');

/**
 * Run full validation pipeline.
 */
async function runValidation({ fileList, excelBuffer }) {
  const result = {
    valid: false, hasErrors: false, hasWarnings: false,
    errorCount: 0, warningCount: 0, errors: [], suggestions: [],
    hoSoRow: null, vanBanRows: [],
  };

  const folderResult = validateFolderStructure(fileList);
  if (!folderResult.valid) {
    result.errors.push(...folderResult.errors);
    _tallyErrors(result);
    return result;
  }

  const parseResult = await parseExcel(excelBuffer);
  if (parseResult.errors.length > 0) {
    result.errors.push(...parseResult.errors);
    _tallyErrors(result);
    return result;
  }

  const { hoSoRow, vanBanRows, profileId } = parseResult;
  result.hoSoRow   = hoSoRow;
  result.vanBanRows = vanBanRows;
  result.profileId  = profileId; // propagate so upload route can store on dossier

  const fieldErrors = [
    ...(await validateHoSoRow(hoSoRow, profileId)),
    ...(await validateVanBanRows(vanBanRows, profileId)),
  ];
  result.errors.push(...fieldErrors);

  const crossErrors = crossValidate(hoSoRow, vanBanRows);
  result.errors.push(...crossErrors);

  const pdfErrors = validatePdfMapping(vanBanRows, folderResult.pdfFiles);
  result.errors.push(...pdfErrors);

  const fixableErrors = [...fieldErrors, ...crossErrors, ...pdfErrors];
  result.suggestions = generateSuggestions(fixableErrors, hoSoRow, vanBanRows);

  _tallyErrors(result);
  result.valid = result.errorCount === 0;
  return result;
}

/**
 * Re-validate already-parsed dossier data (after edits).
 */
async function reValidate({ hoSoRow, vanBanRows, pdfFiles, profileId = 'TT05' }) {
  const result = {
    valid: false, hasErrors: false, hasWarnings: false,
    errorCount: 0, warningCount: 0, errors: [], suggestions: [],
    hoSoRow, vanBanRows,
  };

  const fieldErrors = [
    ...(await validateHoSoRow(hoSoRow, profileId)),
    ...(await validateVanBanRows(vanBanRows, profileId)),
  ];
  const crossErrors = crossValidate(hoSoRow, vanBanRows);
  const pdfErrors   = validatePdfMapping(vanBanRows, pdfFiles || []);

  result.errors      = [...fieldErrors, ...crossErrors, ...pdfErrors];
  result.suggestions = generateSuggestions(result.errors, hoSoRow, vanBanRows);
  _tallyErrors(result);
  result.valid = result.errorCount === 0;
  return result;
}

/**
 * Validate a single field inline (real-time cell editing).
 * Async — loads live schema from cache.
 */
async function validateInline({ sheet, field, value, rowContext, rowNum, profileId }) {
  const pid    = profileId || await schemaCacheService.getActiveProfileId();
  const schema = await schemaCacheService.getSchema(pid, sheet);
  const fieldDef = schema.find(f => f.name === field);
  if (!fieldDef) return { errors: [], suggestions: [] };

  const errors      = await validateField(fieldDef, value, rowContext || {}, sheet, rowNum || 1, schema);
  const suggestions = generateSuggestions(errors, {}, []);
  return { errors, suggestions };
}

function _tallyErrors(result) {
  result.errorCount   = result.errors.filter(e => e.severity === 'ERROR').length;
  result.warningCount = result.errors.filter(e => e.severity === 'WARNING').length;
  result.hasErrors    = result.errorCount > 0;
  result.hasWarnings  = result.warningCount > 0;
}

module.exports = { runValidation, reValidate, validateInline };
