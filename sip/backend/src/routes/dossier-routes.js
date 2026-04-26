/**
 * Dossier management routes:
 *   GET  /api/dossiers          — paginated list with filters
 *   GET  /api/dossiers/:id      — full dossier detail
 *   POST /api/dossiers/:id/approve  — (delegated to approve-routes)
 *   POST /api/dossiers/:id/reject   — (delegated to approve-routes)
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');
const { NotFoundError, ValidationError } = require('../utils/app-error');
const Dossier = require('../models/dossier-model');
const approveRoutes = require('./approve-routes');

const router = express.Router();
router.use(authMiddleware);

// Mount approve/reject sub-routes at /:id
router.use('/:id', approveRoutes);

/**
 * GET /api/dossiers
 * Query params: state, uploadedBy, search (maHoSo prefix), from, to, page, limit
 * Accessible to all authenticated roles (filtered by ownership for Operator).
 */
router.get('/', requireRole(ROLES.OPERATOR, ROLES.APPROVER, ROLES.ADMIN, ROLES.AUDITOR, ROLES.SIGNER), async (req, res, next) => {
  try {
    const { state, uploadedBy, search, from, to, page = 1, limit = 20 } = req.query;

    const query = {};

    // Operator can only see dossiers they uploaded
    if (req.user.role === ROLES.OPERATOR) {
      query.uploadedBy = req.user.email;
    } else if (uploadedBy) {
      query.uploadedBy = uploadedBy;
    }

    if (state) query.state = state;
    if (search) {
      // Escape regex metacharacters to prevent ReDoS
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.maHoSo = { $regex: `^${escapedSearch}`, $options: 'i' };
    }
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) return next(new ValidationError('Tham số "from" không hợp lệ'));
        query.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) return next(new ValidationError('Tham số "to" không hợp lệ'));
        query.createdAt.$lte = toDate;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Dossier.find(query)
        .select('maHoSo state uploadedBy createdAt updatedAt validationResult.errorCount validationResult.warningCount validationResult.valid approvedBy rejectedBy rejectionReason')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Dossier.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map((d) => ({
          dossierId: d._id,
          maHoSo: d.maHoSo,
          state: d.state,
          uploadedBy: d.uploadedBy,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          errorCount: d.validationResult?.errorCount ?? 0,
          warningCount: d.validationResult?.warningCount ?? 0,
          validationValid: d.validationResult?.valid ?? false,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dossiers/:id
 * Returns full dossier detail including hoSoRow, vanBanRows, validation result.
 */
router.get('/:id', requireRole(ROLES.OPERATOR, ROLES.APPROVER, ROLES.ADMIN, ROLES.AUDITOR, ROLES.SIGNER), async (req, res, next) => {
  try {
    const dossier = await Dossier.findById(req.params.id).lean();
    if (!dossier) return next(new NotFoundError('Không tìm thấy hồ sơ'));

    // Operator can only access their own dossiers
    if (req.user.role === ROLES.OPERATOR && dossier.uploadedBy !== req.user.email) {
      return next(new NotFoundError('Không tìm thấy hồ sơ'));
    }

    res.json({
      success: true,
      data: {
        dossierId: dossier._id,
        maHoSo: dossier.maHoSo,
        state: dossier.state,
        uploadedBy: dossier.uploadedBy,
        hoSoRow: dossier.hoSoRow,
        vanBanRows: dossier.vanBanRows,
        pdfFiles: dossier.pdfFiles,
        validation: {
          valid: dossier.validationResult?.valid ?? false,
          errorCount: dossier.validationResult?.errorCount ?? 0,
          warningCount: dossier.validationResult?.warningCount ?? 0,
          errors: dossier.validationResult?.errors ?? [],
          suggestions: dossier.validationResult?.suggestions ?? [],
        },
        approvedBy: dossier.approvedBy,
        approvedAt: dossier.approvedAt,
        rejectedBy: dossier.rejectedBy,
        rejectedAt: dossier.rejectedAt,
        rejectionReason: dossier.rejectionReason,
        createdAt: dossier.createdAt,
        updatedAt: dossier.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
