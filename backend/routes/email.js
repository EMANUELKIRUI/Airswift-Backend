const express = require('express');
const adminMiddleware = require('../middleware/admin');
const {
  sendEmailToApplicant,
  sendBulkEmails,
  sendOfferLetter
} = require('../utils/emailService');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Test email route (no auth required)
router.get('/test-email', async (req, res) => {
  try {
    await sendEmail("emanuelkirui973@gmail.com", "Test OTP", "Your code is 123456");
    res.send("Email sent ✅");
  } catch (err) {
    console.error(err);
    res.send("Error ❌");
  }
});

// All email routes require admin authentication
router.use(adminMiddleware);

// Send email to single applicant
router.post('/send', sendEmailToApplicant);

// Send bulk emails to multiple applicants
router.post('/bulk', sendBulkEmails);

// Send offer letter
router.post('/offer-letter', sendOfferLetter);

module.exports = router;
