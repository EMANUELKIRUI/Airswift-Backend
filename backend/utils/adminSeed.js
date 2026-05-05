const User = require('../models/User');

const ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'emanuelkirui1@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Ee0795565529@';
const ADMIN_NAME = process.env.DEFAULT_ADMIN_NAME || process.env.ADMIN_NAME || 'Airswift Admin';

const createDefaultAdmin = async () => {
  if (!ADMIN_EMAIL) {
    throw new Error('DEFAULT_ADMIN_EMAIL or ADMIN_EMAIL is required to create an admin account.');
  }

  if (!ADMIN_PASSWORD) {
    throw new Error('DEFAULT_ADMIN_PASSWORD or ADMIN_PASSWORD is required to create an admin account.');
  }

  const [admin, created] = await User.findOrCreate({
    where: { email: ADMIN_EMAIL },
    defaults: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      isVerified: true,
      hasSubmittedApplication: false,
      status: 'active',
    },
  });

  if (!created) {
    let updated = false;
    if (admin.role !== 'admin') {
      admin.role = 'admin';
      updated = true;
    }
    if (!admin.isVerified) {
      admin.isVerified = true;
      updated = true;
    }
    if (updated) {
      await admin.save();
    }
  }

  return admin;
};

module.exports = {
  createDefaultAdmin,
};
