/**
 * SHA-256 checksum computation for SIP packaging.
 * Returns a map of { relativePath: hexHash } and writes checksums.csv.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Compute SHA-256 hash of a file using a readable stream (non-blocking for large files).
 * @param {string} filePath - Absolute path
 * @returns {Promise<string>} hex digest
 */
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Collect all file paths under a directory recursively.
 * @param {string} baseDir
 * @returns {Array<{rel: string, full: string}>}
 */
function collectFiles(baseDir) {
  const entries = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        entries.push({ rel, full });
      }
    }
  }
  walk(baseDir);
  return entries;
}

/**
 * Compute SHA-256 for all files under a directory.
 * @param {string} baseDir - Root directory to scan
 * @returns {Promise<Map<string, string>>} relativePath → sha256 hex
 */
async function computeChecksums(baseDir) {
  const files = collectFiles(baseDir);
  const result = new Map();
  for (const { rel, full } of files) {
    result.set(rel, await hashFile(full));
  }
  return result;
}

/**
 * Write a checksums.csv file listing all file hashes.
 * Format: filename,algorithm,checksum
 * @param {Map<string, string>} checksums
 * @param {string} outputPath - Absolute path to write the CSV
 */
function writeChecksumsCsv(checksums, outputPath) {
  const lines = ['filename,algorithm,checksum'];
  for (const [file, hash] of checksums) {
    lines.push(`${file},SHA-256,${hash}`);
  }
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

module.exports = { hashFile, computeChecksums, writeChecksumsCsv };
