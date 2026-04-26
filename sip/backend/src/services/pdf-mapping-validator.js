/**
 * PDF ↔ Excel mapping validation.
 *
 * Rules:
 * - Field 21 (duongDanPdf) contains comma-separated PDF filenames.
 * - If field 21 is empty, fallback to {maLuuTru}.pdf
 * - Each expected PDF must exist in Attachment/ → ERROR if missing
 * - PDFs in Attachment/ not referenced by any Van_ban row → WARNING
 * - Duplicate PDF filenames in the same row → ERROR
 */

/**
 * @param {Object[]} vanBanRows  — parsed Van_ban rows
 * @param {string[]} pdfFiles    — basenames of files in Attachment/ (case-sensitive)
 * @returns {Array} errors array
 */
function validatePdfMapping(vanBanRows, pdfFiles) {
  const errors = [];
  const pdfSet = new Set(pdfFiles);
  const referencedPdfs = new Set();

  vanBanRows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const raw = row.duongDanPdf ? String(row.duongDanPdf).trim() : '';
    const maLuuTru = row.maLuuTru ? String(row.maLuuTru).trim() : '';

    let expectedFiles;

    if (raw === '') {
      // Fallback: check {maLuuTru}.pdf
      const fallback = maLuuTru ? `${maLuuTru}.pdf` : null;
      expectedFiles = fallback ? [fallback] : [];
    } else {
      // Split by comma, trim each entry
      expectedFiles = raw.split(',').map((f) => f.trim()).filter(Boolean);
    }

    // Check for duplicates within this row
    const seen = new Set();
    for (const f of expectedFiles) {
      if (seen.has(f)) {
        errors.push({
          sheet: 'Van_ban',
          row: rowNum,
          field: 'duongDanPdf',
          label: 'Đường dẫn tài liệu Quy trình xử lý (nếu có)',
          code: 'DUPLICATE_PDF_IN_ROW',
          message: `Tên file PDF "${f}" bị lặp lại trong cùng một dòng`,
          value: raw,
          severity: 'ERROR',
        });
      }
      seen.add(f);
    }

    // Check each expected file exists in Attachment/
    for (const f of expectedFiles) {
      referencedPdfs.add(f);
      if (!pdfSet.has(f)) {
        errors.push({
          sheet: 'Van_ban',
          row: rowNum,
          field: 'duongDanPdf',
          label: 'Đường dẫn tài liệu Quy trình xử lý (nếu có)',
          code: 'MISSING_PDF',
          message: `File PDF "${f}" không tồn tại trong thư mục Attachment/`,
          value: f,
          severity: 'ERROR',
        });
      }
    }
  });

  // Extra PDFs in Attachment/ not referenced by any row → WARNING
  for (const f of pdfFiles) {
    if (!referencedPdfs.has(f)) {
      errors.push({
        sheet: 'Attachment',
        row: null,
        field: null,
        label: null,
        code: 'EXTRA_PDF',
        message: `File PDF "${f}" trong Attachment/ không được tham chiếu bởi bất kỳ dòng Van_ban nào`,
        value: f,
        severity: 'WARNING',
      });
    }
  }

  return errors;
}

module.exports = { validatePdfMapping };
