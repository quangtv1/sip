/**
 * Dossier — the central document tracking an uploaded dossier through the SIP pipeline.
 * State machine: UPLOAD → VALIDATING → VALIDATED → APPROVED → PACKAGING → PACKAGED → DONE
 *                                                           ↘ REJECTED
 */

const mongoose = require('mongoose');
const { DOSSIER_STATES } = require('../utils/constants');

// Embedded sub-schema for each validation error / suggestion
const validationItemSchema = new mongoose.Schema(
  {
    sheet: String,
    row: Number,
    field: String,
    label: String,
    code: String,
    message: String,
    value: mongoose.Schema.Types.Mixed,
    severity: { type: String, enum: ['ERROR', 'WARNING'] },
  },
  { _id: false }
);

const suggestionItemSchema = new mongoose.Schema(
  {
    sheet: String,
    row: Number,
    field: String,
    label: String,
    current: String,
    suggested: String,
    confidence: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'] },
    fixType: String,
  },
  { _id: false }
);

// Version snapshot stored when user saves edits
const versionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: String, required: true },
    hoSoRow: mongoose.Schema.Types.Mixed,
    vanBanRows: [mongoose.Schema.Types.Mixed],
    errorCount: Number,
    warningCount: Number,
  },
  { _id: false }
);

const dossierSchema = new mongoose.Schema(
  {
    maHoSo: {
      type: String,
      index: true,
    },
    state: {
      type: String,
      enum: Object.values(DOSSIER_STATES),
      default: DOSSIER_STATES.UPLOAD,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    // Parsed Excel data (current working copy)
    hoSoRow: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    vanBanRows: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // PDF filenames in Attachment/ (basenames only)
    pdfFiles: {
      type: [String],
      default: [],
    },
    // Latest validation result
    validationResult: {
      valid: Boolean,
      errorCount: { type: Number, default: 0 },
      warningCount: { type: Number, default: 0 },
      errors: [validationItemSchema],
      suggestions: [suggestionItemSchema],
      validatedAt: Date,
    },
    // Version history (each save creates a new version)
    versions: {
      type: [versionSchema],
      default: [],
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    // Temp storage path on server (cleared after APPROVED)
    tempPath: {
      type: String,
      default: null,
    },
    // MinIO paths (populated after APPROVED)
    minioPdfPrefix: {
      type: String,
      default: null,
    },
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String,
    sipZipPath: { type: String, default: null },
    packagedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'dossiers',
  }
);

dossierSchema.index({ state: 1, createdAt: -1 });
dossierSchema.index({ uploadedBy: 1, createdAt: -1 });
dossierSchema.index({ maHoSo: 1 }, { unique: true, sparse: true });

const Dossier = mongoose.model('Dossier', dossierSchema);

module.exports = Dossier;
