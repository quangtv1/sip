/**
 * Unit tests for pdf-mapping-validator.js
 * Run: node --test src/tests/pdf-mapping-validator.test.js
 */

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const { validatePdfMapping } = require('../services/pdf-mapping-validator');

function row(maLuuTru, duongDanPdf = '') {
  return { maLuuTru, duongDanPdf };
}

describe('validatePdfMapping', () => {
  test('no errors when all PDFs matched', () => {
    const rows = [row('H49.0000001', 'VB001.pdf'), row('H49.0000002', 'VB002.pdf')];
    const pdfFiles = ['VB001.pdf', 'VB002.pdf'];
    const errors = validatePdfMapping(rows, pdfFiles);
    assert.equal(errors.length, 0);
  });

  test('missing PDF produces ERROR', () => {
    const rows = [row('H49.0000001', 'VB001.pdf')];
    const errors = validatePdfMapping(rows, []);
    const err = errors.find((e) => e.code === 'MISSING_PDF');
    assert.ok(err);
    assert.equal(err.severity, 'ERROR');
    assert.equal(err.row, 1);
  });

  test('fallback to {maLuuTru}.pdf when field 21 empty', () => {
    const rows = [row('H49.0000001', '')];
    const errors = validatePdfMapping(rows, ['H49.0000001.pdf']);
    assert.equal(errors.length, 0);
  });

  test('fallback missing PDF produces ERROR', () => {
    const rows = [row('H49.0000001', '')];
    const errors = validatePdfMapping(rows, []);
    const err = errors.find((e) => e.code === 'MISSING_PDF');
    assert.ok(err);
  });

  test('extra PDF in Attachment produces WARNING', () => {
    const rows = [row('H49.0000001', 'VB001.pdf')];
    const pdfFiles = ['VB001.pdf', 'extra.pdf'];
    const errors = validatePdfMapping(rows, pdfFiles);
    const warn = errors.find((e) => e.code === 'EXTRA_PDF');
    assert.ok(warn);
    assert.equal(warn.severity, 'WARNING');
    assert.equal(warn.value, 'extra.pdf');
  });

  test('multiple PDFs in field 21 (comma-separated)', () => {
    const rows = [row('H49.0000001', 'VB001.pdf, VB002.pdf')];
    const pdfFiles = ['VB001.pdf', 'VB002.pdf'];
    const errors = validatePdfMapping(rows, pdfFiles);
    assert.equal(errors.length, 0);
  });

  test('one PDF missing in comma-separated list', () => {
    const rows = [row('H49.0000001', 'VB001.pdf, VB999.pdf')];
    const pdfFiles = ['VB001.pdf'];
    const errors = validatePdfMapping(rows, pdfFiles);
    const missing = errors.find((e) => e.code === 'MISSING_PDF' && e.value === 'VB999.pdf');
    assert.ok(missing);
  });

  test('duplicate PDF name within same row produces ERROR', () => {
    const rows = [row('H49.0000001', 'VB001.pdf, VB001.pdf')];
    const pdfFiles = ['VB001.pdf'];
    const errors = validatePdfMapping(rows, pdfFiles);
    const dup = errors.find((e) => e.code === 'DUPLICATE_PDF_IN_ROW');
    assert.ok(dup);
  });

  test('exact case match required — different case is missing', () => {
    const rows = [row('H49.0000001', 'vb001.pdf')]; // lowercase
    const pdfFiles = ['VB001.pdf']; // uppercase in Attachment
    const errors = validatePdfMapping(rows, pdfFiles);
    // vb001.pdf !== VB001.pdf → MISSING_PDF + EXTRA_PDF
    assert.ok(errors.find((e) => e.code === 'MISSING_PDF'));
    assert.ok(errors.find((e) => e.code === 'EXTRA_PDF'));
  });
});
