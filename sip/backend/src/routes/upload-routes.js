/**
 * POST /api/upload
 * Accepts a dossier as either:
 *   - A single ZIP file (field: "dossierZip")
 *   - Multiple files with relative paths (field: "files[]" + body.paths[] array)
 *
 * Runs folder structure validation + Excel parsing, creates a Dossier document,
 * and returns the initial validation result.
 */

const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const os = require('os');

const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES, AUDIT_ACTIONS, DOSSIER_STATES } = require('../utils/constants');
const { ValidationError } = require('../utils/app-error');
const auditLogService = require('../services/audit-log-service');
const { runValidation } = require('../services/validation-orchestrator');
const Dossier = require('../models/dossier-model');
const logger = require('../utils/logger');

const router = express.Router();

// 50 MB compressed upload limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 500 MB max uncompressed size — prevents ZIP bomb
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;

router.use(authMiddleware, requireRole([ROLES.OPERATOR, ROLES.ADMIN]));

/**
 * Extract a ZIP buffer into a temp directory.
 * Guards against path traversal and decompression bombs.
 * Returns { tempDir, fileList: string[] } where fileList contains relative paths.
 */
function extractZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Guard: decompression bomb check
  const totalUncompressed = entries.reduce((sum, e) => sum + (e.header.size || 0), 0);
  if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
    throw new ValidationError(`Kích thước giải nén vượt quá giới hạn ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sip-'));

  for (const entry of entries) {
    // Guard: path traversal — reject absolute paths and directory-escaping sequences
    const normalised = path.normalize(entry.entryName).replace(/\\/g, '/');
    if (path.isAbsolute(normalised) || normalised.startsWith('..')) {
      logger.warn('ZIP path traversal attempt blocked', { entry: entry.entryName });
      continue;
    }

    const dest = path.join(tempDir, normalised);
    // Double-check resolved path stays inside tempDir
    if (!dest.startsWith(tempDir + path.sep) && dest !== tempDir) {
      logger.warn('ZIP entry resolved outside tempDir, skipping', { entry: entry.entryName });
      continue;
    }

    if (entry.isDirectory) {
      fs.mkdirSync(dest, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, entry.getData());
    }
  }

  const fileList = walkDir(tempDir, '');
  return { tempDir, fileList };
}

/** Recursively list all files under dir, returning relative paths. */
function walkDir(dir, base) {
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const rel = (base ? `${base}/${entry}` : entry);
    if (fs.statSync(full).isDirectory()) {
      results.push(...walkDir(full, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

/**
 * Save multi-file upload into a temp directory, preserving relative paths.
 * Sanitises each path against traversal.
 */
function saveFilesToTemp(files, paths) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sip-'));
  const fileList = [];

  files.forEach((file, i) => {
    const raw = (paths[i] || file.originalname).replace(/\\/g, '/');
    const normalised = path.normalize(raw).replace(/\\/g, '/');

    // Reject traversal
    if (path.isAbsolute(normalised) || normalised.startsWith('..')) {
      logger.warn('Folder upload path traversal attempt blocked', { path: raw });
      return;
    }

    const dest = path.join(tempDir, normalised);
    if (!dest.startsWith(tempDir + path.sep)) return;

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, file.buffer);
    fileList.push(normalised);
  });

  return { tempDir, fileList };
}

/** Delete a temp directory, swallowing errors (best-effort cleanup). */
function cleanupTemp(dir) {
  try {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    logger.warn('Failed to clean up temp dir', { dir, error: e.message });
  }
}

// POST /api/upload/zip — ZIP upload
router.post('/zip', upload.single('dossierZip'), async (req, res, next) => {
  if (!req.file) {
    return next(new ValidationError('Vui lòng cung cấp file ZIP (field: dossierZip)'));
  }

  let tempDir = null;
  try {
    const extracted = extractZip(req.file.buffer);
    tempDir = extracted.tempDir;
    await processUpload(req, res, tempDir, extracted.fileList);
  } catch (err) {
    // Cleanup temp on error — dossier not yet saved with this path
    cleanupTemp(tempDir);
    next(err);
  }
});

// POST /api/upload/folder — multi-file folder upload
router.post('/folder', upload.array('files'), async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ValidationError('Vui lòng cung cấp ít nhất một file (field: files[])'));
  }

  let tempDir = null;
  try {
    const paths = Array.isArray(req.body.paths) ? req.body.paths : [req.body.paths].filter(Boolean);
    const saved = saveFilesToTemp(req.files, paths);
    tempDir = saved.tempDir;
    await processUpload(req, res, tempDir, saved.fileList);
  } catch (err) {
    cleanupTemp(tempDir);
    next(err);
  }
});

async function processUpload(req, res, tempDir, fileList) {
  const normFileList = normaliseFileList(fileList);

  const excelRel = normFileList.find(
    (f) => f.toLowerCase().startsWith('metadata/') && f.toLowerCase().endsWith('.xlsx')
  );
  const excelBuffer = excelRel ? fs.readFileSync(path.join(tempDir, excelRel)) : null;

  const validationResult = await runValidation({ fileList: normFileList, excelBuffer });
  const maHoSo = validationResult.hoSoRow ? validationResult.hoSoRow.maHoSo || null : null;

  const dossier = await Dossier.create({
    maHoSo,
    state: DOSSIER_STATES.VALIDATED,
    uploadedBy: req.user.email,
    hoSoRow: validationResult.hoSoRow,
    vanBanRows: validationResult.vanBanRows,
    pdfFiles: normFileList
      .filter((f) => f.toLowerCase().startsWith('attachment/') && f.toLowerCase().endsWith('.pdf'))
      .map((f) => path.basename(f)),
    validationResult: {
      valid: validationResult.valid,
      errorCount: validationResult.errorCount,
      warningCount: validationResult.warningCount,
      errors: validationResult.errors,
      suggestions: validationResult.suggestions,
      validatedAt: new Date(),
    },
    tempPath: tempDir,
    currentVersion: 1,
  });

  await auditLogService.log({
    action: AUDIT_ACTIONS.UPLOAD,
    userID: req.user.email,
    dossierID: String(dossier._id),
    resultStatus: validationResult.valid ? 'SUCCESS' : 'WARNING',
    errorCount: validationResult.errorCount,
    warningCount: validationResult.warningCount,
  });

  logger.info('Dossier uploaded', { id: dossier._id, maHoSo, errorCount: validationResult.errorCount });

  res.status(201).json({
    success: true,
    data: {
      dossierId: dossier._id,
      maHoSo,
      state: dossier.state,
      hoSoRow: validationResult.hoSoRow,
      vanBanRows: validationResult.vanBanRows,
      validation: {
        valid: validationResult.valid,
        errorCount: validationResult.errorCount,
        warningCount: validationResult.warningCount,
        errors: validationResult.errors,
        suggestions: validationResult.suggestions,
      },
    },
  });
}

/**
 * Strip a common root folder prefix so all paths start with Attachment/ or Metadata/.
 * Handles one level of wrapping (e.g. "H49.61.8/Attachment/VB001.pdf").
 */
function normaliseFileList(fileList) {
  const TOP_FOLDERS = new Set(['attachment', 'metadata']);

  const hasWrappingRoot = fileList.some((f) => {
    const first = f.split('/')[0];
    return f.includes('/') && !TOP_FOLDERS.has(first.toLowerCase());
  });

  if (!hasWrappingRoot) return fileList;

  return fileList
    .map((f) => {
      const idx = f.indexOf('/');
      return idx !== -1 ? f.slice(idx + 1) : f;
    })
    .filter(Boolean);
}

module.exports = router;
