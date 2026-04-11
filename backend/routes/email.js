const express = require('express');
const adminMiddleware = require('../middleware/admin');
const {
  sendEmailToApplicant,
  sendBulkEmails,
  sendOfferLetter
} = require('../services/emailService');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

// Test email route (no auth required)
router.get('/test-email', async (req, res) => {
  const success = await sendEmail(
    'your@email.com',
    'Test Email',
    '<h1>Brevo is working ✅</h1>'
  );

  res.json({ success });
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
