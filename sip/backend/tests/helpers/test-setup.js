/**
 * Shared test setup: in-memory MongoDB via MongoMemoryServer.
 * Import this in integration/E2E test files.
 *
 * Usage:
 *   const { startDb, stopDb, clearDb } = require('../helpers/test-setup');
 *   beforeAll(startDb);
 *   afterEach(clearDb);
 *   afterAll(stopDb);
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function startDb() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function stopDb() {
  await mongoose.disconnect();
  await mongoServer?.stop();
}

async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

module.exports = { startDb, stopDb, clearDb };
