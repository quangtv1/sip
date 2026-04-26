/**
 * Approval workflow routes:
 *   POST /api/dossiers/:id/approve  — approve a validated dossier
 *   POST /api/dossiers/:id/reject   — reject with mandatory note (≥10 chars)
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES, DOSSIER_STATES } = require('../utils/constants');
const { ValidationError, NotFoundError } = require('../utils/app-error');
const { transition } = require('../services/workflow-engine');
const notificationService = require('../services/notification-service');
const Dossier = require('../models/dossier-model');

const router = express.Router({ mergeParams: true });

// RBAC is applied per-route (not globally) to avoid intercepting sibling GET routes
// that are handled by dossier-routes.js at the same /:id prefix.
const approveGuard = [authMiddleware, requireRole(ROLES.APPROVER, ROLES.ADMIN)];

/**
 * POST /api/dossiers/:id/approve
 * Approve a VALIDATED dossier with no ERROR-level issues.
 */
router.post('/approve', ...approveGuard, async (req, res, next) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) return next(new NotFoundError('Không tìm thấy hồ sơ'));

    if (dossier.state !== DOSSIER_STATES.VALIDATED) {
      return next(new ValidationError(`Chỉ có thể phê duyệt hồ sơ ở trạng thái VALIDATED (hiện tại: ${dossier.state})`));
    }

    const updated = await transition(
      req.params.id,
      DOSSIER_STATES.APPROVED,
      req.user,
      { approvedBy: req.user.email, approvedAt: new Date() }
    );

    await notificationService.notify(dossier.uploadedBy, 'DOSSIER_APPROVED', {
      dossierId: String(dossier._id),
      maHoSo: dossier.maHoSo,
      approvedBy: req.user.email,
    });

    res.json({ success: true, data: { dossierId: updated._id, state: updated.state } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dossiers/:id/reject
 * Body: { reason: string } — reason must be ≥10 characters.
 */
router.post('/reject', ...approveGuard, async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || String(reason).trim().length < 10) {
      return next(new ValidationError('Lý do từ chối phải có ít nhất 10 ký tự'));
    }

    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) return next(new NotFoundError('Không tìm thấy hồ sơ'));

    if (dossier.state !== DOSSIER_STATES.VALIDATED) {
      return next(new ValidationError(`Chỉ có thể từ chối hồ sơ ở trạng thái VALIDATED (hiện tại: ${dossier.state})`));
    }

    // VALIDATED → REJECTED → auto-revert to UPLOAD
    await transition(req.params.id, DOSSIER_STATES.REJECTED, req.user, {
      rejectedBy: req.user.email,
      rejectedAt: new Date(),
      rejectionReason: String(reason).trim(),
    });

    const reverted = await transition(req.params.id, DOSSIER_STATES.UPLOAD, null, {});

    await notificationService.notify(dossier.uploadedBy, 'DOSSIER_REJECTED', {
      dossierId: String(dossier._id),
      maHoSo: dossier.maHoSo,
      rejectedBy: req.user.email,
      reason: String(reason).trim(),
    });

    res.json({ success: true, data: { dossierId: reverted._id, state: reverted.state } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
