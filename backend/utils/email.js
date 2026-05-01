require('dotenv').config();
const nodemailer = require('nodemailer');
const dns = require('dns');
const sendEmailViaBrevo = require('./sendEmail');

// Force IPv4
dns.setDefaultResultOrder("ipv4first");

const emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailHost || !emailUser || !emailPass) {
  console.error(
    "EMAIL CONFIG: Missing required email environment variables. Set EMAIL_HOST or SMTP_HOST, EMAIL_USER, and EMAIL_PASS."
  );
}

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  family: 4, // Force IPv4
});

console.log(
  "EMAIL CONFIG:",
  emailHost ? "✓ Configured" : "✗ Missing EMAIL_HOST / SMTP_HOST"
);

/**
 * Send email with Nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise} - Nodemailer response
 */
const sendEmail = async (to, subject, html, options = {}) => {
  if (process.env.BREVO_API_KEY) {
    return sendEmailViaBrevo({
      to,
      subject,
      html,
      type: options.type || 'other',
      sentBy: options.sentBy || null,
      req: options.req || null,
    });
  }

  try {
    const result = await transporter.sendMail({
      from: `"AIRSWIFT" <${process.env.EMAIL_USER}>`,
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
