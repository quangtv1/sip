/**
 * BullMQ worker for SIP packaging jobs.
 * Processes jobs from the 'sip-packaging' queue.
 * Each job: { dossierId, options }
 * Reports progress 0-100 via job.updateProgress().
 * On failure: dossier is reverted to APPROVED by sip-packaging-service.
 */
const { Worker } = require('bullmq');
const sipPackagingService = require('../services/sip-packaging-service');
const { redisConnection } = require('./queue-setup');
const logger = require('../utils/logger');

const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function startWorker() {
  const worker = new Worker(
    'sip-packaging',
    async (job) => {
      const { dossierId, options = {} } = job.data;
      logger.info('SIP packaging job started', { jobId: job.id, dossierId });

      await job.updateProgress(0);

      const result = await sipPackagingService.create(
        dossierId,
        options,
        async (percent) => {
          await job.updateProgress(percent);
        }
      );

      logger.info('SIP packaging job complete', { jobId: job.id, dossierId, zipPath: result.zipPath });
      return { zipPath: result.zipPath, maHoSo: result.maHoSo };
    },
    {
      connection: redisConnection,
      concurrency: 2,
      lockDuration: JOB_TIMEOUT_MS,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error('SIP packaging job failed', { jobId: job?.id, error: err.message });
  });

  worker.on('error', (err) => {
    logger.error('SIP packaging worker error', { error: err.message });
  });

  logger.info('SIP packaging worker started');
  return worker;
}

module.exports = { startWorker };
