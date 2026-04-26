/**
 * Dashboard routes (Admin + Auditor):
 *   GET /api/stats          — KPIs + error trend + top error fields + state distribution
 *   GET /api/stats/sip/:path/tree    — SIP ZIP file tree
 *   GET /api/stats/sip/:path/file/*  — single file content from SIP ZIP
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');
const { ValidationError } = require('../utils/app-error');
const path = require('path');
const statsService = require('../services/stats-service');
const sipViewerService = require('../services/sip-viewer-service');

/** Reject paths containing traversal sequences. Returns true if safe. */
function isSafeObjectPath(p) {
  if (!p || typeof p !== 'string') return false;
  const normalized = path.normalize(p).replace(/\\/g, '/');
  return !normalized.includes('..') && !path.isAbsolute(normalized);
}

const router = express.Router();
router.use(authMiddleware, requireRole([ROLES.ADMIN, ROLES.AUDITOR, ROLES.OPERATOR, ROLES.APPROVER, ROLES.SIGNER]));

/**
 * GET /api/stats
 * Returns KPIs, error trend (last 12 months), top 10 error fields, state distribution.
 */
router.get('/', async (req, res, next) => {
  try {
    const [kpis, errorTrend, topErrorFields, stateDistribution] = await Promise.all([
      statsService.getKpis(),
      statsService.getErrorTrend(12),
      statsService.getTopErrorFields(10),
      statsService.getStateDistribution(),
    ]);
    res.json({ success: true, data: { kpis, errorTrend, topErrorFields, stateDistribution } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/sip/tree?path=<minioObjectPath>
 * Returns the file tree of a SIP ZIP (Admin + Auditor only).
 */
router.get('/sip/tree', requireRole([ROLES.ADMIN, ROLES.AUDITOR]), async (req, res, next) => {
  try {
    const { path: objectPath } = req.query;
    if (!objectPath) return next(new ValidationError('path là bắt buộc'));
    if (!isSafeObjectPath(objectPath)) return next(new ValidationError('Đường dẫn không hợp lệ'));
    const tree = await sipViewerService.getFileTree(objectPath);
    res.json({ success: true, data: tree });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stats/sip/file?path=<minioObjectPath>&file=<entryPath>
 * Returns content of a specific text file inside a SIP ZIP.
 */
router.get('/sip/file', requireRole([ROLES.ADMIN, ROLES.AUDITOR]), async (req, res, next) => {
  try {
    const { path: objectPath, file: filePath } = req.query;
    if (!objectPath) return next(new ValidationError('path là bắt buộc'));
    if (!filePath) return next(new ValidationError('file là bắt buộc'));
    if (!isSafeObjectPath(objectPath)) return next(new ValidationError('Đường dẫn không hợp lệ'));
    if (filePath.includes('..') || filePath.startsWith('/')) return next(new ValidationError('Đường dẫn file không hợp lệ'));
    const content = await sipViewerService.getFileContent(objectPath, filePath);
    res.json({ success: true, data: { content } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
