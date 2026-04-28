/**
 * Unit tests for field-validator-service.js
 * Run: node --test src/tests/field-validator.test.js
 *
 * validateHoSoRow / validateVanBanRows are async (load schema from cache).
 * Cache falls back to hardcoded when DB is unavailable, so tests run without DB.
 */

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const { validateHoSoRow, validateVanBanRows, validateField } = require('../services/field-validator-service');
const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeValidHoSo(overrides = {}) {
  return {
    maHoSo: 'H49.61.8.2017',
    tieuDeHoSo: 'Hồ sơ test',
    thoiHanBaoQuan: '01: Vĩnh viễn',
    cheDoSuDung: '01: Công khai',
    ngonNgu: '01: Tiếng Việt',
    thoiGianBatDau: '01/01/2017',
    thoiGianKetThuc: '31/12/2017',
    tuKhoa: 'test',
    tongSoTaiLieu: '3',
    soLuongTo: '10',
    soLuongTrang: '30',
    tinhTrangVatLy: '',
    kyHieuThongTin: '',
    mucDoTinCay: '01: Gốc điện tử',
    maHoSoGocGiay: '',
    cheDoDuPhong: '0: Không',
    tinhTrangDuPhong: '',
    ghiChu: 'Ghi chú test',
    ...overrides,
  };
}

function makeValidVanBan(maHoSo = 'H49.61.8.2017', index = 1, overrides = {}) {
  const seq = String(index).padStart(7, '0');
  return {
    maDinhDanh: `VB${seq}`,
    maLuuTru: `${maHoSo}.${seq}`,
    thoiHanBaoQuan: '01: Vĩnh viễn',
    tenLoaiTaiLieu: '16: Công văn',
    soTaiLieu: `123/${index}`,
    kyHieuTaiLieu: 'KH',
    ngayThangNam: '15/06/2017',
    tenCoQuan: 'UBND',
    trichYeuNoiDung: 'Nội dung văn bản',
    ngonNgu: '01: Tiếng Việt',
    soLuongTrang: '5',
    kyHieuThongTin: 'A',
    tuKhoa: 'test',
    cheDoSuDung: '01: Công khai',
    mucDoTinCay: '01: Gốc điện tử',
    butTich: '',
    tinhTrangVatLy: '',
    cheDoDuPhong: '0: Không',
    tinhTrangDuPhong: '',
    ghiChu: 'Ghi chú',
    duongDanPdf: '',
    ...overrides,
  };
}

// ── Ho_so tests ───────────────────────────────────────────────────────────────

describe('validateHoSoRow', () => {
  test('valid row produces no errors', async () => {
    const errors = await validateHoSoRow(makeValidHoSo());
    assert.equal(errors.length, 0);
  });

  test('missing required field produces ERROR', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ tieuDeHoSo: '' }));
    const err = errors.find(e => e.field === 'tieuDeHoSo');
    assert.ok(err, 'expected error for tieuDeHoSo');
    assert.equal(err.severity, 'ERROR');
    assert.equal(err.code, 'REQUIRED');
  });

  test('invalid enum value produces INVALID_ENUM error', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ thoiHanBaoQuan: '01' }));
    const err = errors.find(e => e.field === 'thoiHanBaoQuan');
    assert.ok(err);
    assert.equal(err.code, 'INVALID_ENUM');
  });

  test('exact enum string passes', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ thoiHanBaoQuan: '01: Vĩnh viễn' }));
    assert.ok(!errors.find(e => e.field === 'thoiHanBaoQuan'));
  });

  test('invalid date format produces INVALID_DATE error', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ thoiGianBatDau: '1-1-2017' }));
    const err = errors.find(e => e.field === 'thoiGianBatDau');
    assert.ok(err);
    assert.equal(err.code, 'INVALID_DATE');
  });

  test('non-positive integer produces INVALID_POSITIVE_INT', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ tongSoTaiLieu: '0' }));
    const err = errors.find(e => e.field === 'tongSoTaiLieu');
    assert.ok(err);
    assert.equal(err.code, 'INVALID_POSITIVE_INT');
  });

  test('conditional: tinhTrangDuPhong required when cheDoDuPhong = 1: Có', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ cheDoDuPhong: '1: Có', tinhTrangDuPhong: '' }));
    const err = errors.find(e => e.field === 'tinhTrangDuPhong');
    assert.ok(err);
    assert.equal(err.code, 'REQUIRED');
  });

  test('conditional: tinhTrangDuPhong not required when cheDoDuPhong = 0: Không', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ cheDoDuPhong: '0: Không', tinhTrangDuPhong: '' }));
    assert.ok(!errors.find(e => e.field === 'tinhTrangDuPhong'));
  });

  test('maHoSo regex: at least 4 segments required', async () => {
    const errors = await validateHoSoRow(makeValidHoSo({ maHoSo: 'H49.61.8' }));
    const err = errors.find(e => e.field === 'maHoSo');
    assert.ok(err);
    assert.equal(err.code, 'INVALID_FORMAT');
  });
});

// ── Van_ban tests ─────────────────────────────────────────────────────────────

describe('validateVanBanRows', () => {
  test('valid rows produce no errors', async () => {
    const rows   = [makeValidVanBan(), makeValidVanBan('H49.61.8.2017', 2)];
    const errors = await validateVanBanRows(rows);
    assert.equal(errors.length, 0);
  });

  test('missing required field on row 2 reports correct row number', async () => {
    const rows   = [makeValidVanBan(), makeValidVanBan('H49.61.8.2017', 2, { trichYeuNoiDung: '' })];
    const errors = await validateVanBanRows(rows);
    const err    = errors.find(e => e.field === 'trichYeuNoiDung');
    assert.ok(err);
    assert.equal(err.row, 2);
  });

  test('invalid tenLoaiTaiLieu enum', async () => {
    const rows   = [makeValidVanBan('H49.61.8.2017', 1, { tenLoaiTaiLieu: 'Công văn' })];
    const errors = await validateVanBanRows(rows);
    const err    = errors.find(e => e.field === 'tenLoaiTaiLieu');
    assert.ok(err);
    assert.equal(err.code, 'INVALID_ENUM');
  });

  test('conditional tinhTrangDuPhong in Van_ban', async () => {
    const rows   = [makeValidVanBan('H49.61.8.2017', 1, { cheDoDuPhong: '1: Có', tinhTrangDuPhong: '' })];
    const errors = await validateVanBanRows(rows);
    const err    = errors.find(e => e.field === 'tinhTrangDuPhong');
    assert.ok(err);
    assert.equal(err.code, 'REQUIRED');
  });

  test('optional tinhTrangVatLy with invalid value produces WARNING', async () => {
    const rows   = [makeValidVanBan('H49.61.8.2017', 1, { tinhTrangVatLy: 'Bad' })];
    const errors = await validateVanBanRows(rows);
    const err    = errors.find(e => e.field === 'tinhTrangVatLy');
    assert.ok(err);
    assert.equal(err.severity, 'WARNING');
  });
});
