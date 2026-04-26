const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

/**
 * Connect to MongoDB with exponential backoff retry.
 * Delays: 1s, 2s, 4s, 8s, 16s before giving up.
 */
async function connectDatabase(attempt = 1) {
  try {
    await mongoose.connect(config.MONGO_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected', { url: config.MONGO_URL });
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      logger.error('MongoDB connection failed after max retries', { error: err.message });
      throw err;
    }

    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    logger.warn(`MongoDB connection attempt ${attempt} failed, retrying in ${delay}ms`, {
      error: err.message,
    });
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectDatabase(attempt + 1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

module.exports = { connectDatabase };
