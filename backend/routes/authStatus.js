const router = require('express').Router();

// Simple endpoint to check if authentication is properly configured
router.get('/status', (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    checks: {
      database: process.env.DB_HOST ? '✓ Configured' : '✗ Missing DB_HOST',
      jwt: process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing JWT_SECRET',
      google_oauth: {
        client_id: process.env.GOOGLE_CLIENT_ID ? '✓ Configured' : '✗ Missing GOOGLE_CLIENT_ID',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ? '✓ Configured' : '✗ Missing GOOGLE_CLIENT_SECRET',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI ? '✓ Configured' : '✗ Missing GOOGLE_REDIRECT_URI',
      },
      local_auth: {
        brevo_api_key: process.env.BREVO_API_KEY ? '✓ Configured' : '✗ Missing BREVO_API_KEY (email)',
      },
    },
    auth_methods: {
      local_email: 'Available - /api/auth/register, /api/auth/login',
      google_oauth: 'Available - /api/auth/google/url, /api/auth/google/callback',
    },
  };

  res.json(status);
});

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
