/**
 * SIP viewer service.
 * Downloads a SIP ZIP from MinIO, unzips in-memory, returns file tree + content.
 * Max uncompressed size: 100 MB (guard against decompression bombs).
 */
const AdmZip = require('adm-zip');
const minioStorageService = require('./minio-storage-service');
const config = require('../config/index');
const { ValidationError } = require('../utils/app-error');

const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100 MB

// Short-lived cache: objectPath → { zip, expiresAt }
const zipCache = new Map();
const ZIP_CACHE_TTL_MS = 60_000;

function getCachedZip(objectPath) {
  const entry = zipCache.get(objectPath);
  if (entry && entry.expiresAt > Date.now()) return entry.zip;
  zipCache.delete(objectPath);
  return null;
}

function setCachedZip(objectPath, zip) {
  zipCache.set(objectPath, { zip, expiresAt: Date.now() + ZIP_CACHE_TTL_MS });
}

/**
 * Download ZIP from MinIO and parse into an AdmZip instance.
 * @param {string} objectPath - MinIO object key in MINIO_BUCKET_SIP
 * @returns {AdmZip}
 */
async function loadZip(objectPath) {
  const cached = getCachedZip(objectPath);
  if (cached) return cached;

  const stream = await minioStorageService.downloadStream(config.MINIO_BUCKET_SIP, objectPath);

  // Buffer the stream (SIP ZIPs are small — typically < 50 MB)
  const chunks = [];
  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  const buffer = Buffer.concat(chunks);
  const zip = new AdmZip(buffer);

  // Decompression bomb guard — use header.fileSize (uncompressed size), not header.size (compressed)
  const totalUncompressed = zip.getEntries().reduce((sum, e) => sum + (e.header.fileSize || e.header.size || 0), 0);
  if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
    throw new ValidationError(`SIP ZIP giải nén vượt quá ${MAX_UNCOMPRESSED_BYTES / 1024 / 1024} MB`);
  }

  setCachedZip(objectPath, zip);
  return zip;
}

/**
 * Return the file tree of a SIP ZIP.
 * @param {string} objectPath
 * @returns {Array<{ path: string, size: number, isDir: boolean }>}
 */
async function getFileTree(objectPath) {
  const zip = await loadZip(objectPath);
  const entries = zip.getEntries();

  return entries.map((e) => ({
    path: e.entryName,
    size: e.header.size || 0,
    isDir: e.isDirectory,
  }));
}

/**
 * Extract a single file from the ZIP and return its content as a string (UTF-8).
 * Only safe for text-based files (XML, CSV, TXT). Rejects PDFs.
 *
 * @param {string} objectPath - MinIO object key
 * @param {string} filePath   - entry path within ZIP
 * @returns {string} file content
 */
async function getFileContent(objectPath, filePath) {
  const zip = await loadZip(objectPath);

  const entry = zip.getEntry(filePath);
  if (!entry) throw new ValidationError(`File không tồn tại trong ZIP: ${filePath}`);
  if (entry.isDirectory) throw new ValidationError('Không thể đọc nội dung thư mục');

  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) throw new ValidationError('Không hỗ trợ xem nội dung file PDF');

  const content = zip.readAsText(entry);
  return content;
}

module.exports = { getFileTree, getFileContent };
