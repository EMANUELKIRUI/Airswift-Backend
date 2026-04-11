const path = require("path");
const fs = require("fs");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");

  if (process.env.NODE_ENV !== "production") {
    if (fs.existsSync(envPath)) {
      require("dotenv").config({ path: envPath });
      console.log(`Loaded environment variables from ${envPath}`);
    } else {
      console.warn(`Local .env file not found at ${envPath}; using process.env only`);
    }
  } else {
    console.log("NODE_ENV=production: skipping local .env load");
  }

  const requiredVars = [
    "JWT_SECRET",
    "BREVO_API_KEY",
    "SENDER_EMAIL",
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(", ")}`);
  }
}

module.exports = { loadEnv };
