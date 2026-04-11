const bcrypt = require("bcryptjs");
const { loadEnv } = require("../config/env");
loadEnv();
const connectDB = require("../config/db");
const sequelize = require("../config/database");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    // Connect to database (MongoDB if available, otherwise proceed)
    await connectDB();

    // Sync Sequelize database
    await sequelize.sync();
    console.log("🔄 Database synced...");

    // Admin credentials
    const adminEmail = "admin@talex.com";
    const adminPassword = "Admin123!"; // Change this to a secure password
    const adminName = "Admin User";

    console.log("🔐 Creating Admin Account...\n");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      console.log("⚠️  Admin account with this email already exists!");
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Role: ${existingAdmin.role}`);
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isVerified: true,
      authProvider: "local",
    });

    console.log("✅ Admin account created successfully!\n");
    console.log("📋 Admin Credentials:");
    console.log("─".repeat(40));
    console.log(`📧 Email:    ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Name:     ${adminName}`);
    console.log(`🎯 Role:     admin`);
    console.log("─".repeat(40));
    console.log("\n⚠️  IMPORTANT:");
    console.log("1. Store these credentials in a secure location");
    console.log("2. Change the password after first login");
    console.log("3. Update the .env file with custom credentials if needed\n");

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin account:", error.message);
    console.error("Full error:", error);
    await sequelize.close();
    process.exit(1);
  }
};

createAdmin();
