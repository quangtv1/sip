const { AppError, ValidationError, AuthError, ForbiddenError, NotFoundError } = require('../utils/app-error');
const logger = require('../utils/logger');

/**
 * Centralised error handler — must be registered as the last middleware.
 * Formats all errors into the standard { success: false, error: { code, message, details } } shape.
 */
// eslint-disable-next-line no-unused-vars
function errorHandlerMiddleware(err, req, res, next) {
  // Log unexpected errors with full stack; known AppErrors at warn level
  if (err instanceof AppError) {
    logger.warn('Application error', { code: err.code, message: err.message, path: req.path });
  } else {
    logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.path });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof AuthError) {
    return res.status(401).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Unknown / unexpected error — don't leak internals in production
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message },
  });
}

module.exports = errorHandlerMiddleware;
