/**
 * Stripe Configuration
 * Initializes Stripe with the secret key from environment variables
 */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use specific API version for consistency
  telemetry: false, // Disable telemetry for performance
});

/**
 * Verify Stripe webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - Stripe signature header
 * @param {string} secret - Webhook secret
 * @returns {object} Parsed event
 */
const verifyWebhookSignature = (body, signature, secret) => {
  return stripe.webhooks.constructEvent(body, signature, secret);
};

module.exports = stripe;
module.exports.verifyWebhookSignature = verifyWebhookSignature;
