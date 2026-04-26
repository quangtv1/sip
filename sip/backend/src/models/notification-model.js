/**
 * Notification — in-app notification stored per user.
 * WebSocket push deferred to Phase 6; this collection is the source of truth.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    event:  { type: String, required: true },
    data:   { type: mongoose.Schema.Types.Mixed },
    read:   { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'notifications' }
);

module.exports = mongoose.model('Notification', notificationSchema);
