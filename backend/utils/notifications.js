const nodemailer = require('nodemailer');

// Email transporter
const transporter = nodemailer.createTransport({
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

const buildEmailForStage = (stage, data) => {
  const templates = {
    application_submitted: {
      subject: 'Application Received',
      text: `Dear ${data.name || 'Applicant'},\n\nThank you for applying to ${data.jobTitle}. Your application is now under review.\n\nBest regards,\nAirswift Team`,
    },
    shortlisted: {
      subject: 'You are shortlisted',
      text: `Dear ${data.name || 'Applicant'},\n\nGreat news: You have been shortlisted for ${data.jobTitle}. Prepare for the interview.\n\nBest regards,\nAirswift Team`,
    },
    interview_scheduled: {
      subject: 'Interview Scheduled',
      text: `Dear ${data.name || 'Applicant'},\n\nYour interview for ${data.jobTitle} is scheduled on ${data.scheduledDate}. Please join at ${data.meetingLink}.\n\nBest regards,\nAirswift Team`,
    },
    interview_attended: {
      subject: 'Interview Completed',
      text: `Dear ${data.name || 'Applicant'},\n\nThank you for attending your interview for ${data.jobTitle}. We will share the next steps shortly.\n\nBest regards,\nAirswift Team`,
    },
    visa_payment_received: {
      subject: 'Visa Payment Received',
      text: `Dear ${data.name || 'Applicant'},\n\nWe have received your visa fee payment for ${data.jobTitle}. Please wait for further guidance.\n\nBest regards,\nAirswift Team`,
    },
    application_rejected: {
      subject: 'Application Update',
      text: `Dear ${data.name || 'Applicant'},\n\nThank you for your application for ${data.jobTitle}. Unfortunately, we are unable to proceed at this time.\n\nBest regards,\nAirswift Team`,
    },
  };

  return templates[stage] || { subject: data.subject || 'Airswift update', text: data.text || '' };
};

const sendStageEmail = async (stage, to, data) => {
  const { subject, text } = buildEmailForStage(stage, data);
  await sendEmail(to, subject, text);
};

module.exports = {
  sendEmail,
  sendSMS,
  sendStageEmail,
  buildEmailForStage,
};