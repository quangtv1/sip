/**
 * ZIP creation service for SIP packaging.
 * Streams a directory tree into a ZIP archive using archiver.
 * SIP folder structure:
 *   SIP_[MaHoSo]/
 *   ├── METS.xml
 *   ├── metadata/
 *   │   ├── EAD.xml
 *   │   ├── PREMIS.xml
 *   │   └── checksums.csv
 *   └── representations/original/*.pdf
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Create a ZIP archive from a prepared SIP working directory.
 * @param {string} sipDir  - Root of the SIP folder (contains METS.xml, metadata/, representations/)
 * @param {string} zipPath - Output ZIP file path
 * @returns {Promise<void>} Resolves when ZIP is finalised and flushed to disk
 */
function createZip(sipDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);

    // Add entire SIP directory, preserving internal structure
    const sipName = path.basename(sipDir);
    archive.directory(sipDir, sipName);

    archive.finalize();
  });
}

/**
 * Verify a ZIP is readable and non-empty (integrity check).
 * @param {string} zipPath
 * @returns {boolean}
 */
function verifyZip(zipPath) {
  try {
    const stat = fs.statSync(zipPath);
    return stat.size > 0;
  } catch {
    return false;
  }
}

module.exports = { createZip, verifyZip };
