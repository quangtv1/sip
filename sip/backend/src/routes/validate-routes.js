/**
 * Validation routes:
 *   POST /api/validate/:id          — full re-validation of a dossier
 *   POST /api/validate/inline       — validate a single field value (real-time editing)
 */

const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES, AUDIT_ACTIONS, DOSSIER_STATES } = require('../utils/constants');
const { ValidationError, NotFoundError } = require('../utils/app-error');
const auditLogService = require('../services/audit-log-service');
const { reValidate, validateInline } = require('../services/validation-orchestrator');
const Dossier = require('../models/dossier-model');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware, requireRole([ROLES.OPERATOR, ROLES.ADMIN]));

/**
 * POST /api/validate/inline
 * Validate a single field without a saved dossier context.
 * Body: { sheet, field, value, rowContext, rowNum }
 */
router.post('/inline', (req, res, next) => {
  try {
    const { sheet, field, value, rowContext, rowNum } = req.body;

    if (!sheet || !field || value === undefined) {
      return next(new ValidationError('sheet, field và value là bắt buộc'));
    }

    if (!['Ho_so', 'Van_ban'].includes(sheet)) {
      return next(new ValidationError('sheet phải là "Ho_so" hoặc "Van_ban"'));
    }

    const result = validateInline({ sheet, field, value: String(value), rowContext: rowContext || {}, rowNum: rowNum || 1 });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/validate/:id
 * Re-run full validation on the current working data of a dossier.
 */
router.post('/:id', async (req, res, next) => {
  try {
    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) return next(new NotFoundError('Không tìm thấy hồ sơ'));

    // Block if dossier is already packaged or done
    const frozenStates = [DOSSIER_STATES.PACKAGING, DOSSIER_STATES.PACKAGED, DOSSIER_STATES.DONE];
    if (frozenStates.includes(dossier.state)) {
      return next(new ValidationError(`Không thể validate lại hồ sơ ở trạng thái ${dossier.state}`));
    }

    const result = await reValidate({
      hoSoRow: dossier.hoSoRow,
      vanBanRows: dossier.vanBanRows,
      pdfFiles: dossier.pdfFiles,
    });

    dossier.validationResult = {
      valid: result.valid,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
      errors: result.errors,
      suggestions: result.suggestions,
      validatedAt: new Date(),
    };

    // Update state to VALIDATED if it was still UPLOAD
    if (dossier.state === DOSSIER_STATES.UPLOAD) {
      dossier.state = DOSSIER_STATES.VALIDATED;
    }

    await dossier.save();

    await auditLogService.log({
      action: AUDIT_ACTIONS.VALIDATE,
      userID: req.user.email,
      dossierID: String(dossier._id),
      resultStatus: result.valid ? 'SUCCESS' : 'WARNING',
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    });

    logger.info('Dossier re-validated', {
      id: dossier._id,
      valid: result.valid,
      errorCount: result.errorCount,
    });

    res.json({
      success: true,
      data: {
        dossierId: dossier._id,
        state: dossier.state,
        validation: {
          valid: result.valid,
          errorCount: result.errorCount,
          warningCount: result.warningCount,
          errors: result.errors,
          suggestions: result.suggestions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
