const User = require('../models/user-model');
const auditLogService = require('./audit-log-service');
const { NotFoundError, ValidationError } = require('../utils/app-error');
const { AUDIT_ACTIONS, ROLES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Create a new user. Hashes password before saving.
 */
async function createUser({ email, password, fullName, role }, actorEmail) {
  if (!email || !password || !fullName || !role) {
    throw new ValidationError('email, password, fullName, and role are required');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }
  if (!Object.values(ROLES).includes(role)) {
    throw new ValidationError(`role must be one of: ${Object.values(ROLES).join(', ')}`);
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new ValidationError('Email already in use');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email: email.toLowerCase().trim(), passwordHash, fullName, role });

  await auditLogService.log({
    action: AUDIT_ACTIONS.USER_CREATED,
    userID: actorEmail,
    resultStatus: 'SUCCESS',
    details: { targetEmail: user.email },
  });

  logger.info('User created', { email: user.email, role, createdBy: actorEmail });
  return user;
}

/**
 * Paginated user list with optional email/role filters.
 */
async function getUsers(query = {}, options = {}) {
  const { email, role, active } = query;
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, parseInt(options.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const filter = {};
  // Escape user input before using in regex to prevent ReDoS
  if (email) {
    const safeEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.email = { $regex: safeEmail, $options: 'i' };
  }
  if (role) filter.role = role;
  if (active !== undefined) filter.active = active === 'true' || active === true;

  const [items, total] = await Promise.all([
    User.find(filter, '-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Update user fields (fullName, role). Email and passwordHash not changed here.
 */
async function updateUser(id, { fullName, role }, actorEmail) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found');

  if (fullName) user.fullName = fullName;
  if (role) {
    if (!Object.values(ROLES).includes(role)) {
      throw new ValidationError(`role must be one of: ${Object.values(ROLES).join(', ')}`);
    }
    user.role = role;
  }
  await user.save();

  await auditLogService.log({
    action: AUDIT_ACTIONS.USER_UPDATED,
    userID: actorEmail,
    resultStatus: 'SUCCESS',
    details: { targetId: id },
  });

  logger.info('User updated', { id, updatedBy: actorEmail });
  return user;
}

/**
 * Toggle active (lock/unlock) status for a user.
 */
async function lockUser(id, lock, actorEmail) {
  const user = await User.findById(id);
  if (!user) throw new NotFoundError('User not found');

  user.active = !lock;
  await user.save();

  await auditLogService.log({
    action: lock ? AUDIT_ACTIONS.USER_LOCKED : AUDIT_ACTIONS.USER_UNLOCKED,
    userID: actorEmail,
    resultStatus: 'SUCCESS',
    details: { targetId: id },
  });

  logger.info(lock ? 'User locked' : 'User unlocked', { id, by: actorEmail });
  return user;
}

module.exports = { createUser, getUsers, updateUser, lockUser };
