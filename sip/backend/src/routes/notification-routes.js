/**
 * Notification routes:
 *   GET  /api/notifications        — last 20 notifications for current user
 *   POST /api/notifications/read-all — mark all as read
 */
const express = require('express');
const authMiddleware = require('../middleware/auth-middleware');
const Notification = require('../models/notification-model');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/notifications — last 20 for current user, newest first. */
router.get('/', async (req, res, next) => {
  try {
    const items = await Notification.find({ userId: req.user.email })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId: req.user.email, read: false });

    res.json({ success: true, data: { items, unreadCount } });
  } catch (err) {
    next(err);
  }
});

/** POST /api/notifications/read-all — mark all notifications as read. */
router.post('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user.email, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
