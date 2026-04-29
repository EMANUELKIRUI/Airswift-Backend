/**
 * SERVER INTEGRATION GUIDE
 * 
 * Add these changes to your backend/server.js to enable all enterprise features
 */

// ====================================
// 1. ADD REQUIRED IMPORTS (at the top)
// ====================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');

// Enterprise features imports
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const stripeWebhookMiddleware = require('./middleware/stripeWebhookMiddleware');

// Route imports
const rankingRoutes = require('./routes/ranking');
const paymentRoutes = require('./routes/payment');
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applicationMongoose');

dotenv.config();

const app = express();
const server = http.createServer(app);

// ====================================
// 2. STRIPE WEBHOOK MIDDLEWARE (CRITICAL)
// ====================================
// This MUST be BEFORE express.json() to capture raw body
app.use(express.json({ verify: stripeWebhookMiddleware }));
app.use(express.urlencoded({ extended: true, verify: stripeWebhookMiddleware }));

// ====================================
// 3. SECURITY MIDDLEWARE
// ====================================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ====================================
// 4. SOCKET.IO WITH REDIS ADAPTER (OPTIONAL BUT RECOMMENDED)
// ====================================
let io;

(async () => {
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await pubClient.connect();
      await subClient.connect();

      io = socketIO(server, {
        cors: {
          origin: process.env.FRONTEND_URL,
          credentials: true,
        },
        adapter: createAdapter(pubClient, subClient),
      });

      console.log('✅ Socket.IO with Redis adapter initialized');
    } catch (error) {
      console.warn('⚠️  Redis connection failed, using default Socket.IO adapter:', error.message);
      io = socketIO(server, {
        cors: {
          origin: process.env.FRONTEND_URL,
          credentials: true,
        },
      });
    }
  } else {
    // Without Redis, only works on single server
    io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true,
      },
    });
  }

  // Socket.IO event handlers
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} connected: ${socket.id}`);
    }

    socket.on('notification', (data) => {
      io.to(data.userId).emit('notification', data);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  // Make io available to requests
  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  startServer();
})();

function startServer() {
  // ====================================
  // 5. ROUTE REGISTRATION (IN ORDER)
  // ====================================

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/applications', [
    rankingRoutes,           // Ranking endpoints
    applicationRoutes,       // Application CRUD endpoints
  ]);

  // ====================================
  // 6. ERROR HANDLING
  // ====================================
  app.use((err, req, res, next) => {
    console.error('Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    // Handle Stripe errors differently
    if (err.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        message: 'Stripe error: ' + err.message,
      });
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  // Not found handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // ====================================
  // 7. DATABASE CONNECTION
  // ====================================
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
🚀 Server running on port ${PORT}

✅ Enabled Features:
  - AI Ranking Dashboard
  - JWT Refresh Tokens
  - Redis Socket.IO Scaling
  - Granular RBAC
  - Stripe Payments
  - React Native support

📝 Environment:
  - Node: ${process.env.NODE_ENV || 'development'}
  - Mongo: ${process.env.MONGO_URI.substring(0, 20)}...
  - Redis: ${process.env.REDIS_URL ? 'Enabled' : 'Disabled'}
  - Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Enabled' : 'Not configured'}

🔗 API Endpoints:
  - POST /api/auth/login
  - POST /api/auth/refresh
  - GET  /api/applications/top-candidates
  - POST /api/payments/stripe/create-intent
  - POST /api/payments/stripe/webhook

📚 Documentation:
  - see ENTERPRISE_FEATURES_GUIDE.md
      `);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
}

// ====================================
// 8. GRACEFUL SHUTDOWN
// ====================================
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  if (io) {
    io.disconnectSockets();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
});

module.exports = app;
