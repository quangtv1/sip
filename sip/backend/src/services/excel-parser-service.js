/**
 * Parse primary and secondary sheets from an Excel file using SheetJS.
 * Sheet names come from the active validation profile (default: Ho_so / Van_ban).
 * Maps columns by position (index), not by header text — tolerates header variations.
 *
 * Returns:
 *   { hoSoRow: Object, vanBanRows: Object[], errors: [], profileId: string }
 *
 * hoSoRow:  { maHoSo, tieuDeHoSo, … } — keyed by schema field names
 * vanBanRows: array of row objects keyed by schema field names
 * errors: structural errors (missing sheet, too many header rows, etc.)
 *
 * parseExcel is async — loads active profile and field schemas from schema-cache-service.
 */

const XLSX = require('xlsx');
const schemaCacheService = require('./schema-cache-service');

const EXCEL_EPOCH_OFFSET = 25569;

function excelSerialToDate(serial) {
  const date = new Date(Math.round((serial - EXCEL_EPOCH_OFFSET) * 86400 * 1000));
  if (isNaN(date.getTime())) return null;
  const dd   = String(date.getUTCDate()).padStart(2, '0');
  const mm   = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function cellToString(raw) {
  if (raw === null || raw === undefined) return '';
  if (raw instanceof Date) {
    const dd   = String(raw.getUTCDate()).padStart(2, '0');
    const mm   = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = raw.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(raw);
}

function parseSheetToRows(sheet, dataRowStart) {
  if (!sheet) return [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  const rows  = [];
  for (let r = dataRowStart; r <= range.e.r; r++) {
    const row = [];
    let hasValue = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const val  = cell ? cellToString(cell.v) : '';
      row.push(val);
      if (val !== '') hasValue = true;
    }
    if (hasValue) rows.push(row);
  }
  return rows;
}

function mapRowToObject(row, schema) {
  const obj = {};
  for (const field of schema) {
    obj[field.name] = row[field.index] !== undefined ? row[field.index] : '';
  }
  return obj;
}

/**
 * Main parse function — async to load active profile and live field schemas.
 * @param {string|Buffer} filePathOrBuffer
 * @returns {Promise<{ hoSoRow: Object|null, vanBanRows: Object[], errors: Array, profileId: string }>}
 */
async function parseExcel(filePathOrBuffer) {
  const errors = [];

  // Load active profile to get configurable sheet names
  const profileId   = await schemaCacheService.getActiveProfileId();
  const profile     = await schemaCacheService.getProfile(profileId);
  const primarySheet   = profile?.sheets?.[0] || profile?.primarySheet   || 'Ho_so';
  const secondarySheet = profile?.sheets?.[1] || profile?.secondarySheet || 'Van_ban';

  let workbook;
  try {
    const opts = { cellDates: true, type: Buffer.isBuffer(filePathOrBuffer) ? 'buffer' : 'file' };
    workbook = Buffer.isBuffer(filePathOrBuffer)
      ? XLSX.read(filePathOrBuffer, opts)
      : XLSX.readFile(filePathOrBuffer, opts);
  } catch (err) {
    errors.push({ code: 'EXCEL_PARSE_ERROR', message: `Không đọc được file Excel: ${err.message}`, severity: 'ERROR' });
    return { hoSoRow: null, vanBanRows: [], errors, profileId };
  }

  if (!workbook.SheetNames.includes(primarySheet)) {
    errors.push({ code: 'MISSING_HO_SO_SHEET', message: `Sheet "${primarySheet}" không tồn tại trong file Excel`, severity: 'ERROR' });
  }
  if (!workbook.SheetNames.includes(secondarySheet)) {
    errors.push({ code: 'MISSING_VAN_BAN_SHEET', message: `Sheet "${secondarySheet}" không tồn tại trong file Excel`, severity: 'ERROR' });
  }
  if (errors.length > 0) return { hoSoRow: null, vanBanRows: [], errors, profileId };

  // Load live schemas (cache hit most of the time)
  const [hoSoSchema, vanBanSchema] = await Promise.all([
    schemaCacheService.getSchema(profileId, primarySheet),
    schemaCacheService.getSchema(profileId, secondarySheet),
  ]);

  const hoSoSheet   = workbook.Sheets[primarySheet];
  const hoSoRawRows = parseSheetToRows(hoSoSheet, 1);

  if (hoSoRawRows.length === 0) {
    errors.push({ code: 'EMPTY_HO_SO_SHEET', message: `Sheet "${primarySheet}" không có dữ liệu`, severity: 'ERROR' });
    return { hoSoRow: null, vanBanRows: [], errors, profileId };
  }

  const hoSoRow    = mapRowToObject(hoSoRawRows[0], hoSoSchema);
  const vanBanSheet = workbook.Sheets[secondarySheet];
  const vanBanRows  = parseSheetToRows(vanBanSheet, 1).map(row => mapRowToObject(row, vanBanSchema));

  return { hoSoRow, vanBanRows, errors, profileId };
}

module.exports = { parseExcel, excelSerialToDate };
