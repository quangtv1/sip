/**
 * Cross-sheet validation rules:
 * 1. Ho_so.tongSoTaiLieu == Van_ban row count
 * 2. Each Van_ban.maLuuTru must start with Ho_so.maHoSo
 * 3. No duplicate Van_ban.maLuuTru
 * 4. No duplicate Van_ban.maDinhDanh
 * 5. Ho_so.thoiGianBatDau ≤ thoiGianKetThuc
 * 6. Each Van_ban.thoiHanBaoQuan retention rank ≤ Ho_so.thoiHanBaoQuan
 */

const { THOI_HAN_BAO_QUAN } = require('../validators/enum-definitions');

// Retention rank: lower index = longer retention ("Vĩnh viễn" = index 0 = highest)
// A document's retention cannot EXCEED the dossier's retention.
// "exceed" means shorter ordinal index (e.g. dossier=03:50 năm, doc=02:70 năm → invalid).
const retentionRank = Object.freeze(
  THOI_HAN_BAO_QUAN.reduce((map, val, idx) => { map[val] = idx; return map; }, {})
);

/** Parse a DD/MM/YYYY string to a Date. Returns null on failure. */
function parseDate(str) {
  if (!str || !/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
  const [dd, mm, yyyy] = str.split('/').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getDate() === dd && d.getMonth() + 1 === mm ? d : null;
}

/**
 * @param {Object}   hoSoRow    — parsed Ho_so row (field-name keyed)
 * @param {Object[]} vanBanRows — parsed Van_ban rows
 * @returns {Array} errors array
 */
function crossValidate(hoSoRow, vanBanRows) {
  const errors = [];

  // 1. Document count match
  const declaredCount = parseInt(hoSoRow.tongSoTaiLieu, 10);
  const actualCount = vanBanRows.length;

  if (!isNaN(declaredCount) && declaredCount !== actualCount) {
    errors.push({
      sheet: 'Ho_so', row: 1, field: 'tongSoTaiLieu',
      label: 'Tổng số tài liệu trong hồ sơ',
      code: 'COUNT_MISMATCH',
      message: `Tổng số tài liệu khai báo (${declaredCount}) không khớp với số dòng trong sheet Van_ban (${actualCount})`,
      value: hoSoRow.tongSoTaiLieu, severity: 'ERROR',
    });
  }

  // 5. Date range: start ≤ end
  const startDate = parseDate(hoSoRow.thoiGianBatDau);
  const endDate = parseDate(hoSoRow.thoiGianKetThuc);
  if (startDate && endDate && startDate > endDate) {
    errors.push({
      sheet: 'Ho_so', row: 1, field: 'thoiGianKetThuc',
      label: 'Thời gian kết thúc',
      code: 'DATE_RANGE_INVALID',
      message: `Thời gian kết thúc (${hoSoRow.thoiGianKetThuc}) phải sau thời gian bắt đầu (${hoSoRow.thoiGianBatDau})`,
      value: hoSoRow.thoiGianKetThuc, severity: 'ERROR',
    });
  }

  // Per-row checks
  const seenMaLuuTru = new Map();
  const seenMaDinhDanh = new Map();
  const hoSoRetentionRank = retentionRank[hoSoRow.thoiHanBaoQuan];

  vanBanRows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return; // null-row guard
    const rowNum = idx + 1;
    const maLuuTru = row.maLuuTru ? String(row.maLuuTru) : '';
    const maDinhDanh = row.maDinhDanh ? String(row.maDinhDanh) : '';
    const maHoSo = hoSoRow.maHoSo ? String(hoSoRow.maHoSo) : '';

    // 2. MaLuuTru prefix check
    if (maLuuTru && maHoSo && !maLuuTru.startsWith(maHoSo)) {
      errors.push({
        sheet: 'Van_ban', row: rowNum, field: 'maLuuTru',
        label: 'Mã lưu trữ của tài liệu',
        code: 'MALUU_TRU_PREFIX_MISMATCH',
        message: `Mã lưu trữ "${maLuuTru}" phải bắt đầu bằng mã hồ sơ "${maHoSo}"`,
        value: maLuuTru, severity: 'ERROR',
      });
    }

    // 3. Duplicate maLuuTru
    if (maLuuTru) {
      if (seenMaLuuTru.has(maLuuTru)) {
        errors.push({
          sheet: 'Van_ban', row: rowNum, field: 'maLuuTru',
          label: 'Mã lưu trữ của tài liệu',
          code: 'DUPLICATE_MA_LUU_TRU',
          message: `Mã lưu trữ "${maLuuTru}" bị trùng với dòng ${seenMaLuuTru.get(maLuuTru)}`,
          value: maLuuTru, severity: 'ERROR',
        });
      } else {
        seenMaLuuTru.set(maLuuTru, rowNum);
      }
    }

    // 4. Duplicate maDinhDanh
    if (maDinhDanh) {
      if (seenMaDinhDanh.has(maDinhDanh)) {
        errors.push({
          sheet: 'Van_ban', row: rowNum, field: 'maDinhDanh',
          label: 'Mã định danh tài liệu',
          code: 'DUPLICATE_MA_DINH_DANH',
          message: `Mã định danh "${maDinhDanh}" bị trùng với dòng ${seenMaDinhDanh.get(maDinhDanh)}`,
          value: maDinhDanh, severity: 'ERROR',
        });
      } else {
        seenMaDinhDanh.set(maDinhDanh, rowNum);
      }
    }

    // 6. Retention period: Van_ban cannot exceed Ho_so retention
    const vbRetentionRank = retentionRank[row.thoiHanBaoQuan];
    if (
      hoSoRetentionRank !== undefined &&
      vbRetentionRank !== undefined &&
      vbRetentionRank < hoSoRetentionRank // lower index = longer retention = exceeds dossier
    ) {
      errors.push({
        sheet: 'Van_ban', row: rowNum, field: 'thoiHanBaoQuan',
        label: 'Thời hạn bảo quản',
        code: 'RETENTION_EXCEEDS_DOSSIER',
        message: `Thời hạn bảo quản của văn bản (${row.thoiHanBaoQuan}) không được vượt quá thời hạn hồ sơ (${hoSoRow.thoiHanBaoQuan})`,
        value: row.thoiHanBaoQuan, severity: 'ERROR',
      });
    }
  });

  return errors;
}

module.exports = { crossValidate };
