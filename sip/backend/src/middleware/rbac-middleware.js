const { ForbiddenError } = require('../utils/app-error');

/**
 * Role-based access control middleware factory.
 * Returns a middleware that allows only users whose role is in the allowed list.
 *
 * Usage: router.get('/users', authMiddleware, requireRole('Admin'), handler)
 */
function requireRole(...roles) {
  // Accept both requireRole('Admin', 'Operator') and requireRole(['Admin', 'Operator'])
  const allowed = roles.flat();
  return function rbacMiddleware(req, res, next) {
    if (!req.user) {
      return next(new ForbiddenError('No authenticated user on request'));
    }

    if (!allowed.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Role '${req.user.role}' is not permitted. Required: ${allowed.join(', ')}`)
      );
    }

    next();
  };
}

module.exports = { requireRole };
