const { BrevoClient } = require('@getbrevo/brevo');

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject: subject,
      htmlContent: htmlContent,
      sender: { name: 'Airswift', email: 'noreply@airswift.com' },
      to: [{ email: to }],
      replyTo: { email: 'noreply@airswift.com' }
    });

    return result;
  } catch (error) {
    throw new Error(`Brevo error: ${error.message}`);
  }
};

module.exports = { sendEmail };