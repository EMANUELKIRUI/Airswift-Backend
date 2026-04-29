/**
 * Stripe Webhook Middleware
 * Captures raw body for Stripe signature verification
 * This MUST be applied BEFORE express.json() middleware
 */

module.exports = (req, res, buffer) => {
  if (req.path === '/api/payments/stripe/webhook') {
    // Store raw body for Stripe webhook signature verification
    req.rawBody = buffer.toString('utf8');
  }
};
