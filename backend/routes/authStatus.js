const router = require('express').Router();

// Simple endpoint to check if authentication is properly configured
router.get('/status', (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    checks: {
      database: process.env.DB_HOST ? '✓ Configured' : '✗ Missing DB_HOST',
      jwt: process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing JWT_SECRET',
      email_service: {
        brevo_api_key: process.env.BREVO_API_KEY ? '✓ Configured' : '✗ Missing BREVO_API_KEY',
        sender_email: process.env.SENDER_EMAIL ? '✓ Configured' : '✗ Missing SENDER_EMAIL',
      },
    },
    auth_methods: {
      local_email: 'Available - /api/auth/register, /api/auth/login',
    },
  };

  res.json(status);
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
