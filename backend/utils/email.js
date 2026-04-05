const nodemailer = require("nodemailer");

// Create email transporter with Gmail SMTP
console.log("EMAIL CONFIG:", process.env.EMAIL_USER);
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 👈 App Password (NOT normal Gmail password)
  },
});

/**
 * Send email with Gmail SMTP
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise} - Nodemailer response
 */
const sendEmail = async (to, subject, html) => {
  try {
    const result = await transporter.sendMail({
      from: `"Airswift" <${process.env.EMAIL_USER}>`,
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
 * Verify transporter connection
 */
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email transporter is ready to send messages");
    return true;
  } catch (error) {
    console.error("❌ Email transporter error:", error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  verifyTransporter,
  transporter,
};
