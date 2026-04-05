const router = require('express').Router();

// Simple endpoint to check if authentication is properly configured
router.get('/status', (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    checks: {
      database: process.env.DB_HOST ? '✓ Configured' : '✗ Missing DB_HOST',
      jwt: process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing JWT_SECRET',
      local_auth: {
        smtp_host: process.env.SMTP_HOST ? '✓ Configured' : '✗ Missing SMTP_HOST',
        smtp_port: process.env.SMTP_PORT ? '✓ Configured' : '✗ Missing SMTP_PORT',
        smtp_user: process.env.SMTP_USER ? '✓ Configured' : '✗ Missing SMTP_USER',
        smtp_pass: process.env.SMTP_PASS ? '✓ Configured' : '✗ Missing SMTP_PASS',
        from_email: process.env.FROM_EMAIL ? '✓ Configured' : '✗ Missing FROM_EMAIL',
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
