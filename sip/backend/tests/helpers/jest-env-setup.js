/**
 * Jest globalSetup-style env injection.
 * Runs via jest.config.js `setupFiles` — before any test module is imported.
 * Sets required env vars so src/config/index.js validation passes in tests.
 */

// Required by src/config/index.js — dummy values are fine; tests use MongoMemoryServer
process.env.NODE_ENV     = 'test';
process.env.MONGO_URL    = 'mongodb://localhost:27017/test'; // overridden by MongoMemoryServer
process.env.JWT_SECRET   = 'test-secret-key-for-tests-only';
process.env.ADMIN_EMAIL  = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'AdminPassword1!';
