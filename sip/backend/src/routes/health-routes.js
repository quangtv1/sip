const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const Minio = require('minio');
const config = require('../config/index');
const logger = require('../utils/logger');

const router = express.Router();

// Lazy singletons — created once on first health check, reused across calls
let redisClient = null;
let minioClient = null;

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
    redisClient.on('error', (err) => logger.warn('Redis health client error', { error: err.message }));
  }
  return redisClient;
}

function getMinioClient() {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: config.MINIO_ENDPOINT,
      port: config.MINIO_PORT,
      useSSL: config.MINIO_USE_SSL,
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

async function checkMongoDB() {
  return mongoose.connection.readyState === 1 ? 'ok' : 'error';
}

async function checkRedis() {
  try {
    const client = getRedisClient();
    await client.ping();
    return 'ok';
  } catch {
    return 'error';
  }
}

async function checkMinio() {
  try {
    const client = getMinioClient();
    await client.bucketExists(config.MINIO_BUCKET_PDF);
    return 'ok';
  } catch {
    return 'error';
  }
}

/**
 * GET /api/health
 * Returns overall status and per-service connectivity.
 * status: 'OK' if all services healthy, 'DEGRADED' otherwise.
 */
router.get('/', async (req, res, next) => {
  try {
    const [mongodb, redis, minio] = await Promise.all([checkMongoDB(), checkRedis(), checkMinio()]);

    const services = { mongodb, redis, minio };
    const status = Object.values(services).every((s) => s === 'ok') ? 'OK' : 'DEGRADED';
    const httpStatus = status === 'OK' ? 200 : 503;

    res.status(httpStatus).json({
      success: status === 'OK',
      data: { status, services, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
