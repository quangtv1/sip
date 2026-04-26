require('dotenv').config();

/**
 * Centralised env loader — validates required vars at startup.
 * Throws immediately if a required variable is missing so the app fails fast.
 */

const required = ['MONGO_URL', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,

  MONGO_URL: process.env.MONGO_URL,

  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',

  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'minio',
  MINIO_PORT: parseInt(process.env.MINIO_PORT, 10) || 9000,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
  MINIO_USE_SSL: process.env.MINIO_USE_SSL === 'true',
  MINIO_BUCKET_PDF: process.env.MINIO_BUCKET_PDF || 'pdf-files',
  MINIO_BUCKET_SIP: process.env.MINIO_BUCKET_SIP || 'sip-files',

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: process.env.JWT_EXPIRY || '8h',

  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};

module.exports = config;
