const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const sequelize = require("./config/database");
const { askAI, analyzeVoiceResponse, generateInterviewSummary } = require("./utils/voiceInterview");
const { analyzeSpeech, streamElevenLabsTTS } = require("./controllers/speechController");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    let user = await User.findOne({ where: { email } });

    if (!user) {
      user = await User.create({
        name: profile.displayName,
        email,
        password: null,
        googleId: profile.id
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Socket.io for WebRTC video interviews
const interviewRooms = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Voice Interview Sessions Storage
  const voiceInterviewSessions = new Map();

  // 🎤 VOICE INTERVIEW EVENTS

  // Start AI Voice Interview
  socket.on("start-voice-interview", async ({ jobRole, candidateName }) => {
    try {
      const sessionId = `voice_${socket.id}_${Date.now()}`;
      const conversation = [];

      // Generate first question
      const firstQuestion = await askAI(conversation, `Start a job interview for ${jobRole} position. Ask the first question to ${candidateName || 'the candidate'}.`);

      voiceInterviewSessions.set(sessionId, {
        jobRole,
        candidateName: candidateName || 'Anonymous',
        conversation,
        startTime: new Date(),
        status: 'active'
      });

      socket.emit("voice-interview-started", {
        sessionId,
        firstQuestion,
        message: "Voice interview started. Please speak your answer."
      });

      console.log(`Voice interview started for ${jobRole} - Session: ${sessionId}`);
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
    await sequelize.authenticate();
    console.log("Database connected");
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log("Database synced");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
})();

app.use(cookieParser());
app.use(cors({
  origin: "https://airswift-frontend.vercel.app",
  credentials: true
}));
app.use(passport.initialize());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Speech analysis endpoint for real-time interview insights
app.post('/api/analyze-speech', analyzeSpeech);
app.post('/api/tts', streamElevenLabsTTS);

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
app.use("/api/admin", require("./routes/admin"));
app.use("/api/interviews", require("./routes/interviews"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/audit", require("./routes/audit"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT} with WebSocket support`));