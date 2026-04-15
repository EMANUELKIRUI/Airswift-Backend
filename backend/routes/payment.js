const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// User routes
router.post('/initiate', auth, paymentController.initiatePayment);
router.get('/status/:paymentId', auth, paymentController.checkPaymentStatus);
router.get('/my-payments', auth, paymentController.getUserPayments);

// Admin routes
router.get('/', admin, paymentController.getAllPayments);
router.put('/:id/status', admin, paymentController.updatePaymentStatus);

// M-Pesa callback (no auth required)
router.post('/mpesa/callback', paymentController.mpesaCallback);

// Legacy routes for backward compatibility
router.post('/verify', auth, paymentController.checkPaymentStatus);
router.post('/callback', paymentController.mpesaCallback);
router.post('/pay', auth, paymentController.initiatePayment);

module.exports = router;