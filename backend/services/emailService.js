const nodemailer = require('nodemailer');

// Initialize transporter only if email credentials are available
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4, // Force IPv4
  });
} else {
  console.warn("Email credentials not configured - email features will be disabled");
}

const sendEmail = async (to, subject, text) => {
  if (!transporter) {
    console.warn("Email service not configured - skipping email send");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Airswift" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

const sendOTPEmail = async (email, otp) => {
  try {
    const subject = 'OTP Verification';
    const text = `
TALEX Verification

Your OTP is: ${otp}

Expires in 10 minutes
    `;

    await sendEmail(email, subject, text);
    console.log(`✅ Email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error.message);
    throw error;
  }
};

module.exports = { sendOTPEmail, sendEmail };