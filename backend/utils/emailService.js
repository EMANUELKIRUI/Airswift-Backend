const nodemailer = require('nodemailer');
const Joi = require('joi');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Email Service for Admin Dashboard
 * Send emails to applicants/candidates using Nodemailer
 */

/**
 * Send email to single applicant
 * Used from dashboard
 */
const sendEmailToApplicant = async (req, res) => {
  try {
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

    await transporter.sendMail({
      from: `"TALEX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: html,
    });

    // Emit socket event for real-time notification
    const { emitEmailSent } = require('./socketEmitter');
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
        await transporter.sendMail({
          from: `"TALEX" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: subject,
          html: html,
        });
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

    await transporter.sendMail({
      from: `"TALEX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Interview Invitation - ${jobTitle}`,
      html: html,
    });

    return { success: true, message: 'Interview invitation sent' };
  } catch (error) {
    console.error('sendInterviewInvitation error:', error);
    throw error;
  }
};

/**
 * Send rejection email
 */
const sendRejectionEmail = async (email, candidateName, jobTitle) => {
  try {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #2c3e50;">Thank You for Your Application</h2>

            <p>Dear ${candidateName},</p>

            <p>Thank you for applying for the position of <strong>${jobTitle}</strong>. We appreciate the time and effort you invested in your application.</p>

            <p>While your qualifications are impressive, we have decided to move forward with other candidates whose skills more closely match our current requirements.</p>

            <p>We encourage you to apply for future opportunities that may be a better fit for your profile.</p>

            <p style="margin-top: 20px; color: #7f8c8d;">
              Best regards,<br>
              <strong>TALEX Team</strong>
            </p>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"TALEX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Application Status - ${jobTitle}`,
      html: html,
    });

    return { success: true, message: 'Rejection email sent' };
  } catch (error) {
    console.error('sendRejectionEmail error:', error);
    throw error;
  }
};

/**
 * Send offer letter email
 */
const sendOfferLetter = async (req, res) => {
  try {
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

    await transporter.sendMail({
      from: `"TALEX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Offer Letter - ${jobTitle}`,
      html: html,
    });

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
  sendEmailToApplicant,
  sendBulkEmails,
  sendInterviewInvitation,
  sendRejectionEmail,
  sendOfferLetter
};
