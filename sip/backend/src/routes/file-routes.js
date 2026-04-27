/**
 * File storage routes (MinIO-backed):
 *   GET /api/files?bucket=&prefix=       — list objects
 *   GET /api/files/preview?bucket=&path= — return presigned URL
 *   GET /api/files/download?bucket=&path=— stream file download
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');
const { ValidationError } = require('../utils/app-error');
const minioStorageService = require('../services/minio-storage-service');
const Dossier = require('../models/dossier-model');
const config = require('../config/index');
const path = require('path');

const router = express.Router();

// All file routes require authentication; Auditors + above can browse
router.use(authMiddleware, requireRole(
  ROLES.ADMIN, ROLES.OPERATOR, ROLES.APPROVER, ROLES.SIGNER, ROLES.AUDITOR
));

const ALLOWED_BUCKETS = new Set([config.MINIO_BUCKET_PDF, config.MINIO_BUCKET_SIP]);

function validateBucket(bucket, next) {
  if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
    next(new ValidationError(`bucket phải là một trong: ${[...ALLOWED_BUCKETS].join(', ')}`));
    return false;
  }
  return true;
}

/**
 * GET /api/files?bucket=pdf-files&prefix=2026/04/
 * List objects in a bucket under a prefix.
 */
router.get('/', async (req, res, next) => {
  try {
    const { bucket, prefix = '' } = req.query;
    if (!validateBucket(bucket, next)) return;

    const files = await minioStorageService.listFiles(bucket, prefix);
    res.json({ success: true, data: files });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/preview?bucket=&path=
 * Generate a presigned URL for viewing a file.
 */
router.get('/preview', async (req, res, next) => {
  try {
    const { bucket, path: objectPath } = req.query;
    if (!validateBucket(bucket, next)) return;
    if (!objectPath) return next(new ValidationError('path là bắt buộc'));

    const url = await minioStorageService.getPresignedUrl(bucket, objectPath, 3600);
    res.json({ success: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/download?bucket=&path=
 * Stream a file download from MinIO.
 */
router.get('/download', async (req, res, next) => {
  try {
    const { bucket, path: objectPath } = req.query;
    if (!validateBucket(bucket, next)) return;
    if (!objectPath) return next(new ValidationError('path là bắt buộc'));

    const filename = path.basename(objectPath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const stream = await minioStorageService.downloadStream(bucket, objectPath);
    stream.pipe(res);
    stream.on('error', (err) => next(err));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/sip-archive
 * List SIP archive files (sip-files bucket) enriched with dossier metadata.
 * Accessible to Admin, Auditor, Approver, Signer.
 */
router.get('/sip-archive', requireRole(ROLES.ADMIN, ROLES.AUDITOR, ROLES.APPROVER, ROLES.SIGNER), async (req, res, next) => {
  try {
    const [files, dossiers] = await Promise.all([
      minioStorageService.listFiles(config.MINIO_BUCKET_SIP, ''),
      Dossier.find({ sipZipPath: { $nin: [null, ''] } })
        .select('sipZipPath hoSoRow.tieuDeHoSo vanBanRows')
        .lean(),
    ]);

    const dossierMap = Object.fromEntries(dossiers.map((d) => [d.sipZipPath, d]));

    const items = files.map((file) => {
      const d = dossierMap[file.name];
      return {
        name: file.name,
        filename: file.name.split('/').pop() || file.name,
        size: file.size,
        lastModified: file.lastModified,
        tieuDeHoSo: d?.hoSoRow?.tieuDeHoSo ?? '',
        vanBanCount: (d?.vanBanRows || []).length,
      };
    });

    items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/files/sip-archive?path=
 * Remove a SIP file from MinIO. Admin only.
 */
router.delete('/sip-archive', requireRole(ROLES.ADMIN), async (req, res, next) => {
  try {
    const { path: objectPath } = req.query;
    if (!objectPath) return next(new ValidationError('path là bắt buộc'));
    await minioStorageService.deleteFile(config.MINIO_BUCKET_SIP, objectPath);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
