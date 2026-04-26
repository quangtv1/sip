const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../utils/constants');

// Append-only collection — never update or delete after insert
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: Object.values(AUDIT_ACTIONS),
  },
  userID: {
    type: String,
    required: true,
  },
  dossierID: {
    type: String,
  },
  fileName: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  resultStatus: {
    type: String,
    enum: ['SUCCESS', 'ERROR', 'WARNING'],
  },
  errorCount: {
    type: Number,
    default: 0,
  },
  warningCount: {
    type: Number,
    default: 0,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
});

// Compound indexes for common query patterns
auditLogSchema.index({ dossierID: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ userID: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema, 'audit-logs');

module.exports = AuditLog;
