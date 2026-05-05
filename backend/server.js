require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const { createDefaultAdmin } = require('./utils/adminSeed');

const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Middleware
const authMiddleware = require('./middleware/authMiddleware');

// Routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');

const app = express();

// Middleware - Configure CORS to handle credentials
const corsOptions = {
  origin: [
    'https://airswift-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'AIRSWIFT MVP RUNNING' });
});

app.get('/api/health', (req, res) => {
  res.json({ message: "Server is healthy" });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Database sync and start server
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(async () => {
  console.log('✓ Database synced');
  try {
    await createDefaultAdmin();
    console.log('✓ Default admin check complete');
  } catch (error) {
    console.error('✗ Default admin creation failed:', error);
  }

  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('✗ Database sync failed:', err);
  process.exit(1);
});

module.exports = { app };
