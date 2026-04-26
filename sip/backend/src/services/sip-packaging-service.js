/**
 * SIP packaging orchestrator.
 * Coordinates the full pipeline for creating an OAIS-compliant SIP ZIP:
 *   1. Load dossier from MongoDB
 *   2. Build working directory: copy PDFs from temp storage
 *   3. Generate METS.xml, EAD.xml, PREMIS.xml
 *   4. Compute SHA-256 checksums + write checksums.csv
 *   5. Create ZIP archive
 *   6. Transition dossier state: APPROVED → PACKAGING → DONE
 *   7. Audit log on completion / failure
 *
 * MinIO upload deferred to Phase 6 — ZIP saved to temp for now.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const Dossier = require('../models/dossier-model');
const auditLogService = require('./audit-log-service');
const { transition } = require('./workflow-engine');
const { generateMets } = require('./mets-generator');
const { generateEad } = require('./ead-generator');
const { generatePremis } = require('./premis-generator');
const { computeChecksums, writeChecksumsCsv, hashFile } = require('./checksum-service');
const { createZip, verifyZip } = require('./zip-service');
const { DOSSIER_STATES, AUDIT_ACTIONS } = require('../utils/constants');
const logger = require('../utils/logger');

const SOFTWARE_NAME = 'SIP Archival System';
const SOFTWARE_VERSION = '1.0.0';

/**
 * Create a SIP ZIP for the given dossier.
 * Called by the BullMQ job processor with progress reporting.
 *
 * @param {string}   dossierId
 * @param {object}   options  - { submittingOrg?, checksumAlgo? }
 * @param {Function} onProgress - (percent: number) => void
 * @returns {{ zipPath: string, maHoSo: string }}
 */
async function create(dossierId, options = {}, onProgress = () => {}) {
  const dossier = await Dossier.findById(dossierId);
  if (!dossier) throw new Error('Không tìm thấy hồ sơ');
  if (dossier.state !== DOSSIER_STATES.APPROVED) {
    throw new Error(`Hồ sơ phải ở trạng thái APPROVED (hiện tại: ${dossier.state})`);
  }

  const maHoSo = dossier.maHoSo || String(dossier._id);
  // Sanitize maHoSo for filesystem use — strip any path-traversal characters
  const safeMaHoSo = path.basename(maHoSo).replace(/[^a-zA-Z0-9._-]/g, '_');
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `sip-pkg-`));
  const sipDir = path.join(workDir, `SIP_${safeMaHoSo}`);

  try {
    // Transition to PACKAGING
    await transition(dossierId, DOSSIER_STATES.PACKAGING, null, {});
    onProgress(5);

    // Build SIP directory structure
    const metadataDir = path.join(sipDir, 'metadata');
    const representationsDir = path.join(sipDir, 'representations', 'original');
    fs.mkdirSync(metadataDir, { recursive: true });
    fs.mkdirSync(representationsDir, { recursive: true });
    onProgress(10);

    // Copy PDFs from dossier temp storage
    const pdfMeta = [];
    const tempPath = dossier.tempPath;

    for (const pdfName of (dossier.pdfFiles || [])) {
      const srcPath = tempPath
        ? path.join(tempPath, 'Attachment', pdfName)
        : null;
      const destPath = path.join(representationsDir, pdfName);

      if (srcPath && fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        const stat = fs.statSync(destPath);
        const sha256 = await hashFile(destPath);
        pdfMeta.push({ name: pdfName, size: stat.size, sha256 });
      } else {
        logger.warn('PDF not found in temp storage, skipping', { pdfName, tempPath });
        pdfMeta.push({ name: pdfName, size: 0, sha256: '' });
      }
    }
    onProgress(30);

    const packagingDate = new Date().toISOString();
    const submittingOrg = options.submittingOrg || '';

    // Generate METS.xml
    const metsXml = generateMets({
      maHoSo,
      createDate: packagingDate,
      softwareName: SOFTWARE_NAME,
      submittingOrg,
      pdfFiles: pdfMeta,
    });
    fs.writeFileSync(path.join(sipDir, 'METS.xml'), metsXml, 'utf8');
    onProgress(45);

    // Generate EAD.xml
    const eadXml = generateEad({
      maHoSo,
      hoSoRow: dossier.hoSoRow,
      vanBanRows: dossier.vanBanRows,
    });
    fs.writeFileSync(path.join(metadataDir, 'EAD.xml'), eadXml, 'utf8');
    onProgress(60);

    // Generate PREMIS.xml
    const premisXml = generatePremis({
      maHoSo,
      hoSoRow: dossier.hoSoRow,
      pdfFiles: pdfMeta,
      packagingDate,
      softwareName: SOFTWARE_NAME,
      softwareVersion: SOFTWARE_VERSION,
    });
    fs.writeFileSync(path.join(metadataDir, 'PREMIS.xml'), premisXml, 'utf8');
    onProgress(70);

    // Compute checksums for all SIP files + write checksums.csv
    const checksums = await computeChecksums(sipDir);
    writeChecksumsCsv(checksums, path.join(metadataDir, 'checksums.csv'));
    onProgress(80);

    // Create ZIP
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const zipPath = path.join(workDir, `SIP_${safeMaHoSo}_${dateStr}.zip`);
    await createZip(sipDir, zipPath);

    if (!verifyZip(zipPath)) {
      throw new Error('ZIP verification failed — archive is empty or unreadable');
    }
    onProgress(90);

    // Transition: PACKAGING → DONE
    await transition(dossierId, DOSSIER_STATES.DONE, null, {
      sipZipPath: zipPath,
      packagedAt: new Date(),
    });

    await auditLogService.log({
      action: AUDIT_ACTIONS.PACKAGE,
      userID: 'system',
      dossierID: String(dossierId),
      resultStatus: 'SUCCESS',
      details: { zipPath, maHoSo, pdfCount: pdfMeta.length },
    });

    onProgress(100);
    logger.info('SIP packaging complete', { dossierId, maHoSo, zipPath });
    // NOTE: workDir intentionally kept alive — zipPath must persist until Phase 6 MinIO upload.
    // Phase 6 will upload the ZIP then call cleanupDir(workDir).

    return { zipPath, maHoSo };
  } catch (err) {
    // On failure: revert dossier back to APPROVED so operator can retry
    try {
      const current = await Dossier.findById(dossierId);
      if (current?.state === DOSSIER_STATES.PACKAGING) {
        await Dossier.findByIdAndUpdate(dossierId, { $set: { state: DOSSIER_STATES.APPROVED } });
      }
    } catch (revertErr) {
      logger.error('Failed to revert dossier state after packaging failure', { revertErr: revertErr.message });
    }

    await auditLogService.log({
      action: AUDIT_ACTIONS.PACKAGE,
      userID: 'system',
      dossierID: String(dossierId),
      resultStatus: 'FAILURE',
      details: { error: err.message },
    });

    // Clean up working directory
    cleanupDir(workDir);
    throw err;
  }
}

function cleanupDir(dir) {
  try {
    if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    logger.warn('Failed to clean up SIP work dir', { dir, error: e.message });
  }
}

module.exports = { create };
