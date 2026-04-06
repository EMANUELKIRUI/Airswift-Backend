require('dotenv').config();
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
    return result;
  } catch (error) {
    console.error(`❌ Email send error for ${to}:`, error.message);
    throw new Error(`Email send error: ${error.message}`);
  }
};

const sendOTP = async (email, otp) => {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
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

// Verify Resend service on startup
const verifyTransporter = async () => {
  try {
    // Test with a simple API call
    await resend.domains.list();
    console.log("✅ Resend email service is ready");
    return true;
  } catch (error) {
    console.error("❌ Resend service error:", error.message);
    return false;
  }
};

module.exports = { sendEmail, sendOTP, verifyTransporter };