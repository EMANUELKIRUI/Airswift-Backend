require('dotenv').config();
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

console.log("EMAIL CONFIG:", process.env.RESEND_API_KEY ? "✓ Configured" : "✗ Missing RESEND_API_KEY");

/**
 * Send email with Resend service
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise} - Resend response
 */
const sendEmail = async (to, subject, html) => {
  try {
    const result = await resend.emails.send({
      from: "TALEX <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Verify Resend service connection
 */
const verifyTransporter = async () => {
  try {
    await resend.domains.list();
    console.log("✅ Resend email service is ready");
    return true;
  } catch (error) {
    console.error("❌ Resend service error:", error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  verifyTransporter,
};
