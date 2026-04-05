const express = require('express');
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/initiate', verifyToken, paymentController.initiatePayment);
router.post('/verify', verifyToken, paymentController.verifyPayment);
router.post('/callback', paymentController.paymentCallback);
router.post('/pay', verifyToken, paymentController.makePayment);

module.exports = router;