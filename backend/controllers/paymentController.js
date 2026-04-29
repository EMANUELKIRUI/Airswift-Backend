const Payment = require('../models/Payment');
const Application = require('../models/Application');
const User = require('../models/User');
const mpesaService = require('../utils/mpesaService');
const auditLogger = require('../utils/auditLogger');
const { sendEmail } = require('../utils/sendEmail');
const { paymentReceiptTemplate } = require('../utils/emailTemplates');

// Initiate M-Pesa STK Push payment
const stkPush = async (req, res) => {
  try {
    console.log("📥 Payment request received");

    res.json({
      success: true,
      message: "Payment initiated"
    });

  } catch (error) {
    console.error("❌ Payment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Check payment status
const checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if payment belongs to user (unless admin)
    if (req.user.role !== 'admin' && payment.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If payment is still pending and has checkout request ID, query M-Pesa
    if (payment.status === 'pending' && payment.checkoutRequestId) {
      const queryResult = await mpesaService.querySTKPush(payment.checkoutRequestId);

      if (queryResult.success && queryResult.resultCode === '0') {
        // Payment successful
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();

        // Send confirmation email
        const user = await User.findById(payment.user_id);
        if (user && user.email) {
          await sendEmail(
            user.email,
            'Payment Confirmation',
            `Your payment of KES ${payment.amount} has been received successfully. Transaction ID: ${payment.transactionId}`
          );
        }

        // Emit real-time payment success to the user room
        if (req.io) {
          req.io.to(req.user.id.toString()).emit('payment_success', {
            userId: req.user.id,
            amount: payment.amount,
            status: payment.status,
            paymentId: payment.id || payment._id
          });
        }

        // Log successful payment
        await auditLogger.logAction(
          payment.user_id,
          'PAYMENT_COMPLETED',
          `Payment completed: KES ${payment.amount}`,
          req.ip,
          { paymentId: payment.id || payment._id, transactionId: payment.transactionId }
        );
      } else if (queryResult.success && queryResult.resultCode !== '0') {
        // Payment failed
        payment.status = 'failed';
        await payment.save();

        // Log failed payment
        await auditLogger.logAction(
          payment.user_id,
          'PAYMENT_FAILED',
          `Payment failed: ${queryResult.resultDesc}`,
          req.ip,
          { paymentId: payment.id || payment._id, resultCode: queryResult.resultCode }
        );
      }
    }

    res.json({
      payment: {
        id: payment.id || payment._id,
        amount: payment.amount,
        status: payment.status,
        method: 'mpesa',
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt
      }
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ message: 'Failed to check payment status' });
  }
};

// M-Pesa callback handler
const mpesaCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log('M-Pesa Callback received:', JSON.stringify(callbackData, null, 2));

    const result = mpesaService.handleCallback(callbackData);

    if (result.success) {
      // Find payment by checkout request ID
      const payment = await Payment.findOne({ where: { checkoutRequestId: result.checkoutRequestId } });

      if (payment) {
        // Update payment with transaction details
        payment.status = 'completed';
        payment.completedAt = new Date();
        payment.receiptNumber = result.transactionData.receiptNumber;
        payment.transactionDate = result.transactionData.transactionDate;
        await payment.save();

        // Send confirmation email
        const user = await User.findById(payment.user_id);
        if (user && user.email) {
          const emailSent = await sendEmail(
            user.email,
            'Payment Receipt - Airswift',
            paymentReceiptTemplate({
              name: user.name || 'Applicant',
              amount: payment.amount,
              receipt: payment.receiptNumber || result.transactionData.receiptNumber,
            })
          );

          if (emailSent) {
            payment.emailSent = true;
            await payment.save();
          }
        }

        // Emit real-time payment success to the user room
        if (global.io && payment.user_id) {
          global.io.to(payment.user_id.toString()).emit('payment_success', {
            userId: payment.user_id,
            amount: payment.amount,
            status: payment.status,
            paymentId: payment.id || payment._id
          });
        }

        // Log successful payment
        await auditLogger.logAction(
          payment.user_id,
          'PAYMENT_COMPLETED_CALLBACK',
          `Payment completed via callback: KES ${payment.amount}`,
          req.ip,
          {
            paymentId: payment.id || payment._id,
            receiptNumber: payment.receiptNumber,
            transactionId: payment.transactionId
          }
        );
      }
    } else {
      // Find payment and mark as failed
      const payment = await Payment.findOne({ where: { checkoutRequestId: result.checkoutRequestId } });
      if (payment) {
        payment.status = 'failed';
        await payment.save();

        // Log failed payment
        await auditLogger.logAction(
          payment.user_id,
          'PAYMENT_FAILED_CALLBACK',
          `Payment failed via callback: ${result.resultDesc}`,
          req.ip,
          { paymentId: payment.id || payment._id, resultCode: result.resultCode }
        );
      }
    }

    // Always respond with success to M-Pesa
    res.status(200).json({ message: 'Callback processed successfully' });
  } catch (error) {
    console.error('M-Pesa callback processing error:', error);
    // Still respond with success to avoid retries
    res.status(200).json({ message: 'Callback received but processing failed' });
  }
};

// Get user's payments
const getUserPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.id })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

/**
 * Create Stripe Payment Intent
 * POST /api/payment/stripe/intent
 */
const createStripePaymentIntent = async (req, res) => {
  try {
    const { amount, paymentType, description } = req.body;
    const stripe = require("../config/stripe");

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!paymentType) {
      return res.status(400).json({ message: "Payment type is required" });
    }

    const user = req.user;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      metadata: {
        userId: user.id,
        paymentType,
        userEmail: user.email,
      },
      description: description || `${paymentType} for ${user.name}`,
    });

    // Save pending payment to database
    const payment = await Payment.create({
      user_id: user.id,
      amount,
      service_type: paymentType,
      status: "pending",
      checkoutRequestId: paymentIntent.id,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      paymentType,
      paymentId: payment._id || payment.id,
    });
  } catch (error) {
    console.error("Stripe payment intent error:", error);
    res.status(500).json({
      message: "Failed to create payment intent",
      error: error.message,
    });
  }
};

/**
 * Confirm Stripe Payment
 * POST /api/payment/stripe/confirm
 */
const confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId, paymentId } = req.body;
    const stripe = require("../config/stripe");

    if (!paymentIntentId || !paymentId) {
      return res.status(400).json({ message: "Payment intent ID and payment ID are required" });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: "Payment not completed",
        status: paymentIntent.status,
      });
    }

    // Update payment status in database
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: "completed",
        completedAt: new Date(),
        transactionId: paymentIntent.id,
      },
      { new: true }
    );

    // Send confirmation email
    const user = await User.findById(req.user.id);
    if (user && user.email) {
      await sendEmail(
        user.email,
        "Payment Confirmation - Airswift",
        `<h2>Payment Received</h2>
        <p>Your payment of $${payment.amount} has been received successfully.</p>
        <p>Transaction ID: ${paymentIntent.id}</p>
        <p>Thank you!</p>`
      );
    }

    // Emit real-time payment success
    if (global.io && req.user.id) {
      global.io.to(`user_${req.user.id}`).emit("payment_success", {
        userId: req.user.id,
        amount: payment.amount,
        status: payment.status,
        paymentId: payment._id || payment.id,
      });
    }

    // Log successful payment
    await auditLogger.logAction(
      req.user.id,
      "STRIPE_PAYMENT_COMPLETED",
      `Stripe payment completed: $${payment.amount}`,
      req.ip,
      { paymentId: payment._id || payment.id, transactionId: paymentIntent.id }
    );

    res.json({
      message: "Payment confirmed successfully",
      payment,
    });
  } catch (error) {
    console.error("Stripe payment confirmation error:", error);
    res.status(500).json({
      message: "Failed to confirm payment",
      error: error.message,
    });
  }
};

/**
 * Get Payment Details
 * GET /api/payment/stripe/:paymentId
 */
const getStripePaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const stripe = require("../config/stripe");

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Check authorization
    if (payment.user_id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Retrieve payment intent from Stripe
    if (payment.checkoutRequestId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(payment.checkoutRequestId);

      res.json({
        payment,
        stripeDetails: {
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          created: paymentIntent.created,
        },
      });
    } else {
      res.json({ payment });
    }
  } catch (error) {
    console.error("Get payment error:", error);
    res.status(500).json({
      message: "Failed to fetch payment details",
      error: error.message,
    });
  }
};

// Get all payments (admin only) with pagination
const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    
    // Add search functionality if needed
    if (search) {
      query = {
        $or: [
          { 'userId.name': { $regex: search, $options: 'i' } },
          { 'userId.email': { $regex: search, $options: 'i' } },
          { transactionId: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const payments = await Payment.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching all payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

// Update payment status (admin only)
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const oldStatus = payment.status;
    payment.status = status;
    if (status === 'completed' && !payment.completedAt) {
      payment.completedAt = new Date();
    }
    await payment.save();

    // Log status update
    await auditLogger.logAction(
      req.user.id,
      'PAYMENT_STATUS_UPDATE',
      `Payment status updated from ${oldStatus} to ${status}`,
      req.ip,
      { paymentId: payment._id, oldStatus, newStatus: status }
    );

    res.json({ message: 'Payment status updated', payment });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Failed to update payment status' });
  }
};

module.exports = {
  stkPush,
  checkPaymentStatus,
  mpesaCallback,
  getUserPayments,
  getAllPayments,
  updatePaymentStatus,
  createStripePaymentIntent,
  confirmStripePayment,
  getStripePaymentDetails,
};
