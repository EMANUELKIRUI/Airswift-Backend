const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.SENDER_EMAIL || process.env.EMAIL_USER;
const FROM_NAME = process.env.SENDER_NAME || 'Airswift';

if (!BREVO_API_KEY) {
  console.warn('BREVO_API_KEY is not configured. Email sending will fail until it is provided.');
}

if (!FROM_EMAIL) {
  console.warn('SENDER_EMAIL or EMAIL_USER is not configured. Email sender address is required.');
}

const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is required to send email');
  }

  if (!FROM_EMAIL) {
    throw new Error('SENDER_EMAIL or EMAIL_USER is required to send email');
  }

  const payload = {
    sender: {
      name: FROM_NAME,
      email: FROM_EMAIL,
    },
    to: [{ email: to }],
    subject,
    htmlContent,
    textContent: textContent || htmlContent.replace(/<[^>]+>/g, ''),
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.message || JSON.stringify(data);
    throw new Error(`Brevo email send failed: ${errorMessage}`);
  }

  return data;
};

const sendVerificationEmail = async ({ email, name, token }) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const subject = 'Verify your Airswift account';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Verify your email</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Thanks for registering with Airswift. Please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #1c7ed6; color: #ffffff; text-decoration: none; border-radius: 6px;">Verify your email</a>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>If you did not create an account, you can safely ignore this message.</p>
      <p>Thanks,<br/>The Airswift Team</p>
    </div>
  `;
  const textContent = `Hi ${name || 'there'},\n\nThank you for registering with Airswift. Verify your email by visiting the link below:\n\n${verificationUrl}\n\nIf you did not create an account, ignore this message.\n\nThanks,\nThe Airswift Team`;

  return await sendEmail({ to: email, subject, htmlContent, textContent });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
};