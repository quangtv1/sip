/**
 * Audit log routes (Admin + Auditor):
 *   GET /api/logs           — paginated audit log with filters
 *   GET /api/logs/export    — CSV download of filtered logs
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');
const { ValidationError } = require('../utils/app-error');
const auditLogService = require('../services/audit-log-service');
const { AUDIT_ACTIONS } = require('../utils/constants');

const router = express.Router();
router.use(authMiddleware, requireRole([ROLES.ADMIN, ROLES.AUDITOR]));

/**
 * GET /api/logs
 * Query params: action, userID, dossierID, from (ISO date), to (ISO date), page, limit
 */
router.get('/', async (req, res, next) => {
  try {
    const { action, userID, dossierID, from, to, page, limit } = req.query;

    // Validate inputs
    if (action && !Object.values(AUDIT_ACTIONS).includes(action)) return next(new ValidationError('action không hợp lệ'));
    if (from && isNaN(new Date(from).getTime())) return next(new ValidationError('from phải là ngày hợp lệ (ISO 8601)'));
    if (to   && isNaN(new Date(to).getTime()))   return next(new ValidationError('to phải là ngày hợp lệ (ISO 8601)'));

    const result = await auditLogService.getLogs(
      { action, userID, dossierID, from, to },
      { page, limit }
    );
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pages: result.pages, limit: result.limit } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/logs/export
 * Same filters as GET /api/logs but streams a CSV file. Max 10,000 rows.
 */
router.get('/export', async (req, res, next) => {
  try {
    const { action, userID, dossierID, from, to } = req.query;
    if (action && !Object.values(AUDIT_ACTIONS).includes(action)) return next(new ValidationError('action không hợp lệ'));
    if (from && isNaN(new Date(from).getTime())) return next(new ValidationError('from phải là ngày hợp lệ'));
    if (to   && isNaN(new Date(to).getTime()))   return next(new ValidationError('to phải là ngày hợp lệ'));

    // Use exportLogs — bypasses the Math.min(100) pagination cap
    const rows = await auditLogService.exportLogs({ action, userID, dossierID, from, to });
    const header = 'timestamp,action,userID,dossierID,resultStatus,errorCount,warningCount\n';
    const csv = rows.map((r) =>
      [
        new Date(r.timestamp).toISOString(),
        r.action,
        r.userID,
        r.dossierID || '',
        r.resultStatus || '',
        r.errorCount ?? '',
        r.warningCount ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');

    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + header + csv); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
});

module.exports = router;
