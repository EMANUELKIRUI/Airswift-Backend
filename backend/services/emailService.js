const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp) => {
  try {
    const response = await resend.emails.send({
      from: 'Airswift <onboarding@resend.dev>',
      to: email,
      subject: 'OTP Verification',
      html: `
        <h2>Airswift Verification</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Expires in 10 minutes</p>
      `
    });

    console.log(`✅ Email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error.message);
    throw error;
  }
};

module.exports = { sendOTPEmail };