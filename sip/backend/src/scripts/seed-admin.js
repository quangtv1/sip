require('dotenv').config();

const mongoose = require('mongoose');
const config = require('../config/index');
const User = require('../models/user-model');
const { ROLES } = require('../utils/constants');

/**
 * Seed script — creates the default Admin user if it does not already exist.
 * Run with: npm run seed
 */
async function seedAdmin() {
  try {
    await mongoose.connect(config.MONGO_URL, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: config.ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin user already exists: ${config.ADMIN_EMAIL}`);
      return;
    }

    const passwordHash = await User.hashPassword(config.ADMIN_PASSWORD);
    await User.create({
      email: config.ADMIN_EMAIL,
      passwordHash,
      fullName: 'System Administrator',
      role: ROLES.ADMIN,
      active: true,
    });

    console.log(`Admin user created: ${config.ADMIN_EMAIL}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedAdmin();
