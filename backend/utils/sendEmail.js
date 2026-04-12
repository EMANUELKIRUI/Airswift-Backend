const SibApiV3Sdk = require('sib-api-v3-sdk');
const EmailLog = require('../models/EmailLog');
const { logAction } = require('./auditLogger');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async ({ to, subject, html, type = 'other', sentBy = null, req = null }) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    const sender = {
      email: process.env.EMAIL_FROM,
      name: process.env.EMAIL_FROM_NAME || 'Talex Platform',
    };

    await tranEmailApi.sendTransacEmail({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    await EmailLog.create({
      to,
      subject,
      status: 'sent',
      type,
      sentBy,
    });

    if (sentBy || req) {
      await logAction({
        action: 'EMAIL_SENT',
        performedBy: sentBy,
        targetUser: null,
        metadata: { to, subject, type },
        req,
      });
    }

    console.log('📧 Email sent + logged');
    return true;
  } catch (error) {
    console.error('❌ Email failed:', error.message || error);

    await EmailLog.create({
      to,
      subject,
      status: 'failed',
      type,
      error: error.message || String(error),
      sentBy,
    });

    await logAction({
      action: 'EMAIL_FAILED',
      performedBy: sentBy,
      targetUser: null,
      metadata: { to, subject, type, error: error.message || String(error) },
      req,
    });

    throw error;
  }
};

module.exports = sendEmail;
