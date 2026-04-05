require("dotenv").config();
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

    await mongoose.connect(uri);

    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB connection warning:", error.message);
    console.warn("Proceeding without MongoDB - some features may be unavailable");
    // Don't exit - allow app to run with just SQLite
  }
};

module.exports = connectDB;
