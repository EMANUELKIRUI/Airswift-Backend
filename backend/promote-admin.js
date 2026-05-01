const { loadEnv } = require("./config/env");
loadEnv();

const mongoose = require("mongoose");
const User = require("./models/User");

const promoteToAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error("❌ MongoDB URI not found in environment variables");
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    const email = process.argv[2] || "admin@airswift.com";
    
    console.log(`🔄 Promoting ${email} to admin...`);

    const result = await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { role: "admin" } }
    );

    if (result.matchedCount === 0) {
      console.log(`❌ User not found with email: ${email}`);
    } else if (result.modifiedCount === 0) {
      console.log(`⚠️ User already has admin role`);
    } else {
      console.log(`✅ Successfully promoted ${email} to admin!`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

promoteToAdmin();
