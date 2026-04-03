const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://airswift-frontend.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // limit requests
  message: "Too many requests, try again later"
});

app.use(limiter);

// Specific limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, try again later"
});

app.use("/api/auth/login", loginLimiter);

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/auth/google", require("./routes/googleAuth"));
app.use("/api/auth-status", require("./routes/authStatus"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/admin", require("./routes/admin"));

app.listen(5000, () => console.log("Server running on port 5000"));