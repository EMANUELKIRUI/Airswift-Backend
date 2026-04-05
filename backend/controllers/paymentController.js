const Joi = require('joi');
const { Payment, Application, User } = require('../models');
const { sendEmail, sendStageEmail } = require('../utils/notifications');

let payments = null;
const credentials = {
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
};

if (credentials.apiKey && credentials.username) {
  try {
    const AfricasTalking = require('africastalking');
    const Common = require('africastalking/lib/common');
    const africasTalking = AfricasTalking(credentials);
    payments = africasTalking.PAYMENTS;
    global.AFRICAS_COMMON = Common;
  } catch (error) {
    console.warn('AfricasTalking initialization skipped: missing or invalid credentials', error.message);
  }
}

// Fallback: if AfricasTalking is not usable, `payments` remains null and code will use createCheckoutToken()

const createCheckoutToken = async (options) => {
  const Common = global.AFRICAS_COMMON || require('africastalking/lib/common');
  const response = await fetch(Common.CHECKOUT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apiKey: credentials.apiKey,
    },
    body: JSON.stringify({ username: credentials.username, ...options }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Checkout token creation failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
};

const paymentSchema = Joi.object({
  amount: Joi.number().positive().required(),
  service_type: Joi.string().valid('visa_fee').required(),
  phone_number: Joi.string().pattern(/^\+2547\d{8}$/).required(), // Kenya Safaricom M-Pesa numbers only
});

const initiatePayment = async (req, res) => {
  try {
    const { error } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { amount, service_type, phone_number } = req.body;

    const application = await Application.findOne({ where: { user_id: req.user.id } });
    if (!application) {
      return res.status(400).json({ message: 'No application found for this user' });
    }

    if (service_type === 'visa_fee' && !['interview', 'hired'].includes(application.status)) {
      return res.status(400).json({ message: 'Visa fee can only be paid after the applicant has been shortlisted and interviewed' });
    }

    let payment = await Payment.findOne({
      where: {
        user_id: req.user.id,
        service_type,
        status: 'pending',
      },
    });

    if (!payment) {
      payment = await Payment.create({ ...req.body, user_id: req.user.id, status: 'pending' });
    } else {
      await payment.update({ phone_number, amount });
    }

    // Initiate Safaricom M-Pesa payment prompt
    const options = {
      productName: 'Airswift',
      phoneNumber: phone_number,
      currencyCode: 'KES',
      amount,
      provider: 'Safaricom',
      metadata: {
        payment_id: payment.id,
        service_type,
      },
    };

    let response;
    if (payments && typeof payments.mobileCheckout === 'function') {
      response = await payments.mobileCheckout(options);
    } else {
      response = await createCheckoutToken(options);
    }

    res.status(201).json({
      message: 'Safaricom M-Pesa payment prompt sent to your phone',
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
      const user = await User.findByPk(payment.user_id);
      if (user && user.email) {
        await sendStageEmail('visa_payment_received', user.email, {
          name: user.name,
          jobTitle: 'your selected job',
        });
      }
      res.json({ message: 'Payment verified successfully', payment });
    } else {
      res.json({ message: 'Payment pending', payment });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const paymentCallback = async (req, res) => {
  try {
    const {
      status,
      metadata,
      transactionId,
      transaction_id,
      phoneNumber,
      amount,
      currencyCode,
      provider,
    } = req.body;

    const paymentId = metadata?.payment_id || metadata?.paymentId || req.body.payment_id;
    if (!paymentId) {
      return res.status(400).json({ message: 'Missing payment identifier in callback payload' });
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const normalizedStatus = String(status || '').toLowerCase();
    const newStatus = normalizedStatus === 'success' ? 'completed' : normalizedStatus === 'failed' ? 'failed' : 'pending';

    await Payment.update({ status: newStatus }, { where: { id: paymentId } });

    return res.status(200).json({
      message: 'Payment callback processed',
      payment_id: paymentId,
      status: newStatus,
      provider,
      transactionId: transactionId || transaction_id,
      phoneNumber,
      amount,
      currencyCode,
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    return res.status(500).json({ message: 'Payment callback processing failed' });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  paymentCallback,
  makePayment: initiatePayment, // Alias for initiatePayment
};
