/**
 * POST /api/save/:id
 * Apply user-accepted edits to a dossier's Excel data, persist a new version,
 * re-validate, and return the updated validation result.
 *
 * Body: { hoSoRow, vanBanRows }
 */

const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES, DOSSIER_STATES } = require('../utils/constants');
const { ValidationError, NotFoundError } = require('../utils/app-error');
const auditLogService = require('../services/audit-log-service');
const { AUDIT_ACTIONS } = require('../utils/constants');
const { reValidate } = require('../services/validation-orchestrator');
const Dossier = require('../models/dossier-model');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authMiddleware, requireRole([ROLES.OPERATOR, ROLES.ADMIN]));

// Maximum number of versions to keep per dossier (prevents MongoDB 16MB doc limit)
const MAX_VERSIONS = 20;

// Allowed field names for Ho_so and Van_ban — strip unknown keys to prevent injection
const { HO_SO_SCHEMA } = require('../validators/ho-so-schema');
const { VAN_BAN_SCHEMA } = require('../validators/van-ban-schema');
const ALLOWED_HO_SO_FIELDS = new Set(HO_SO_SCHEMA.map((f) => f.name));
const ALLOWED_VAN_BAN_FIELDS = new Set(VAN_BAN_SCHEMA.map((f) => f.name));

function sanitiseHoSoRow(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([k]) => ALLOWED_HO_SO_FIELDS.has(k)));
}

function sanitiseVanBanRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    if (!row || typeof row !== 'object') return {};
    return Object.fromEntries(Object.entries(row).filter(([k]) => ALLOWED_VAN_BAN_FIELDS.has(k)));
  });
}

/**
 * POST /api/save/:id
 */
router.post('/:id', async (req, res, next) => {
  try {
    const rawHoSo = req.body.hoSoRow;
    const rawVanBan = req.body.vanBanRows;

    if (!rawHoSo || !Array.isArray(rawVanBan)) {
      return next(new ValidationError('hoSoRow và vanBanRows (array) là bắt buộc'));
    }

    // Sanitise: only keep known field names
    const hoSoRow = sanitiseHoSoRow(rawHoSo);
    const vanBanRows = sanitiseVanBanRows(rawVanBan);

    const dossier = await Dossier.findById(req.params.id);
    if (!dossier) return next(new NotFoundError('Không tìm thấy hồ sơ'));

    const editableStates = [
      DOSSIER_STATES.UPLOAD,
      DOSSIER_STATES.VALIDATING,
      DOSSIER_STATES.VALIDATED,
    ];
    if (!editableStates.includes(dossier.state)) {
      return next(new ValidationError(`Không thể chỉnh sửa hồ sơ ở trạng thái ${dossier.state}`));
    }

    // Snapshot current version before overwriting
    const snapshot = {
      versionNumber: dossier.currentVersion,
      savedAt: new Date(),
      savedBy: req.user.email,
      hoSoRow: dossier.hoSoRow,
      vanBanRows: dossier.vanBanRows,
      errorCount: dossier.validationResult ? dossier.validationResult.errorCount : null,
      warningCount: dossier.validationResult ? dossier.validationResult.warningCount : null,
    };
    dossier.versions.push(snapshot);

    // Cap version history to prevent document size overflow
    if (dossier.versions.length > MAX_VERSIONS) {
      dossier.versions = dossier.versions.slice(-MAX_VERSIONS);
    }

    // Apply new data
    dossier.hoSoRow = hoSoRow;
    dossier.vanBanRows = vanBanRows;
    dossier.currentVersion += 1;

    // Update maHoSo if changed
    if (hoSoRow.maHoSo) {
      dossier.maHoSo = hoSoRow.maHoSo;
    }

    // Re-validate with new data
    const result = await reValidate({
      hoSoRow,
      vanBanRows,
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

    // Ensure state is at least VALIDATED
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
      details: { savedVersion: dossier.currentVersion },
    });

    logger.info('Dossier saved', {
      id: dossier._id,
      version: dossier.currentVersion,
      valid: result.valid,
    });

    res.json({
      success: true,
      data: {
        dossierId: dossier._id,
        state: dossier.state,
        currentVersion: dossier.currentVersion,
        hoSoRow: dossier.hoSoRow,
        vanBanRows: dossier.vanBanRows,
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
