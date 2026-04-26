/**
 * Notification service — stub for Phase 4.
 * Persists in-app notifications to MongoDB `notifications` collection.
 * WebSocket push deferred to Phase 6.
 */
const Notification = require('../models/notification-model');
const logger = require('../utils/logger');

/**
 * Store a notification for a user.
 * Fire-and-forget safe — never throws; errors are logged only.
 *
 * @param {string} userId - Recipient user email or ID
 * @param {string} event  - Event type (e.g. 'DOSSIER_APPROVED', 'PACKAGE_DONE')
 * @param {object} data   - Arbitrary event payload
 */
async function notify(userId, event, data = {}) {
  try {
    await Notification.create({ userId, event, data });
  } catch (err) {
    logger.error('Failed to write notification', { userId, event, error: err.message });
  }
}

module.exports = { notify };
