require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log("EMAIL CONFIG:", process.env.EMAIL_HOST ? "✓ Configured" : "✗ Missing EMAIL_HOST");

/**
 * Send email with Nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise} - Nodemailer response
 */
const sendEmail = async (to, subject, html) => {
  try {
    const result = await transporter.sendMail({
      from: `"TALEX" <${process.env.EMAIL_USER}>`,
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
 * Verify Nodemailer connection
 */
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Nodemailer email service is ready");
    return true;
  } catch (error) {
    console.error("❌ Nodemailer service error:", error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  verifyTransporter,
};
