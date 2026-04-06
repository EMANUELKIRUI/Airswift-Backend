const express = require('express');
const adminMiddleware = require('../middleware/admin');
const {
  sendEmailToApplicant,
  sendBulkEmails,
  sendOfferLetter
} = require('../utils/emailService');

const router = express.Router();

// All email routes require admin authentication
router.use(adminMiddleware);

// Send email to single applicant
router.post('/send', sendEmailToApplicant);

// Send bulk emails to multiple applicants
router.post('/bulk', sendBulkEmails);

// Send offer letter
router.post('/offer-letter', sendOfferLetter);

module.exports = router;
