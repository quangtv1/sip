/**
 * Validate that an uploaded dossier has the required folder structure:
 *   Attachment/  — ≥1 PDF file
 *   Metadata/    — exactly 1 .xlsx file
 *
 * Input: fileList — array of relative paths as strings (e.g. "Attachment/VB001.pdf")
 * Output: { valid: bool, errors: [{ code, message, severity }], excelPath, pdfFiles }
 */

const path = require('path');

/**
 * Normalise path separators to forward slash for cross-platform comparison.
 */
function normalisePath(p) {
  return p.replace(/\\/g, '/');
}

function validateFolderStructure(fileList) {
  const errors = [];
  const normalised = fileList.map(normalisePath);

  // Collect files in each required folder
  const attachmentFiles = normalised.filter((f) =>
    f.toLowerCase().startsWith('attachment/')
  );
  const metadataFiles = normalised.filter((f) =>
    f.toLowerCase().startsWith('metadata/')
  );

  // Check Attachment/ exists and has at least one PDF
  if (attachmentFiles.length === 0) {
    errors.push({
      code: 'MISSING_ATTACHMENT_FOLDER',
      message: 'Thư mục Attachment/ không tồn tại hoặc rỗng',
      severity: 'ERROR',
    });
  }

  const pdfFiles = attachmentFiles.filter((f) =>
    f.toLowerCase().endsWith('.pdf')
  );

  if (attachmentFiles.length > 0 && pdfFiles.length === 0) {
    errors.push({
      code: 'NO_PDF_IN_ATTACHMENT',
      message: 'Thư mục Attachment/ không chứa file PDF nào',
      severity: 'ERROR',
    });
  }

  // Check Metadata/ exists
  if (metadataFiles.length === 0) {
    errors.push({
      code: 'MISSING_METADATA_FOLDER',
      message: 'Thư mục Metadata/ không tồn tại hoặc rỗng',
      severity: 'ERROR',
    });
  }

  // Check Metadata/ has exactly 1 xlsx
  const xlsxFiles = metadataFiles.filter((f) =>
    f.toLowerCase().endsWith('.xlsx')
  );

  if (metadataFiles.length > 0 && xlsxFiles.length === 0) {
    errors.push({
      code: 'NO_XLSX_IN_METADATA',
      message: 'Thư mục Metadata/ không chứa file Excel (.xlsx)',
      severity: 'ERROR',
    });
  }

  if (xlsxFiles.length > 1) {
    errors.push({
      code: 'MULTIPLE_XLSX_IN_METADATA',
      message: `Thư mục Metadata/ chứa ${xlsxFiles.length} file Excel, chỉ được phép 1`,
      severity: 'ERROR',
    });
  }

  const excelPath = xlsxFiles.length === 1 ? xlsxFiles[0] : null;

  // PDF basenames for mapping checks (just the filename without folder prefix)
  const pdfBasenames = pdfFiles.map((f) => path.basename(f));

  return {
    valid: errors.length === 0,
    errors,
    excelPath,
    pdfFiles: pdfBasenames,
  };
}

module.exports = { validateFolderStructure };
