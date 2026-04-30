/**
 * Stripe Configuration
 * Initializes Stripe with the secret key from environment variables
 */

const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe;

if (!stripeSecretKey) {
  console.warn("Stripe is not configured: missing STRIPE_SECRET_KEY. Stripe payment routes will fail until the key is provided.");
  stripe = {
    paymentIntents: {
      create: async () => {
        throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable Stripe payments.");
      },
      retrieve: async () => {
        throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable Stripe payments.");
      },
    },
    webhooks: {
      constructEvent: () => {
        throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable Stripe webhooks.");
      },
    },
  };
} else {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16', // Use specific API version for consistency
    telemetry: false, // Disable telemetry for performance
  });
}

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
