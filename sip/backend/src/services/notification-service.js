/**
 * Notification service.
 * Persists in-app notifications to MongoDB and pushes via WebSocket.
 */
const Notification = require('../models/notification-model');
const notificationWs = require('../websocket/notification-ws');
const logger = require('../utils/logger');

/**
 * Store a notification for a user and push via WebSocket if connected.
 * Fire-and-forget safe — never throws; errors are logged only.
 *
 * @param {string} userId - Recipient user email or ID
 * @param {string} event  - Event type (e.g. 'DOSSIER_APPROVED', 'PACKAGE_DONE')
 * @param {object} data   - Arbitrary event payload
 */
async function notify(userId, event, data = {}) {
  try {
    await Notification.create({ userId, event, data });
    notificationWs.push(userId, event, data);
  } catch (err) {
    logger.error('Failed to write notification', { userId, event, error: err.message });
  }
}

module.exports = { notify };
