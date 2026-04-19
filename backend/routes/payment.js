const express = require('express');
const router = express.Router();

const { stkPush } = require('../controllers/paymentController');
const { verifyToken, protect } = require('../middleware/auth');

console.log("TYPE OF stkPush:", typeof stkPush);

router.post('/pay', verifyToken, stkPush); // ✅ Protected with authentication

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

module.exports = router;