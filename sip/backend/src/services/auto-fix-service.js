/**
 * Auto-fix suggestion engine.
 *
 * Scans validation errors and produces SUGGESTIONS ONLY — never auto-applies.
 * Each suggestion: { sheet, row, field, label, current, suggested, confidence, fixType }
 * confidence: 'HIGH' | 'MEDIUM' | 'LOW'
 */

const levenshtein = require('fast-levenshtein');
const { excelSerialToDate } = require('./excel-parser-service');
const {
  THOI_HAN_BAO_QUAN,
  CHE_DO_SU_DUNG,
  NGON_NGU,
  TINH_TRANG_VAT_LY,
  MUC_DO_TIN_CAY,
  CHE_DO_DU_PHONG,
  TINH_TRANG_DU_PHONG,
  TEN_LOAI_TAI_LIEU,
} = require('../validators/enum-definitions');

const ALL_ENUMS = [
  ...THOI_HAN_BAO_QUAN,
  ...CHE_DO_SU_DUNG,
  ...NGON_NGU,
  ...TINH_TRANG_VAT_LY,
  ...MUC_DO_TIN_CAY,
  ...CHE_DO_DU_PHONG,
  ...TINH_TRANG_DU_PHONG,
  ...TEN_LOAI_TAI_LIEU,
];

// ---- Date normalisation ----------------------------------------------------

const DATE_FORMATS = [
  // d-m-yyyy or d/m/yyyy (single or double digit)
  { regex: /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/, pad: true },
  // yyyy-mm-dd
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, isoOrder: true },
];

/**
 * Try to parse a messy date string into DD/MM/YYYY.
 * Returns suggested string or null.
 */
function tryFixDate(value) {
  const trimmed = String(value).trim();

  // Already correct
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return null;

  // Excel serial number (pure integer)
  if (/^\d{5}$/.test(trimmed)) {
    const converted = excelSerialToDate(parseInt(trimmed, 10));
    return converted || null;
  }

  for (const fmt of DATE_FORMATS) {
    const m = trimmed.match(fmt.regex);
    if (m) {
      if (fmt.isoOrder) {
        const [, yyyy, mm, dd] = m;
        return `${dd}/${mm}/${yyyy}`;
      }
      const [, d, mo, y] = m;
      return `${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}/${y}`;
    }
  }

  return null;
}

// ---- Enum fuzzy match -------------------------------------------------------

/**
 * Find the closest enum value to `value` within the given enum list.
 * Uses Levenshtein distance. Returns { suggested, confidence } or null.
 */
function findClosestEnum(value, enumValues) {
  if (!value || enumValues.length === 0) return null;

  const lower = String(value).toLowerCase();
  let best = null;
  let bestDist = Infinity;

  for (const ev of enumValues) {
    const dist = levenshtein.get(lower, ev.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = ev;
    }
  }

  if (!best) return null;

  const threshold = Math.max(3, Math.floor(best.length * 0.4));
  if (bestDist > threshold) return null;

  const confidence = bestDist === 0 ? null : bestDist <= 2 ? 'HIGH' : bestDist <= 4 ? 'MEDIUM' : 'LOW';
  return confidence ? { suggested: best, confidence } : null;
}

// ---- Whitespace trim -------------------------------------------------------

function tryFixTrim(value) {
  const trimmed = String(value).trim();
  return trimmed !== String(value) ? trimmed : null;
}

// ---- Numeric extraction ----------------------------------------------------

function tryFixInt(value) {
  const match = String(value).match(/\d+/);
  if (match && String(parseInt(match[0], 10)) !== String(value).trim()) {
    return String(parseInt(match[0], 10));
  }
  return null;
}

// ---- Main entry point -------------------------------------------------------

/**
 * Generate auto-fix suggestions for a list of validation errors.
 *
 * @param {Array}    errors       — from field/cross validators
 * @param {Object}   hoSoRow      — parsed Ho_so row
 * @param {Object[]} vanBanRows   — parsed Van_ban rows
 * @returns {Array} suggestions
 */
function generateSuggestions(errors, hoSoRow, vanBanRows) {
  const suggestions = [];

  for (const err of errors) {
    const { sheet, row, field, label, code, value } = err;
    if (value === null || value === undefined || String(value).trim() === '') continue;

    const strVal = String(value);

    // Date fixes
    if (code === 'INVALID_DATE') {
      const suggested = tryFixDate(strVal);
      if (suggested) {
        suggestions.push({ sheet, row, field, label, current: strVal, suggested, confidence: 'HIGH', fixType: 'DATE_REFORMAT' });
      }
      continue;
    }

    // Enum fixes
    if (code === 'INVALID_ENUM') {
      // Get the enum list for this field from the error's sheet + field context
      const enumList = getEnumListForField(sheet, field);
      const match = findClosestEnum(strVal, enumList);
      if (match) {
        suggestions.push({ sheet, row, field, label, current: strVal, suggested: match.suggested, confidence: match.confidence, fixType: 'ENUM_FUZZY' });
      }

      // Also try trim-then-enum
      const trimmed = tryFixTrim(strVal);
      if (trimmed && trimmed !== strVal) {
        const matchTrimmed = findClosestEnum(trimmed, enumList);
        if (matchTrimmed && (!match || matchTrimmed.suggested !== match.suggested)) {
          suggestions.push({ sheet, row, field, label, current: strVal, suggested: matchTrimmed.suggested, confidence: matchTrimmed.confidence, fixType: 'TRIM_THEN_ENUM' });
        }
      }
      continue;
    }

    // Positive int fixes
    if (code === 'INVALID_POSITIVE_INT') {
      const suggested = tryFixInt(strVal);
      if (suggested) {
        suggestions.push({ sheet, row, field, label, current: strVal, suggested, confidence: 'MEDIUM', fixType: 'INT_EXTRACT' });
      }
      continue;
    }

    // Generic whitespace trim (for REQUIRED failures with whitespace-only values, etc.)
    if (code === 'REQUIRED') {
      const trimmed = tryFixTrim(strVal);
      if (trimmed && trimmed !== '') {
        suggestions.push({ sheet, row, field, label, current: strVal, suggested: trimmed, confidence: 'HIGH', fixType: 'TRIM' });
      }
    }
  }

  return suggestions;
}

/**
 * Look up the enum list for a given field name + sheet.
 * Falls back to searching ALL_ENUMS if no specific match.
 */
function getEnumListForField(sheet, fieldName) {
  const enumMap = {
    thoiHanBaoQuan: THOI_HAN_BAO_QUAN,
    cheDoSuDung: CHE_DO_SU_DUNG,
    ngonNgu: NGON_NGU,
    tinhTrangVatLy: TINH_TRANG_VAT_LY,
    mucDoTinCay: MUC_DO_TIN_CAY,
    cheDoDuPhong: CHE_DO_DU_PHONG,
    tinhTrangDuPhong: TINH_TRANG_DU_PHONG,
    tenLoaiTaiLieu: TEN_LOAI_TAI_LIEU,
  };
  return enumMap[fieldName] || ALL_ENUMS;
}

module.exports = { generateSuggestions };
