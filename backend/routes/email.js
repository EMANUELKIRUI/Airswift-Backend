const express = require('express');
const adminMiddleware = require('../middleware/admin');
const { protect, permit } = require('../middleware/auth');
const {
  sendEmailToApplicant,
  sendBulkEmails,
  sendOfferLetter
} = require('../services/emailService');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Test email route (no auth required)
router.get('/test-email', async (req, res) => {
  if (!process.env.BREVO_API_KEY) {
    return res.json({
      success: false,
      error: 'Brevo API key missing',
      message: 'Email not configured (Brevo API key missing)'
    });
  }

  const success = await sendEmail(
    'your@email.com',
    'Test Email',
    '<h1>Brevo is working ✅</h1>'
  );

  res.json({ success });
});

// All email routes require admin authentication (manage_applications permission for sending emails)
router.use(protect, permit('manage_applications'));

// Send email to single applicant
router.post('/send', sendEmailToApplicant);

// Send bulk emails to multiple applicants
router.post('/bulk', sendBulkEmails);

// Send offer letter
router.post('/offer-letter', sendOfferLetter);

module.exports = router;
