/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/routes/**/*.js',
    'src/middleware/**/*.js',
    '!src/services/minio-storage-service.js', // requires live MinIO
    '!src/jobs/**/*.js',                       // requires live Redis
    '!src/websocket/**/*.js',                  // requires live HTTP server
  ],
  coverageThreshold: {
    global: { lines: 70, functions: 70 },
  },
  setupFiles: ['./tests/helpers/jest-env-setup.js'],
  testTimeout: 30000,
  // BullMQ keeps the Redis connection open after tests — force Jest to exit cleanly
  forceExit: true,
};
