const { sendEmail } = require('./emailService');
const { emailLayout } = require('./emailTemplate');

const otpEmailTemplate = (name, otp) => {
  const content = `
    <p>Dear ${name},</p>

    <p>Your verification code is:</p>

    <div style="text-align:center;margin:20px 0;">
      <span style="
        display:inline-block;
        font-size:28px;
        letter-spacing:5px;
        background:#0d6efd;
        color:#fff;
        padding:10px 20px;
        border-radius:6px;
      ">
        ${otp}
      </span>
    </div>

    <p>This code will expire in 5 minutes.</p>

    <p>If you did not request this, please ignore this email.</p>
  `;

  return emailLayout(content, 'Verify Your Account');
};

const statusEmailTemplate = (application) => {
  let content = '';

  if (application.status === 'shortlisted') {
    content = `
      <p>Dear ${application.name || 'Applicant'},</p>
      <p>
        We are pleased to inform you that you have been 
        <strong>shortlisted</strong> for the next stage.
      </p>
      <p>We will contact you soon with further details.</p>
    `;
  }

  if (application.status === 'accepted') {
    content = `
      <p>Dear ${application.name || 'Applicant'},</p>
      <p>
        Congratulations! Your application has been 
        <strong>accepted</strong>.
      </p>
      <p>We look forward to working with you.</p>
    `;
  }

  if (application.status === 'rejected') {
    content = `
      <p>Dear ${application.name || 'Applicant'},</p>
      <p>
        Thank you for your interest. Unfortunately, we will not 
        proceed with your application at this time.
      </p>
      <p>We encourage you to apply again in the future.</p>
    `;
  }

  return emailLayout(content, 'Application Update');
};

const sendShortlistEmail = async ({ email, name, interviewDate, jobTitle }) => {
  if (!email) {
    throw new Error('Applicant email is required for shortlist notification');
  }

  const formattedDate = interviewDate ? new Date(interviewDate).toDateString() : 'TBD';
  const html = emailLayout(`
    <p>Dear ${name || 'Applicant'},</p>
    <p>We are pleased to inform you that you have been <strong>shortlisted</strong> for the next stage of the recruitment process.</p>
    <p><strong>Interview Date:</strong> ${formattedDate}</p>
    <p>Please ensure your documents are verified before the interview.</p>
    <p>Best regards,<br/>Talent Team</p>
  `, '🎉 Congratulations! You’ve been shortlisted');

  await sendEmail(email, '🎉 Congratulations! You’ve been shortlisted', html);
};

const sendStatusEmail = async (application) => {
  const email = application.email;
  if (!email) {
    throw new Error('Applicant email is required for status notification');
  }

  const html = statusEmailTemplate(application);
  await sendEmail(email, 'Application Update', html);
};

module.exports = { sendStatusEmail, sendShortlistEmail, otpEmailTemplate, statusEmailTemplate };
