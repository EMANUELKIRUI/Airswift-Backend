const { loadEnv } = require("./env");
loadEnv();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    const envDatabaseUrl = process.env.DATABASE_URL;
    const uri = mongoUri || (envDatabaseUrl && envDatabaseUrl.startsWith('mongodb') ? envDatabaseUrl : null);

    if (!uri) {
      console.error("MongoDB URI is missing or not a MongoDB connection string. MongoDB is required.");
      process.exit(1);
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("MongoDB is required. Exiting.");
    process.exit(1);
  }
};

module.exports = connectDB;
