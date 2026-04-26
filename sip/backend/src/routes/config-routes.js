/**
 * Storage configuration routes (Admin only):
 *   GET  /api/config/minio — return current MinIO config (secretKey masked)
 *   POST /api/config/minio — update config, test connection, hot-reload client
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');
const { ValidationError } = require('../utils/app-error');
const AppConfig = require('../models/app-config-model');
const minioStorageService = require('../services/minio-storage-service');
const Minio = require('minio');
const config = require('../config/index');

const router = express.Router();
router.use(authMiddleware, requireRole(ROLES.ADMIN));

/**
 * GET /api/config/minio
 * Returns current MinIO config from DB (or env defaults). secretKey is masked.
 */
router.get('/minio', async (req, res, next) => {
  try {
    const stored = await AppConfig.findOne({ key: 'minio' }).lean();
    const v = stored?.value || {};
    res.json({
      success: true,
      data: {
        endpoint:  v.endpoint  || config.MINIO_ENDPOINT,
        port:      v.port      || config.MINIO_PORT,
        useSSL:    v.useSSL    ?? config.MINIO_USE_SSL,
        accessKey: v.accessKey || config.MINIO_ACCESS_KEY,
        secretKey: '***',  // never return the real secret
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/config/minio
 * Body: { endpoint, port, useSSL, accessKey, secretKey }
 * Tests the connection before saving. Hot-reloads MinIO client on success.
 */
router.post('/minio', async (req, res, next) => {
  try {
    const { endpoint, port, useSSL, accessKey, secretKey } = req.body;
    if (!endpoint || !accessKey || !secretKey) {
      return next(new ValidationError('endpoint, accessKey, secretKey là bắt buộc'));
    }

    // Test connection before persisting
    const testClient = new Minio.Client({
      endPoint:  endpoint,
      port:      parseInt(port, 10) || 9000,
      useSSL:    !!useSSL,
      accessKey,
      secretKey,
    });

    try {
      await testClient.listBuckets();
    } catch (connErr) {
      return next(new ValidationError(`Không thể kết nối MinIO: ${connErr.message}`));
    }

    // Persist to DB
    await AppConfig.findOneAndUpdate(
      { key: 'minio' },
      { $set: { value: { endpoint, port: parseInt(port, 10) || 9000, useSSL: !!useSSL, accessKey, secretKey } } },
      { upsert: true }
    );

    // Hot-reload the global MinIO client
    await minioStorageService.reloadConfig();
    await minioStorageService.ensureBuckets();

    res.json({ success: true, data: { message: 'Cấu hình MinIO đã được cập nhật và kết nối thành công' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
