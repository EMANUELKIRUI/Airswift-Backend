const { User } = require('../models');
const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../utils/userHelpers');

const createAdminIfNotExists = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log("⚠️ Admin env variables missing - skipping admin creation");
      return;
    }

    const existingAdmin = await findUserByEmail(adminEmail);

    if (existingAdmin) {
      console.log("✅ Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await createUser({
      name: "Super Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isVerified: true,
      authProvider: "local",
    });

    console.log("🔥 Admin created successfully");
    console.log(`📧 Email: ${adminEmail}`);
  } catch (err) {
    console.error("Admin creation error:", err.message);
    console.log("⚠️ Admin creation failed - you may need to create admin manually or check database connection");
  }
};

module.exports = { createAdminIfNotExists };