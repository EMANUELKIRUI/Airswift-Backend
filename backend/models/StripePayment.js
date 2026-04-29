const mongoose = require('mongoose');

const stripePaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true, // in dollars
    },
    type: {
      type: String,
      enum: ['interview_fee', 'visa_fee', 'service_fee'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'canceled'],
      default: 'pending',
    },
    // Stripe payment intent reference
    stripePaymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    stripeCustomerId: String,
    
    // Invoice details
    invoiceId: String,
    invoiceUrl: String,
    receiptUrl: String,
    
    // Metadata
    description: String,
    metadata: mongoose.Schema.Types.Mixed,
    
    // Payment details
    paymentMethod: String,
    last4Digits: String,
    
    // Error tracking
    failureReason: String,
    failureCode: String,
    
    completedAt: Date,
    failedAt: Date,
  },
  { timestamps: true }
);

// Index for faster lookups
stripePaymentSchema.index({ user: 1, createdAt: -1 });
stripePaymentSchema.index({ stripePaymentIntentId: 1 });
stripePaymentSchema.index({ status: 1 });

module.exports = mongoose.model('StripePayment', stripePaymentSchema);
