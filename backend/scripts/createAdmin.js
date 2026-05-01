const bcrypt = require("bcryptjs");
const { loadEnv } = require("../config/env");
loadEnv();
const connectDB = require("../config/db");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    // Connect to database (MongoDB if available, otherwise proceed)
    await connectDB();

    console.log("🔐 Creating Admin Account...\n");

    // Admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || "admin@airswift.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

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

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin account:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

createAdmin();
