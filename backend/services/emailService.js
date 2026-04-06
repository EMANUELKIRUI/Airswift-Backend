require('dotenv').config();
const nodemailer = require('nodemailer');

// Create transporter with Gmail SMTP
console.log("EMAIL CONFIG:", process.env.EMAIL_USER);
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // IMPORTANT
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP ERROR:", error);
  } else {
    console.log("SMTP READY");
  }
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"Airswift" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Email send error for ${to}:`, error.message);
    throw new Error(`Email send error: ${error.message}`);
  }
};

const sendOTP = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: `"Airswift" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Airswift OTP Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <h2>Your OTP Code</h2>
          <p style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</p>
          <p style="color: #666;">This code expires in 10 minutes</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email</p>
        </div>
      `,
    });
    console.log(`✅ OTP sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error.message);
    throw error;
  }
};

// Verify transporter on startup
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log("✅ Email service is ready");
    return true;
  } catch (error) {
    console.error("❌ Email service error:", error.message);
    return false;
  }
};

module.exports = { sendEmail, sendOTP, verifyTransporter, transporter };