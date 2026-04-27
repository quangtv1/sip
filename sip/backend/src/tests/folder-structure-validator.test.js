/**
 * Unit tests for folder-structure-validator.js
 * Run: node --test src/tests/folder-structure-validator.test.js
 */

const assert = require('node:assert/strict');
const { test, describe } = require('node:test');
const { validateFolderStructure } = require('../services/folder-structure-validator');

const VALID_FILES = [
  'Attachment/VB001.pdf',
  'Attachment/VB002.pdf',
  'Metadata/H49.61.8.2017.01.xlsx',
];

describe('validateFolderStructure', () => {
  test('valid structure passes with no errors', () => {
    const result = validateFolderStructure(VALID_FILES);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.excelPath, 'Metadata/H49.61.8.2017.01.xlsx');
    assert.deepEqual(result.pdfFiles, ['VB001.pdf', 'VB002.pdf']);
  });

  test('missing Attachment/ folder produces error', () => {
    const files = ['Metadata/test.xlsx'];
    const result = validateFolderStructure(files);
    assert.equal(result.valid, false);
    assert.ok(result.errors.find((e) => e.code === 'MISSING_ATTACHMENT_FOLDER'));
  });

  test('Attachment/ with no PDFs produces NO_PDF_IN_ATTACHMENT', () => {
    const files = ['Attachment/readme.txt', 'Metadata/test.xlsx'];
    const result = validateFolderStructure(files);
    assert.ok(result.errors.find((e) => e.code === 'NO_PDF_IN_ATTACHMENT'));
  });

  test('missing Metadata/ folder produces error', () => {
    const files = ['Attachment/VB001.pdf'];
    const result = validateFolderStructure(files);
    assert.ok(result.errors.find((e) => e.code === 'MISSING_METADATA_FOLDER'));
  });

  test('Metadata/ with no xlsx produces NO_XLSX_IN_METADATA', () => {
    const files = ['Attachment/VB001.pdf', 'Metadata/readme.txt'];
    const result = validateFolderStructure(files);
    assert.ok(result.errors.find((e) => e.code === 'NO_XLSX_IN_METADATA'));
  });

  test('multiple xlsx files in Metadata/ produces MULTIPLE_XLSX_IN_METADATA', () => {
    const files = ['Attachment/VB001.pdf', 'Metadata/a.xlsx', 'Metadata/b.xlsx'];
    const result = validateFolderStructure(files);
    assert.ok(result.errors.find((e) => e.code === 'MULTIPLE_XLSX_IN_METADATA'));
    assert.equal(result.excelPath, null);
  });

  test('case-insensitive folder name matching', () => {
    const files = ['attachment/VB001.pdf', 'metadata/test.xlsx'];
    const result = validateFolderStructure(files);
    assert.equal(result.valid, true);
  });

  test('Windows backslash paths are normalised', () => {
    const files = ['Attachment\\VB001.pdf', 'Metadata\\test.xlsx'];
    const result = validateFolderStructure(files);
    assert.equal(result.valid, true);
  });

  test('root prefix is stripped by normaliseFileList in upload route (not here)', () => {
    // folder-structure-validator receives already-normalised paths
    const files = ['Attachment/VB001.pdf', 'Metadata/test.xlsx'];
    const result = validateFolderStructure(files);
    assert.equal(result.valid, true);
  });

  test('all errors reported when both folders missing', () => {
    const result = validateFolderStructure([]);
    assert.ok(result.errors.find((e) => e.code === 'MISSING_ATTACHMENT_FOLDER'));
    assert.ok(result.errors.find((e) => e.code === 'MISSING_METADATA_FOLDER'));
    assert.equal(result.valid, false);
  });
});
