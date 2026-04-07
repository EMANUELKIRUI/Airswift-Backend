const router = require('express').Router();

// Simple endpoint to check if authentication is properly configured
router.get('/status', (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    checks: {
      database: process.env.DB_HOST ? '✓ Configured' : '✗ Missing DB_HOST',
      jwt: process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing JWT_SECRET',
      email_service: {
        email_host: process.env.EMAIL_HOST ? '✓ Configured' : '✗ Missing EMAIL_HOST',
        email_user: process.env.EMAIL_USER ? '✓ Configured' : '✗ Missing EMAIL_USER',
        email_pass: process.env.EMAIL_PASS ? '✓ Configured' : '✗ Missing EMAIL_PASS',
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
