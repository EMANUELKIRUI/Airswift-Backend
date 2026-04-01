const Joi = require('joi');
const { Payment } = require('../models');
const AfricasTalking = require('africastalking');

const credentials = {
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
};

const africasTalking = AfricasTalking(credentials);
const payments = africasTalking.PAYMENTS;

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  service_type: Joi.string().valid('premium', 'cv_boost', 'interview_fee', 'visa_fee').required(),
  phone_number: Joi.string().pattern(/^\+256\d{9}$|^\+255\d{9}$|^\+250\d{9}$|^\+257\d{9}$/).required(), // Uganda, Tanzania, Rwanda, Burundi
});

const initiatePayment = async (req, res) => {
  try {
    const { error } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { amount, service_type, phone_number } = req.body;

    // Create payment record
    const payment = await Payment.create({ ...req.body, user_id: req.user.id, status: 'pending' });

    // Initiate mobile money payment
    const options = {
      productName: 'Airswift',
      phoneNumber: phone_number,
      currencyCode: 'UGX', // or TZS, RWF, BIF based on country
      amount: amount,
      metadata: {
        payment_id: payment.id,
        service_type,
      },
    };

    const response = await payments.mobileCheckout(options);

    res.status(201).json({
      message: 'Payment prompt sent to your phone',
      payment,
      checkout: response,
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { payment_id } = req.body;

    const payment = await Payment.findByPk(payment_id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Check status
    if (payment.status === 'completed') {
      res.json({ message: 'Payment verified successfully', payment });
    } else {
      res.json({ message: 'Payment pending', payment });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
};