/**
 * MinIO storage service.
 * Supports hot-reload: call reloadConfig() after updating app_configs.
 * Methods: uploadFile, getPresignedUrl, listFiles, downloadStream, ensureBuckets.
 * Retry: 3 attempts with exponential backoff on upload failures.
 */
const Minio = require('minio');
const fs = require('fs');
const AppConfig = require('../models/app-config-model');
const config = require('../config/index');
const logger = require('../utils/logger');

let minioClient = null;

/** Build a Minio.Client from env config (used as baseline / fallback). */
function clientFromEnv() {
  return new Minio.Client({
    endPoint:        config.MINIO_ENDPOINT,
    port:            config.MINIO_PORT,
    useSSL:          config.MINIO_USE_SSL,
    accessKey:       config.MINIO_ACCESS_KEY,
    secretKey:       config.MINIO_SECRET_KEY,
  });
}

/** Load config from MongoDB if it exists, otherwise fall back to env. */
async function buildClient() {
  try {
    const stored = await AppConfig.findOne({ key: 'minio' }).lean();
    if (stored?.value) {
      const v = stored.value;
      return new Minio.Client({
        endPoint:  v.endpoint  || config.MINIO_ENDPOINT,
        port:      v.port      || config.MINIO_PORT,
        useSSL:    v.useSSL    ?? config.MINIO_USE_SSL,
        accessKey: v.accessKey || config.MINIO_ACCESS_KEY,
        secretKey: v.secretKey || config.MINIO_SECRET_KEY,
      });
    }
  } catch (err) {
    logger.warn('Could not load MinIO config from DB, using env', { error: err.message });
  }
  return clientFromEnv();
}

/** (Re)initialise MinIO client — call once on startup and after config change. */
async function reloadConfig() {
  minioClient = await buildClient();
  logger.info('MinIO client (re)loaded');
}

function getClient() {
  if (!minioClient) minioClient = clientFromEnv();
  return minioClient;
}

/** Auto-create required buckets on startup. */
async function ensureBuckets() {
  const client = getClient();
  const buckets = [config.MINIO_BUCKET_PDF, config.MINIO_BUCKET_SIP];
  for (const bucket of buckets) {
    try {
      const exists = await client.bucketExists(bucket);
      if (!exists) {
        await client.makeBucket(bucket);
        logger.info('Created MinIO bucket', { bucket });
      }
    } catch (err) {
      logger.error('Failed to ensure MinIO bucket', { bucket, error: err.message });
    }
  }
}

/**
 * Upload a file to MinIO with retry (max 3 attempts, exponential backoff).
 * @param {string} bucket
 * @param {string} objectPath - Full object key (path inside bucket)
 * @param {string|Buffer|Readable} source - File path string OR Buffer OR readable stream
 * @param {string} [contentType]
 */
async function uploadFile(bucket, objectPath, source, contentType = 'application/octet-stream') {
  const client = getClient();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (typeof source === 'string') {
        // File path — use fPutObject for streaming
        await client.fPutObject(bucket, objectPath, source, { 'Content-Type': contentType });
      } else if (Buffer.isBuffer(source)) {
        await client.putObject(bucket, objectPath, source, source.length, { 'Content-Type': contentType });
      } else {
        // Readable stream — caller must provide size
        await client.putObject(bucket, objectPath, source, { 'Content-Type': contentType });
      }
      logger.info('Uploaded to MinIO', { bucket, objectPath });
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = Math.pow(2, attempt) * 500;
      logger.warn(`MinIO upload attempt ${attempt} failed, retrying in ${delay}ms`, { error: err.message });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Generate a presigned GET URL (default 1-hour expiry).
 * @param {string} bucket
 * @param {string} objectPath
 * @param {number} [expirySeconds=3600]
 * @returns {Promise<string>}
 */
async function getPresignedUrl(bucket, objectPath, expirySeconds = 3600) {
  const client = getClient();
  return client.presignedGetObject(bucket, objectPath, expirySeconds);
}

/**
 * List objects under a bucket prefix.
 * @param {string} bucket
 * @param {string} [prefix='']
 * @returns {Promise<Array<{name, size, lastModified}>>}
 */
async function listFiles(bucket, prefix = '') {
  const client = getClient();
  return new Promise((resolve, reject) => {
    const items = [];
    const stream = client.listObjectsV2(bucket, prefix, true);
    stream.on('data', (obj) => items.push({ name: obj.name, size: obj.size, lastModified: obj.lastModified }));
    stream.on('end', () => resolve(items));
    stream.on('error', reject);
  });
}

/**
 * Get a readable stream for downloading an object.
 * @param {string} bucket
 * @param {string} objectPath
 * @returns {Promise<Readable>}
 */
async function downloadStream(bucket, objectPath) {
  const client = getClient();
  return client.getObject(bucket, objectPath);
}

module.exports = { reloadConfig, ensureBuckets, uploadFile, getPresignedUrl, listFiles, downloadStream, getClient };
