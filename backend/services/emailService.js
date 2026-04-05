require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: `"Airswift" <${process.env.FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    throw new Error(`Email send error: ${error.message}`);
  }
};

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"Airswift" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: "Your OTP Code",
    html: `<h1>${otp}</h1><p>Expires in 10 minutes</p>`,
  });
};

module.exports = { sendEmail, sendOTP };