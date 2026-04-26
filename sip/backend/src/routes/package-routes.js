/**
 * SIP packaging routes:
 *   POST /api/package          — enqueue a packaging job, returns { jobId }
 *   GET  /api/package/:jobId/status — poll job state + progress
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES, DOSSIER_STATES } = require('../utils/constants');
const { ValidationError, NotFoundError } = require('../utils/app-error');
const { sipPackagingQueue } = require('../jobs/queue-setup');
const Dossier = require('../models/dossier-model');

const router = express.Router();
router.use(authMiddleware, requireRole(ROLES.OPERATOR, ROLES.ADMIN, ROLES.APPROVER));

/**
 * POST /api/package
 * Body: { dossierId, options? }
 * Validates dossier is APPROVED with zero errors, then enqueues a BullMQ job.
 */
router.post('/', async (req, res, next) => {
  try {
    const { dossierId, options = {} } = req.body;
    if (!dossierId) return next(new ValidationError('dossierId là bắt buộc'));

    const dossier = await Dossier.findById(dossierId);
    if (!dossier) return next(new NotFoundError('Không tìm thấy hồ sơ'));

    if (dossier.state !== DOSSIER_STATES.APPROVED) {
      return next(new ValidationError(`Hồ sơ phải ở trạng thái APPROVED để đóng gói (hiện tại: ${dossier.state})`));
    }

    const errorCount = dossier.validationResult?.errorCount ?? 0;
    if (errorCount > 0) {
      return next(new ValidationError(`Không thể đóng gói hồ sơ còn ${errorCount} lỗi`));
    }

    // Whitelist options to prevent arbitrary data reaching job processor
    const safeOptions = {
      submittingOrg: String(options.submittingOrg || '').slice(0, 200),
    };

    // Use deterministic jobId for atomic deduplication — BullMQ rejects duplicate jobIds
    const jobId = `pkg-${String(dossierId)}`;
    const existing = await sipPackagingQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (['waiting', 'active', 'delayed'].includes(state)) {
        return next(new ValidationError('Hồ sơ này đang trong hàng đợi đóng gói'));
      }
    }

    const job = await sipPackagingQueue.add(
      'package',
      { dossierId: String(dossierId), options: safeOptions },
      { jobId }
    );

    res.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/package/:jobId/status
 * Returns: { jobId, state, progress, result?, failedReason? }
 * States: waiting | active | completed | failed | delayed | unknown
 */
router.get('/:jobId/status', async (req, res, next) => {
  try {
    const job = await sipPackagingQueue.getJob(req.params.jobId);
    if (!job) return next(new NotFoundError('Không tìm thấy job'));

    const state = await job.getState();
    const progress = job.progress ?? 0;

    res.json({
      success: true,
      data: {
        jobId: job.id,
        state,
        progress,
        result: state === 'completed' ? job.returnvalue : undefined,
        failedReason: state === 'failed' ? job.failedReason : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
