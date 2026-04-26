const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user-model');
const auditLogService = require('./audit-log-service');
const { AuthError, ValidationError } = require('../utils/app-error');
const { AUDIT_ACTIONS } = require('../utils/constants');
const config = require('../config/index');
const logger = require('../utils/logger');

// Pre-computed dummy hash used to prevent timing oracle on login
// (ensures bcrypt.compare always runs, even when user is not found)
const DUMMY_HASH = '$2a$12$invalidhashfortimingprotectiononly000000000';

/**
 * Validate credentials and issue a JWT.
 * Returns { token, user: { email, role, fullName } }
 */
async function login(email, password) {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always run bcrypt compare to prevent timing-based user enumeration
  const hashToCheck = user ? user.passwordHash : DUMMY_HASH;
  const passwordValid = await bcrypt.compare(password, hashToCheck);

  if (!user || !passwordValid) {
    await auditLogService.log({
      action: AUDIT_ACTIONS.LOGIN,
      userID: email,
      resultStatus: 'ERROR',
      details: { reason: 'Invalid credentials' },
    });
    throw new AuthError('Invalid email or password');
  }

  if (!user.active) {
    await auditLogService.log({
      action: AUDIT_ACTIONS.LOGIN,
      userID: email,
      resultStatus: 'ERROR',
      details: { reason: 'Account locked' },
    });
    throw new AuthError('Account is locked');
  }

  const payload = { sub: user.email, email: user.email, role: user.role, fullName: user.fullName };
  const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY });

  user.lastLogin = new Date();
  await user.save();

  await auditLogService.log({
    action: AUDIT_ACTIONS.LOGIN,
    userID: user.email,
    resultStatus: 'SUCCESS',
  });

  logger.info('User logged in', { email: user.email, role: user.role });

  return {
    token,
    user: { email: user.email, role: user.role, fullName: user.fullName },
  };
}

/**
 * Verify a JWT string and return decoded payload.
 * Throws AuthError if invalid or expired.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (err) {
    throw new AuthError('Invalid or expired token');
  }
}

/**
 * Change password after verifying the old one.
 */
async function changePassword(userEmail, oldPassword, newPassword) {
  if (!oldPassword || !newPassword) {
    throw new ValidationError('Old and new passwords are required');
  }
  if (newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters');
  }

  const user = await User.findOne({ email: userEmail });
  if (!user) throw new AuthError('User not found');

  const valid = await user.verifyPassword(oldPassword);
  if (!valid) throw new AuthError('Current password is incorrect');

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  await auditLogService.log({
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    userID: userEmail,
    resultStatus: 'SUCCESS',
  });

  logger.info('Password changed', { email: userEmail });
}

module.exports = { login, verifyToken, changePassword };
