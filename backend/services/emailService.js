const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // Force IPv4
});

const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: `"Airswift" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
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