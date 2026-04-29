const express = require('express');
const router = express.Router();

const {
  stkPush,
  getAllPayments,
  createPaymentIntent,
  getPayment,
  getPaymentHistory,
  handleWebhook,
  cancelPayment,
  generateInvoice,
} = require('../controllers/paymentController');
const { verifyToken, protect, permit } = require('../middleware/auth');
const auth = require('../middleware/auth');

console.log("TYPE OF stkPush:", typeof stkPush);

router.post('/pay', verifyToken, stkPush); // ✅ Protected with authentication

// Get all payments (admin only)
router.get('/', protect, permit('view_payments'), getAllPayments);

// M-Pesa STK Push initiation
router.post('/initiate', protect, async (req, res) => {
  try {
    const { amount, phone, description } = req.body;
    const userId = req.user.id;

    // Validate user is approved for payment
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user || (user.applicationStatus !== 'approved' && user.applicationStatus !== 'accepted')) {
      return res.status(403).json({ message: 'Payment not allowed at current application status' });
    }

    // Initiate M-Pesa payment
    const paymentResponse = await stkPush({
      body: {
        amount: amount || 30000,
        phoneNumber: phone || user.phone,
        accountReference: `Visa-${userId}`,
        transactionDesc: description || 'Visa Processing Fee'
      },
      user: req.user
    });

    res.json({
      success: true,
      message: 'Payment initiated',
      checkoutRequestId: paymentResponse.checkoutRequestId
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ message: 'Failed to initiate payment' });
  }
});

// M-Pesa callback endpoint
router.post('/callback', async (req, res) => {
  try {
    const result = req.body.Body?.stkCallback;

    if (!result) {
      return res.sendStatus(400);
    }

    if (result.ResultCode === 0) {
      const phone = result.CallbackMetadata?.Item?.find(item => item.Name === 'PhoneNumber')?.Value;

      if (phone) {
        // Find user by phone and update status to paid
        const User = require('../models/User');
        const user = await User.findOneAndUpdate(
          { phone },
          { applicationStatus: 'paid' },
          { new: true }
        );

        if (user) {
          // Emit real-time update
          const io = require('../utils/socket').getIO();
          io.to(user._id.toString()).emit('statusUpdate', { status: 'paid' });

          console.log(`Payment successful for user ${user._id}, status updated to paid`);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.sendStatus(500);
  }
});

// ============================================
// STRIPE PAYMENT ROUTES
// ============================================

/**
 * Create payment intent
 * POST /api/payments/stripe/create-intent
 */
router.post('/stripe/create-intent', auth, createPaymentIntent);

/**
 * Get payment details
 * GET /api/payments/stripe/:paymentId
 */
router.get('/stripe/:paymentId', auth, getPayment);

/**
 * Get payment history
 * GET /api/payments/stripe/history
 */
router.get('/stripe/history', auth, getPaymentHistory);

/**
 * Cancel payment
 * POST /api/payments/stripe/:paymentId/cancel
 */
router.post('/stripe/:paymentId/cancel', auth, cancelPayment);

/**
 * Generate invoice
 * POST /api/payments/stripe/:paymentId/invoice
 */
router.post('/stripe/:paymentId/invoice', auth, generateInvoice);

/**
 * Stripe webhook handler
 * POST /api/payments/stripe/webhook
 * Note: This should NOT have the `auth` middleware since Stripe needs to hit this endpoint directly
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;