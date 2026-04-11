const { loadEnv } = require("./env");
loadEnv();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL;

    if (!uri) {
      console.warn("MongoDB URI is missing - proceeding without MongoDB");
      return;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB connection warning:", error.message);
    console.warn("Proceeding without MongoDB - some features may be unavailable");
    // Don't exit - allow app to run with just SQLite
  }
};

module.exports = connectDB;
