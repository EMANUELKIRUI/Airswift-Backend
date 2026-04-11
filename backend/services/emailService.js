const nodemailer = require('nodemailer');
let nodeFetch;
const fetch = async (...args) => {
  if (!nodeFetch) {
    ({ default: nodeFetch } = await import('node-fetch'));
  }
  return nodeFetch(...args);
};

const renderTemplate = (template, variables = {}) => {
  return template.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
    const value = variables[key.trim()];
    return value !== undefined && value !== null ? value : '';
  });
};

const sendEmail = async (to, subject, htmlContent) => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"TALEX" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: htmlContent,
      });

      console.log('✅ Gmail email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Gmail email send error:', error.message);
      // fallback to Brevo below
    }
  }

  if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL) {
    console.log('❌ Email disabled - missing Brevo or Gmail credentials');
    return false;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.SENDER_EMAIL,
          name: 'Talex',
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Brevo error:', data);
      throw new Error('Email failed');
    }

    console.log('✅ Email sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
};

const dispatchEmail = async (to, subject, htmlContent) => {
  const sent = await sendEmail(to, subject, htmlContent);
  if (!sent) {
    throw new Error('Brevo email failed');
  }
  return true;
};

const sendOTPEmail = async (email, otp) => {
  try {
    const subject = 'OTP Verification';
    const html = `
<html>
<head></head>
<body>
  <h2>TALEX Verification</h2>
  <p>Your OTP is: <strong>${otp}</strong></p>
  <p>Expires in 10 minutes</p>
</body>
</html>
    `;

    await dispatchEmail(email, subject, html);
    console.log(`✅ OTP Email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to send OTP to ${email}:`, error.message);
    throw error;
  }
};

/**
 * Send interview invitation email
 */
const sendInterviewInvitation = async (email, candidateName, jobTitle, interviewDate, meetingLink) => {
  try {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2c3e50;">Interview Invitation!</h2>

            <p>Dear ${candidateName},</p>

            <p>We are pleased to invite you for an interview for the position of <strong>${jobTitle}</strong>.</p>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Interview Details:</strong></p>
              <p><strong>Date & Time:</strong> ${new Date(interviewDate).toLocaleString()}</p>
              ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color: #3498db;">${meetingLink}</a></p>` : ''}
            </div>

            <p>Please confirm your availability by replying to this email.</p>

            <p style="margin-top: 20px; color: #7f8c8d;">
              Best regards,<br>
              <strong>TALEX Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    await dispatchEmail(email, `Interview Invitation - ${jobTitle}`, html);
    return { success: true, message: 'Interview invitation sent' };
  } catch (error) {
    console.error('sendInterviewInvitation error:', error);
    throw error;
  }
};

/**
 * Send email to single applicant (controller function)
 */
const sendEmailToApplicant = async (req, res) => {
  try {
    const Joi = require('joi');
    const schema = Joi.object({
      email: Joi.string().email().required(),
      subject: Joi.string().required(),
      message: Joi.string().required(),
      applicantName: Joi.string().optional(),
      applicationId: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, subject, message, applicantName, applicationId } = req.body;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2c3e50;">Hello${applicantName ? ' ' + applicantName : ''},</h2>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>

            <p style="margin-top: 20px; color: #7f8c8d;">
              Best regards,<br>
              <strong>TALEX Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    await dispatchEmail(email, subject, html);

    // Emit socket event for real-time notification
    const { emitEmailSent } = require('../utils/socketEmitter');
    emitEmailSent({
      applicationId,
      recipientEmail: email,
      recipientName: applicantName || 'Applicant',
      subject: subject
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      recipientEmail: email
    });
  } catch (error) {
    console.error('sendEmailToApplicant error:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

/**
 * Send bulk emails to multiple applicants
 */
const sendBulkEmails = async (req, res) => {
  try {
    const Joi = require('joi');
    const schema = Joi.object({
      recipientEmails: Joi.array().items(Joi.string().email()).required(),
      subject: Joi.string().required(),
      message: Joi.string().required(),
      jobTitle: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { recipientEmails, subject, message, jobTitle } = req.body;

    const sendPromises = recipientEmails.map(async (email) => {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #2c3e50;">Hello,</h2>

              ${jobTitle ? `<p style="font-size: 14px; color: #7f8c8d;"><strong>Position:</strong> ${jobTitle}</p>` : ''}

              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
              </div>

              <p style="margin-top: 20px; color: #7f8c8d;">
                Best regards,<br>
                <strong>TALEX Team</strong>
              </p>
            </div>
          </body>
        </html>
      `;

      try {
        await dispatchEmail(email, subject, html);
        return { email, status: 'sent' };
      } catch (err) {
        console.error(`Error sending to ${email}:`, err);
        return { email, status: 'failed', error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.status === 'sent').length;

    res.json({
      success: true,
      message: `Successfully sent ${successCount} out of ${recipientEmails.length} emails`,
      results: results
    });
  } catch (error) {
    console.error('sendBulkEmails error:', error);
    res.status(500).json({ message: 'Failed to send bulk emails', error: error.message });
  }
};

/**
 * Send offer letter email
 */
const sendOfferLetter = async (req, res) => {
  try {
    const Joi = require('joi');
    const schema = Joi.object({
      email: Joi.string().email().required(),
      candidateName: Joi.string().required(),
      jobTitle: Joi.string().required(),
      salary: Joi.string().required(),
      startDate: Joi.date().required(),
      jobDescription: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, candidateName, jobTitle, salary, startDate, jobDescription } = req.body;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2c3e50;">Congratulations!</h2>

            <p>Dear ${candidateName},</p>

            <p>We are delighted to offer you the position of <strong>${jobTitle}</strong> at Airswift.</p>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Offer Details:</strong></p>
              <p><strong>Position:</strong> ${jobTitle}</p>
              <p><strong>Annual Salary:</strong> ${salary}</p>
              <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</p>
              ${jobDescription ? `<p><strong>Role Description:</strong> ${jobDescription}</p>` : ''}
            </div>

            <p>Please confirm your acceptance of this offer by replying to this email or calling our HR department.</p>

            <p style="margin-top: 20px; color: #7f8c8d;">
              Best regards,<br>
              <strong>TALEX HR Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    await dispatchEmail(email, `Offer Letter - ${jobTitle}`, html);

    res.json({
      success: true,
      message: 'Offer letter sent successfully',
      recipientEmail: email
    });
  } catch (error) {
    console.error('sendOfferLetter error:', error);
    res.status(500).json({ message: 'Failed to send offer letter', error: error.message });
  }
};

module.exports = {
  sendOTPEmail,
  sendEmail,
  renderTemplate,
  sendInterviewInvitation,
  sendEmailToApplicant,
  sendBulkEmails,
  sendOfferLetter
};