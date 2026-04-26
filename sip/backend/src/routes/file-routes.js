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

module.exports = router;
