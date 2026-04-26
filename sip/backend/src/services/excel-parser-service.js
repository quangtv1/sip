/**
 * Parse Ho_so and Van_ban sheets from an Excel file using SheetJS.
 * Maps columns by position (index), not by header text — tolerates header variations.
 *
 * Returns:
 *   { hoSoRow: Object, vanBanRows: Object[], errors: [] }
 *
 * hoSoRow:  { maHoSo, tieuDeHoSo, … } — keyed by schema field names
 * vanBanRows: array of row objects keyed by schema field names
 * errors: structural errors (missing sheet, too many header rows, etc.)
 */

const XLSX = require('xlsx');
const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');

const HO_SO_SHEET = 'Ho_so';
const VAN_BAN_SHEET = 'Van_ban';

// Excel stores dates as serial numbers when cellDates is false.
// Epoch offset: Excel day 1 = 1900-01-01 (with the infamous leap-year bug offset of 1).
const EXCEL_EPOCH_OFFSET = 25569; // days between 1900-01-01 and 1970-01-01 (adjusted)

/**
 * Convert an Excel date serial number to DD/MM/YYYY string.
 */
function excelSerialToDate(serial) {
  // XLSX serial 1 = 1900-01-01; adjust for the 1900 leap year bug
  const date = new Date(Math.round((serial - EXCEL_EPOCH_OFFSET) * 86400 * 1000));
  if (isNaN(date.getTime())) return null;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Coerce a raw cell value to string.
 * Handles Date objects (from cellDates:true), serial numbers, booleans, etc.
 */
function cellToString(raw) {
  if (raw === null || raw === undefined) return '';
  if (raw instanceof Date) {
    const dd = String(raw.getUTCDate()).padStart(2, '0');
    const mm = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = raw.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  if (typeof raw === 'number') {
    // Could be a date serial — caller decides; return raw number as string
    return String(raw);
  }
  return String(raw);
}

/**
 * Parse a single sheet into array of row arrays (raw cell values).
 * Skips fully-empty rows.
 * dataRow: 0-based index of the first data row (after headers).
 */
function parseSheetToRows(sheet, dataRowStart) {
  if (!sheet) return [];

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const rows = [];

  for (let r = dataRowStart; r <= range.e.r; r++) {
    const row = [];
    let hasValue = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const val = cell ? cellToString(cell.v) : '';
      row.push(val);
      if (val !== '') hasValue = true;
    }

    if (hasValue) rows.push(row);
  }

  return rows;
}

/**
 * Map a raw row array to a named object using the given schema.
 */
function mapRowToObject(row, schema) {
  const obj = {};
  for (const field of schema) {
    obj[field.name] = row[field.index] !== undefined ? row[field.index] : '';
  }
  return obj;
}

/**
 * Main parse function.
 * @param {string|Buffer} filePathOrBuffer — absolute path or Buffer
 * @returns {{ hoSoRow: Object|null, vanBanRows: Object[], errors: Array }}
 */
function parseExcel(filePathOrBuffer) {
  const errors = [];
  let workbook;

  try {
    const opts = { cellDates: true, type: Buffer.isBuffer(filePathOrBuffer) ? 'buffer' : 'file' };
    workbook = XLSX.readFile
      ? (Buffer.isBuffer(filePathOrBuffer)
          ? XLSX.read(filePathOrBuffer, opts)
          : XLSX.readFile(filePathOrBuffer, opts))
      : XLSX.read(filePathOrBuffer, opts);
  } catch (err) {
    errors.push({ code: 'EXCEL_PARSE_ERROR', message: `Không đọc được file Excel: ${err.message}`, severity: 'ERROR' });
    return { hoSoRow: null, vanBanRows: [], errors };
  }

  // Validate sheet presence
  if (!workbook.SheetNames.includes(HO_SO_SHEET)) {
    errors.push({ code: 'MISSING_HO_SO_SHEET', message: `Sheet "${HO_SO_SHEET}" không tồn tại trong file Excel`, severity: 'ERROR' });
  }
  if (!workbook.SheetNames.includes(VAN_BAN_SHEET)) {
    errors.push({ code: 'MISSING_VAN_BAN_SHEET', message: `Sheet "${VAN_BAN_SHEET}" không tồn tại trong file Excel`, severity: 'ERROR' });
  }
  if (errors.length > 0) return { hoSoRow: null, vanBanRows: [], errors };

  // Ho_so: row 0 = headers, row 1 = data (single data row)
  const hoSoSheet = workbook.Sheets[HO_SO_SHEET];
  const hoSoRawRows = parseSheetToRows(hoSoSheet, 1);

  if (hoSoRawRows.length === 0) {
    errors.push({ code: 'EMPTY_HO_SO_SHEET', message: `Sheet "${HO_SO_SHEET}" không có dữ liệu`, severity: 'ERROR' });
    return { hoSoRow: null, vanBanRows: [], errors };
  }

  const hoSoRow = mapRowToObject(hoSoRawRows[0], HO_SO_SCHEMA);

  // Van_ban: row 0 = headers, rows 1+ = data
  const vanBanSheet = workbook.Sheets[VAN_BAN_SHEET];
  const vanBanRawRows = parseSheetToRows(vanBanSheet, 1);
  const vanBanRows = vanBanRawRows.map((row) => mapRowToObject(row, VAN_BAN_SCHEMA));

  return { hoSoRow, vanBanRows, errors };
}

module.exports = { parseExcel, excelSerialToDate };
