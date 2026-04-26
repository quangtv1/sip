const authService = require('../services/auth-service');
const { AuthError } = require('../utils/app-error');

/**
 * JWT authentication middleware.
 * Extracts Bearer token, verifies it, and attaches decoded payload to req.user.
 * req.user = { sub, email, role, fullName }
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthError('Authorization header missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new AuthError('Token not provided'));
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
