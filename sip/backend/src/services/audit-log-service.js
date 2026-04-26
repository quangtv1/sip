const AuditLog = require('../models/audit-log-model');
const logger = require('../utils/logger');

/**
 * Append a single audit log entry.
 * Fire-and-forget safe — logs error but does not throw so audit failures
 * never interrupt the main request flow.
 */
async function log({ action, userID, dossierID, fileName, resultStatus, errorCount, warningCount, details }) {
  try {
    await AuditLog.create({
      action,
      userID,
      dossierID,
      fileName,
      resultStatus,
      errorCount,
      warningCount,
      details,
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, userID, error: err.message });
  }
}

/**
 * Query audit logs with optional filters and pagination.
 * filter: { action, userID, dossierID, from, to }
 * options: { page, limit }
 */
async function getLogs(filter = {}, options = {}) {
  const { action, userID, dossierID, from, to } = filter;
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, parseInt(options.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const query = {};
  if (action) query.action = action;
  if (userID) query.userID = userID;
  if (dossierID) query.dossierID = dossierID;
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Export up to 10,000 audit log rows as an array.
 * Bypasses the Math.min(100) pagination cap used by getLogs.
 * filter: { action, userID, dossierID, from, to }
 */
async function exportLogs(filter = {}) {
  const { action, userID, dossierID, from, to } = filter;
  const query = {};
  if (action) query.action = action;
  if (userID) query.userID = userID;
  if (dossierID) query.dossierID = dossierID;
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }
  return AuditLog.find(query).sort({ timestamp: -1 }).limit(10_000).lean();
}

module.exports = { log, getLogs, exportLogs };
