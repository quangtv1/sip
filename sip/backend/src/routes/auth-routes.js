const express = require('express');
const authService = require('../services/auth-service');
const auditLogService = require('../services/audit-log-service');
const authMiddleware = require('../middleware/auth-middleware');
const { AUDIT_ACTIONS } = require('../utils/constants');

const router = express.Router();

/**
 * POST /api/auth/login
 * Public — validate credentials and return JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Authenticated — stateless; just records the audit log. Client discards token.
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await auditLogService.log({
      action: AUDIT_ACTIONS.LOGOUT,
      userID: req.user.email,
      resultStatus: 'SUCCESS',
    });
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/password
 * Authenticated — change own password.
 */
router.put('/password', authMiddleware, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.email, oldPassword, newPassword);
    res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
