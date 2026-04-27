/**
 * Unit tests for cross-validator-service.js
 * Run: node --test src/tests/cross-validator.test.js
 */

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const { crossValidate } = require('../services/cross-validator-service');

function makeHoSo(overrides = {}) {
  return { maHoSo: 'H49.61.8.2017', tongSoTaiLieu: '3', ...overrides };
}

function makeVanBan(maLuuTru) {
  return { maLuuTru };
}

describe('crossValidate', () => {
  test('no errors when count matches and prefixes correct', () => {
    const rows = [
      makeVanBan('H49.61.8.2017.0000001'),
      makeVanBan('H49.61.8.2017.0000002'),
      makeVanBan('H49.61.8.2017.0000003'),
    ];
    const errors = crossValidate(makeHoSo(), rows);
    assert.equal(errors.length, 0);
  });

  test('count mismatch produces COUNT_MISMATCH error', () => {
    const rows = [makeVanBan('H49.61.8.2017.0000001'), makeVanBan('H49.61.8.2017.0000002')];
    const errors = crossValidate(makeHoSo({ tongSoTaiLieu: '3' }), rows);
    const err = errors.find((e) => e.code === 'COUNT_MISMATCH');
    assert.ok(err);
    assert.equal(err.sheet, 'Ho_so');
  });

  test('wrong prefix produces MALUU_TRU_PREFIX_MISMATCH', () => {
    const rows = [makeVanBan('X99.00.0.2017.0000001')];
    const errors = crossValidate(makeHoSo({ tongSoTaiLieu: '1' }), rows);
    const err = errors.find((e) => e.code === 'MALUU_TRU_PREFIX_MISMATCH');
    assert.ok(err);
    assert.equal(err.row, 1);
  });

  test('duplicate maLuuTru produces DUPLICATE_MA_LUU_TRU', () => {
    const rows = [
      makeVanBan('H49.61.8.2017.0000001'),
      makeVanBan('H49.61.8.2017.0000001'),
    ];
    const errors = crossValidate(makeHoSo({ tongSoTaiLieu: '2' }), rows);
    const err = errors.find((e) => e.code === 'DUPLICATE_MA_LUU_TRU');
    assert.ok(err);
    assert.equal(err.row, 2);
  });

  test('count mismatch AND prefix error are both reported', () => {
    const rows = [makeVanBan('WRONG.0000001')];
    const errors = crossValidate(makeHoSo({ tongSoTaiLieu: '3' }), rows);
    assert.ok(errors.find((e) => e.code === 'COUNT_MISMATCH'));
    assert.ok(errors.find((e) => e.code === 'MALUU_TRU_PREFIX_MISMATCH'));
  });

  test('empty maLuuTru rows are skipped for prefix/duplicate checks', () => {
    const rows = [makeVanBan('')];
    const errors = crossValidate(makeHoSo({ tongSoTaiLieu: '1' }), rows);
    // Should only have count (passes) — no prefix or duplicate errors
    assert.ok(!errors.find((e) => e.code === 'MALUU_TRU_PREFIX_MISMATCH'));
    assert.ok(!errors.find((e) => e.code === 'DUPLICATE_MA_LUU_TRU'));
  });

  test('non-numeric tongSoTaiLieu skips count check', () => {
    const rows = [makeVanBan('H49.61.8.2017.0000001')];
    const errors = crossValidate(makeHoSo({ tongSoTaiLieu: 'invalid' }), rows);
    assert.ok(!errors.find((e) => e.code === 'COUNT_MISMATCH'));
  });
});
