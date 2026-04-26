/**
 * Application configuration stored in MongoDB.
 * Supports hot-reload without server restart.
 * Currently covers MinIO storage settings.
 */
const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'app_configs' }
);

module.exports = mongoose.model('AppConfig', appConfigSchema);
