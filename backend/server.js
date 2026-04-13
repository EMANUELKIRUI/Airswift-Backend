const { loadEnv } = require("./config/env");
loadEnv();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const sequelize = require("./config/database");
const connectDB = require("./config/db");
const { askAI, analyzeVoiceResponse, generateInterviewSummary } = require("./utils/voiceInterview");
const { analyzeSpeech, streamElevenLabsTTS } = require("./controllers/speechController");
const jwt = require("jsonwebtoken");
const { User } = require("./models");
const { findUserByEmail, createUser } = require("./utils/userHelpers");

// Connect to MongoDB
connectDB();

const { createAdminIfNotExists } = require("./utils/adminSetup");
const { initializeSocket } = require("./utils/socketEmitter");
const { setSocketInstance } = require("./utils/logger");
const maintenanceMode = require('./middleware/maintenanceMode');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = new Server(server, {
  path: "/api/socket",
  cors: {
    origin: "*",
  }
});

// Expose socket.io globally for legacy emitters and services
global.io = io;

// Initialize Socket.io emitter utility
initializeSocket(io);
setSocketInstance(io);

// Initialize System Health Monitor
const healthMonitor = require('./services/systemHealthMonitor');
healthMonitor.startMonitoring(5000); // Monitor every 5 seconds

// Socket.io for WebRTC video interviews and applicant tracking
const interviewRooms = new Map();
const adminSessions = new Map(); // Track active admin connections for real-time updates
const voiceInterviewSessions = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Not authenticated'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  if (socket.user?.role === 'admin') {
    socket.join('admins');
    console.log(`Admin socket ${socket.id} joined admins room`);
  }

  // 👨‍💼 ADMIN APPLICANT TRACKING EVENTS
  
  // Admin joins tracking dashboard
  socket.on("admin-connect", ({ adminId, userId }) => {
    if (socket.user.role !== 'admin' || socket.user.id !== adminId) {
      return socket.emit('socket-error', { message: 'Admin authentication required' });
    }

    adminSessions.set(socket.id, { adminId, userId, connectedAt: new Date() });
    console.log(`Admin ${adminId} connected to tracking dashboard - Socket: ${socket.id}`);
    
    socket.emit("admin-connected", {
      message: "Connected to applicant tracking dashboard",
      socketId: socket.id
    });
  });

  socket.on("joinRoom", ({ userId }) => {
    if (!userId) {
      return socket.emit('socket-error', { message: 'userId is required to join a room' });
    }

    if (socket.user.role !== 'admin' && socket.user.id !== userId) {
      return socket.emit('socket-error', { message: 'Unauthorized room access' });
    }

    const roomName = `user_${userId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room ${roomName}`);
  });

  socket.on("joinAdminRoom", ({ adminId }) => {
    if (!adminId) {
      return socket.emit('socket-error', { message: 'adminId is required to join admin room' });
    }

    if (socket.user.role !== 'admin' || socket.user.id !== adminId) {
      return socket.emit('socket-error', { message: 'Unauthorized admin room access' });
    }

    const roomName = `admin_${adminId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room ${roomName}`);
  });

  socket.on("joinUserRoom", ({ userId }) => {
    if (!userId) {
      return socket.emit('socket-error', { message: 'userId is required to join user room' });
    }

    if (socket.user.id !== userId) {
      return socket.emit('socket-error', { message: 'Unauthorized user room access' });
    }

    const roomName = `user_${userId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined user room ${roomName}`);
  });

  // Broadcast applicant status update to all admins
  socket.on("applicant-status-changed", (data) => {
    console.log(`Applicant status changed:`, data);
    io.emit("applicationUpdate", {
      applicationId: data.applicationId,
      status: data.status,
      timestamp: new Date(),
      updatedBy: data.adminId,
      applicantName: data.applicantName,
      jobTitle: data.jobTitle
    });
  });

  // New application received
  socket.on("new-application", (data) => {
    console.log(`New application received:`, data);
    io.emit("newApplication", {
      applicationId: data.applicationId,
      applicantName: data.applicantName,
      jobTitle: data.jobTitle,
      email: data.email,
      timestamp: new Date()
    });
  });

  // 🎤 VOICE INTERVIEW EVENTS

  // Start AI Voice Interview
  socket.on("start-voice-interview", async ({ sessionId, jobRole, candidateName }) => {
    try {
      let session = voiceInterviewSessions.get(sessionId);

      if (!session) {
        sessionId = sessionId || `voice_${socket.user.id}_${Date.now()}`;
        session = {
          sessionId,
          userId: socket.user.id,
          jobRole: jobRole || 'Unknown Role',
          candidateName: candidateName || socket.user.name || 'Candidate',
          conversation: [],
          startTime: new Date(),
          status: 'active'
        };
      }

      if (session.userId !== socket.user.id && socket.user.role !== 'admin') {
        return socket.emit('voice-interview-error', { message: 'Unauthorized session access' });
      }

      voiceInterviewSessions.set(sessionId, session);

      const firstQuestion = await askAI(session.conversation, `Start a job interview for ${session.jobRole} position. Ask the first question to ${session.candidateName}.`);

      session.conversation.push({ role: 'assistant', content: firstQuestion, timestamp: new Date() });

      socket.emit("voice-interview-started", {
        sessionId,
        firstQuestion,
        message: "Voice interview started. Please speak your answer."
      });

      console.log(`Voice interview started for ${session.jobRole} - Session: ${sessionId}`);
    } catch (error) {
      console.error("Voice interview start error:", error);
      socket.emit("voice-interview-error", {
        message: "Failed to start voice interview",
        error: error.message
      });
    }
  });

  // Handle voice response (transcript from frontend)
  socket.on("voice-response", async ({ sessionId, transcript, audioData }) => {
    try {
      const session = voiceInterviewSessions.get(sessionId);
      if (!session || session.status !== 'active') {
        socket.emit("voice-interview-error", { message: "Invalid or inactive session" });
        return;
      }

      if (session.userId !== socket.user.id && socket.user.role !== 'admin') {
        socket.emit("voice-interview-error", { message: "Unauthorized session access" });
        return;
      }

      // Add candidate response to conversation
      session.conversation.push({
        role: 'user',
        content: transcript,
        timestamp: new Date()
      });

      // Analyze the response
      const analysis = await analyzeVoiceResponse(transcript, session.conversation);

      // Generate next question or continue conversation
      const nextPrompt = `Based on the candidate's response: "${transcript}"
      Analysis: Confidence: ${analysis.confidence_score}/100, Clarity: ${analysis.clarity_score}/100, Rating: ${analysis.communication_rating}

      ${session.conversation.length > 6 ? 'This is getting towards the end of the interview. Ask a final question or wrap up.' : 'Continue with the next relevant question.'}`;

      const nextQuestion = await askAI(session.conversation, nextPrompt);

      // Add AI response to conversation
      session.conversation.push({
        role: 'assistant',
        content: nextQuestion,
        timestamp: new Date()
      });

      socket.emit("voice-response-processed", {
        sessionId,
        nextQuestion,
        analysis,
        conversationLength: session.conversation.length
      });

    } catch (error) {
      console.error("Voice response processing error:", error);
      socket.emit("voice-interview-error", {
        message: "Failed to process voice response",
        error: error.message
      });
    }
  });

  // End voice interview and generate summary
  socket.on("end-voice-interview", async ({ sessionId }) => {
    try {
      const session = voiceInterviewSessions.get(sessionId);
      if (!session) {
        socket.emit("voice-interview-error", { message: "Session not found" });
        return;
      }

      if (session.userId !== socket.user.id && socket.user.role !== 'admin') {
        socket.emit("voice-interview-error", { message: "Unauthorized session access" });
        return;
      }

      session.status = 'completed';
      session.endTime = new Date();

      // Generate interview summary
      const summary = await generateInterviewSummary(session.conversation, session.jobRole);

      socket.emit("voice-interview-completed", {
        sessionId,
        summary,
        conversation: session.conversation,
        duration: session.endTime - session.startTime
      });

      // Clean up session after delay
      setTimeout(() => {
        voiceInterviewSessions.delete(sessionId);
      }, 300000); // Keep for 5 minutes

      console.log(`Voice interview completed - Session: ${sessionId}`);
    } catch (error) {
      console.error("Voice interview end error:", error);
      socket.emit("voice-interview-error", {
        message: "Failed to complete interview",
        error: error.message
      });
    }
  });

  // Get interview status
  socket.on("get-voice-interview-status", ({ sessionId }) => {
    const session = voiceInterviewSessions.get(sessionId);
    if (session) {
      socket.emit("voice-interview-status", {
        sessionId,
        status: session.status,
        conversationLength: session.conversation.length,
        startTime: session.startTime
      });
    } else {
      socket.emit("voice-interview-error", { message: "Session not found" });
    }
  });

  // 🎥 WEBRTC VIDEO INTERVIEW EVENTS (existing functionality)

  // Join interview room
  socket.on("join-interview", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Notify others in room
    socket.to(roomId).emit("user-joined", { userId: socket.id });

    // Store room info
    if (!interviewRooms.has(roomId)) {
      interviewRooms.set(roomId, new Set());
    }
    interviewRooms.get(roomId).add(socket.id);
  });

  // WebRTC signaling
  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      from: socket.id,
    });
  });

  socket.on("answer", (data) => {
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      from: socket.id,
    });
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  // Interview events
  socket.on("start-interview", (roomId) => {
    io.to(roomId).emit("interview-started");
  });

  socket.on("end-interview", (roomId) => {
    io.to(roomId).emit("interview-ended");
  });

  // Screen sharing
  socket.on("screen-share-start", (data) => {
    socket.to(data.roomId).emit("screen-share-started", { from: socket.id });
  });

  socket.on("screen-share-end", (data) => {
    socket.to(data.roomId).emit("screen-share-ended", { from: socket.id });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove from all rooms
    interviewRooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit("user-left", { userId: socket.id });

        // Clean up empty rooms
        if (users.size === 0) {
          interviewRooms.delete(roomId);
        }
      }
    });
  });
});

(async () => {
  try {
    // Try to connect to SQL database (optional)
    try {
      await sequelize.authenticate();
      console.log("✅ Database connected");
      
      // Sync database models and apply safe alterations for new settings fields
      await sequelize.sync({ force: false, alter: true });
      console.log("✅ Database synced");
    } catch (dbError) {
      console.warn("⚠️  Database connection failed:", dbError.message);
      console.warn("⚠️  Continuing without SQL database - some features may be limited");
    }

    if (!process.env.BREVO_API_KEY) {
      console.log("❌ Email not configured (Brevo API key missing)");
    } else {
      console.log("✅ Email service ready (Brevo)");
    }

    // Create admin user if environment variables are set
    await createAdminIfNotExists();
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
})();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://airswift-frontend.vercel.app";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
  })
);
app.options("*", cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json());
app.set('io', io);
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use(maintenanceMode);

// Serve static files from root directory
app.use(express.static('../'));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is healthy' });
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API test route
app.get('/api/test', (req, res) => {
  res.json({ message: "API is working!", timestamp: new Date().toISOString() });
});

// Speech analysis endpoint for real-time interview insights
app.post('/api/analyze-speech', analyzeSpeech);
app.post('/api/tts', streamElevenLabsTTS);

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 min
//   max: 100, // limit requests
//   message: "Too many requests, try again later"
// });

// app.use(limiter);

// Specific limiter for login
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5,
//   message: "Too many login attempts, try again later"
// });

// app.use("/api/auth/login", loginLimiter);

// routes
// app.use("/api/auth/google", require("./routes/googleAuth"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin/audit-logs", require("./routes/audit"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/job-search", require("./routes/jobSearch"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/applications/mongo", require("./routes/applicationMongoose"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/drafts", require("./routes/drafts"));
app.use("/drafts", require("./routes/drafts"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/about", require("./routes/about"));
app.use("/api/auth-status", require("./routes/authStatus"));
app.use("/api/users", require("./routes/users"));
app.use("/api/interviews", require("./routes/interviews"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/admin/audit", require("./routes/audit"));
app.use("/api/user-activity-audit", require("./routes/userActivityAudit"));
app.use("/api/system-health", require("./routes/systemHealth"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/email", require("./routes/email"));

// Global error handler for unexpected failures
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({
    message: err?.message || 'Server error',
  });
});

// Test route for OTP
app.post("/api/test-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000);

    await sendOTPEmail(email, otp);

    console.log("OTP sent:", otp);

    res.json({
      success: true,
      message: "OTP sent successfully",
      otp, // remove in production
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Simple Brevo test route alias
app.get('/test-email', async (req, res) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      return res.json({
        success: false,
        error: 'Brevo API key missing',
        message: 'Email not configured (Brevo API key missing)'
      });
    }

    const success = await sendEmail(
      'your@email.com',
      'Test Email',
      '<h1>Brevo is working ✅</h1>'
    );
    res.json({ success });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: 'Test email failed', details: error.message });
  }
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} with WebSocket support`));

// Export io for use in controllers
module.exports = { app, server, io };