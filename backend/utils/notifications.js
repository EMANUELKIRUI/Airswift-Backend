const nodemailer = require('nodemailer');

// Email transporter
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

// SMS placeholder (using Africa's Talking)
const sendSMS = async (to, message) => {
  // Implement Africa's Talking API here
  console.log(`Sending SMS to ${to}: ${message}`);
};

module.exports = {
  sendEmail,
  sendSMS,
};