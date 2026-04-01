const Joi = require('joi');
const { Payment } = require('../models');

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  service_type: Joi.string().valid('premium', 'cv_boost', 'interview_fee', 'visa_fee').required(),
});

const initiatePayment = async (req, res) => {
  try {
    const { error } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Placeholder for payment integration (e.g., Stripe, PayPal)
    const payment = await Payment.create({ ...req.body, user_id: req.user.id });

    res.status(201).json({ message: 'Payment initiated', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    // Placeholder for payment verification
    const { payment_id } = req.body;

    const payment = await Payment.findByPk(payment_id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // Update status
    await Payment.update({ status: 'completed' }, { where: { id: payment_id } });

    res.json({ message: 'Payment verified' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
};