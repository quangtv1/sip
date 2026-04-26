const express = require('express');
const userService = require('../services/user-service');
const authMiddleware = require('../middleware/auth-middleware');
const { requireRole } = require('../middleware/rbac-middleware');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// All user management routes require Admin role
router.use(authMiddleware, requireRole(ROLES.ADMIN));

/**
 * GET /api/users
 * Paginated user list. Query params: email, role, active, page, limit
 */
router.get('/', async (req, res, next) => {
  try {
    const { email, role, active, page, limit } = req.query;
    const result = await userService.getUsers({ email, role, active }, { page, limit });
    res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pages: result.pages, limit: result.limit } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Create a new user. Body: { email, password, fullName, role }
 */
router.post('/', async (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body;
    const user = await userService.createUser({ email, password, fullName, role }, req.user.email);
    const { passwordHash: _, ...safeUser } = user.toObject();
    res.status(201).json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id
 * Update user info. Body: { fullName, role }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { fullName, role } = req.body;
    const user = await userService.updateUser(req.params.id, { fullName, role }, req.user.email);
    const { passwordHash: _, ...safeUser } = user.toObject();
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:id/lock
 * Toggle lock status. Body: { lock: true|false }
 */
router.put('/:id/lock', async (req, res, next) => {
  try {
    if (req.body.lock === undefined || req.body.lock === null) {
      return next(new (require('../utils/app-error').ValidationError)('lock field is required (true or false)'));
    }
    const lock = req.body.lock === true || req.body.lock === 'true';
    const user = await userService.lockUser(req.params.id, lock, req.user.email);
    const { passwordHash: _, ...safeUser } = user.toObject();
    res.json({ success: true, data: safeUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
