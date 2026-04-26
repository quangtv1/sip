/**
 * Dossier workflow state machine.
 * Transitions: UPLOAD→VALIDATING→VALIDATED→APPROVED→PACKAGING→DONE
 *                                           ↘ REJECTED→UPLOAD (auto-revert)
 * MVP: SIGNED state skipped — PACKAGING transitions directly to DONE.
 */
const Dossier = require('../models/dossier-model');
const auditLogService = require('./audit-log-service');
const { DOSSIER_STATES, ROLES } = require('../utils/constants');
const { ValidationError, ForbiddenError } = require('../utils/app-error');

// Allowed state transitions
const TRANSITIONS = {
  [DOSSIER_STATES.UPLOAD]:      [DOSSIER_STATES.VALIDATING],
  [DOSSIER_STATES.VALIDATING]:  [DOSSIER_STATES.VALIDATED, DOSSIER_STATES.UPLOAD],
  [DOSSIER_STATES.VALIDATED]:   [DOSSIER_STATES.APPROVED, DOSSIER_STATES.REJECTED],
  [DOSSIER_STATES.REJECTED]:    [DOSSIER_STATES.UPLOAD],
  [DOSSIER_STATES.APPROVED]:    [DOSSIER_STATES.PACKAGING],
  // PACKAGING→APPROVED revert path used by sip-packaging-service on job failure
  [DOSSIER_STATES.PACKAGING]:   [DOSSIER_STATES.DONE, DOSSIER_STATES.APPROVED],
  [DOSSIER_STATES.DONE]:        [],
};

// Role requirements for actor-initiated transitions (system transitions have no role guard)
const ROLE_GUARDS = {
  [`${DOSSIER_STATES.VALIDATED}->${DOSSIER_STATES.APPROVED}`]:  [ROLES.APPROVER, ROLES.ADMIN],
  [`${DOSSIER_STATES.VALIDATED}->${DOSSIER_STATES.REJECTED}`]:  [ROLES.APPROVER, ROLES.ADMIN],
  [`${DOSSIER_STATES.APPROVED}->${DOSSIER_STATES.PACKAGING}`]:  [ROLES.OPERATOR, ROLES.ADMIN, ROLES.APPROVER],
};

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Atomically transition a dossier to a new state.
 * Uses findOneAndUpdate with state precondition to prevent race conditions.
 *
 * @param {string} dossierId - Dossier _id
 * @param {string} toState - Target state (DOSSIER_STATES value)
 * @param {object} actor - { email, role } — use null for system-initiated transitions
 * @param {object} [extra] - Extra fields to set (e.g. approvedBy, rejectionReason)
 * @returns {Dossier} Updated dossier document
 */
async function transition(dossierId, toState, actor, extra = {}) {
  const dossier = await Dossier.findById(dossierId);
  if (!dossier) throw new ValidationError('Không tìm thấy hồ sơ');

  const fromState = dossier.state;

  if (!canTransition(fromState, toState)) {
    throw new ValidationError(`Không thể chuyển trạng thái từ ${fromState} sang ${toState}`);
  }

  // Check role permission for actor-driven transitions
  const guardKey = `${fromState}->${toState}`;
  const allowedRoles = ROLE_GUARDS[guardKey];
  if (allowedRoles && actor && !allowedRoles.includes(actor.role)) {
    throw new ForbiddenError(`Role '${actor.role}' không có quyền thực hiện thao tác này`);
  }

  // Pre-condition: cannot approve if there are ERROR-level issues
  if (toState === DOSSIER_STATES.APPROVED) {
    const errorCount = dossier.validationResult?.errorCount ?? 0;
    if (errorCount > 0) {
      throw new ValidationError(`Không thể phê duyệt hồ sơ còn ${errorCount} lỗi nghiêm trọng`);
    }
  }

  // Atomic write with state precondition
  const updated = await Dossier.findOneAndUpdate(
    { _id: dossierId, state: fromState },
    { $set: { state: toState, ...extra } },
    { new: true }
  );

  if (!updated) {
    const current = await Dossier.findById(dossierId).lean();
    throw new ValidationError(
      `Trạng thái hồ sơ vừa thay đổi (hiện tại: ${current?.state}). Vui lòng tải lại trang.`
    );
  }

  await auditLogService.log({
    action: toState,
    userID: actor?.email || 'system',
    dossierID: String(dossierId),
    resultStatus: 'SUCCESS',
    details: extra.rejectionReason ? { note: extra.rejectionReason } : undefined,
  });

  return updated;
}

module.exports = { canTransition, transition };
