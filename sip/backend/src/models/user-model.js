const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../utils/constants');

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    enum: Object.values(ROLES),
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
});

/**
 * Compare a plaintext password against the stored bcrypt hash.
 * Returns true if match, false otherwise.
 */
userSchema.methods.verifyPassword = async function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Hash a plain password — used in services before saving.
 */
userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
