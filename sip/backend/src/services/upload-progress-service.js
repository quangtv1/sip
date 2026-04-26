/**
 * Server-Sent Events (SSE) upload progress service.
 * Creates per-request SSE streams that emit pipeline step events.
 * Steps: upload → parse → validate → pdf-check → complete
 *
 * Usage:
 *   const progress = uploadProgressService.create(res);
 *   progress.emit('parse', 30);
 *   progress.emit('validate', 60, 'Checking row 45/100');
 *   progress.done(summary);
 */

/**
 * Initialise SSE headers on an Express response.
 * @param {express.Response} res
 * @returns {{ emit, done, error }} controller
 */
function create(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  function send(data) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  return {
    /**
     * Emit a pipeline step progress event.
     * @param {string} step   - 'upload' | 'parse' | 'validate' | 'pdf-check' | 'complete'
     * @param {number} progress - 0-100
     * @param {string} [detail]
     */
    emit(step, progress, detail) {
      send({ step, progress, detail });
    },

    /** Emit final summary and close the stream. */
    done(summary = {}) {
      send({ step: 'complete', progress: 100, summary });
      if (!res.writableEnded) res.end();
    },

    /** Emit an error event and close the stream. */
    error(message) {
      send({ step: 'error', progress: 0, error: message });
      if (!res.writableEnded) res.end();
    },
  };
}

module.exports = { create };
