/**
 * BullMQ queue configuration for SIP packaging jobs.
 * Queue: 'sip-packaging'
 * Worker is started separately in packaging-job-processor.js.
 *
 * In test mode, returns a no-op stub so tests don't need a live Redis instance.
 */
const config = require('../config/index');

if (process.env.NODE_ENV === 'test') {
  // Stub queue — no Redis connection in tests. Packaging routes simply can't enqueue.
  const stub = {
    add:    async () => ({ id: 'test-job-id' }),
    getJob: async () => null,
    close:  async () => {},
  };
  module.exports = { sipPackagingQueue: stub, redisConnection: {} };
} else {
  const { Queue } = require('bullmq');
  const redisConnection = { url: config.REDIS_URL };
  const sipPackagingQueue = new Queue('sip-packaging', {
    connection: redisConnection,
    defaultJobOptions: {
      // No automatic retry — sip-packaging-service reverts state to APPROVED on failure,
      // allowing the operator to manually re-trigger. Automatic retry risks double-packaging.
      attempts: 1,
      removeOnComplete: 100,  // keep last 100 completed jobs for status queries
      removeOnFail: 50,
    },
  });
  module.exports = { sipPackagingQueue, redisConnection };
}
