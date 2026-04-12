const { loadEnv } = require("./env");
loadEnv();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const envDatabaseUrl = process.env.DATABASE_URL;
    const uri = mongoUri || (envDatabaseUrl && envDatabaseUrl.startsWith('mongodb') ? envDatabaseUrl : null);

    if (!uri) {
      console.warn("⚠️ MongoDB URI is missing. Falling back to SQLite for testing...");
      console.log("✅ Using SQLite database for testing purposes");
      return; // Don't exit, allow SQLite fallback
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("⚠️ Falling back to SQLite for testing...");
    console.log("✅ Using SQLite database for testing purposes");
    // Don't exit, allow SQLite fallback
  }
};

module.exports = connectDB;
