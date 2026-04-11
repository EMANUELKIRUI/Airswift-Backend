const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const Message = require('../models/Message');
const User = require('../models/User');
const Application = require('../models/Application');
const EmailTemplate = require('../models/EmailTemplate');
const { createNotification } = require('./notificationController');
const { sendEmail, renderTemplate } = require('../services/emailService');
const { emitDirectMessage } = require('../utils/socketEmitter');

const sendInterviewMessage = async (req, res) => {
  try {
    const schema = Joi.object({
      applicationId: Joi.number().integer().required(),
      subject: Joi.string().required(),
      message: Joi.string().required(),
      interview_date: Joi.string().required(),
      interview_time: Joi.string().required(),
      templateName: Joi.string().optional(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { applicationId, subject, message, interview_date, interview_time, templateName } = value;

    const application = await Application.findByPk(applicationId, { include: [{ model: require('../models/Job') }] });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const user = await User.findById(application.user_id);
    if (!user) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    const attachmentPath = req.file?.path || null;
    const template = templateName
      ? await EmailTemplate.findOne({ name: templateName })
      : null;

    const variables = {
      name: user.name || 'Candidate',
      date: interview_date,
      time: interview_time,
      job_title: application.Job?.title || 'Position',
    };

    const renderedMessage = template
      ? renderTemplate(template.body, variables)
      : message;

    const renderedSubject = template
      ? renderTemplate(template.subject, variables)
      : subject;

    const emailPayload = {
      to: user.email,
      subject: renderedSubject,
      html: renderedMessage.split('\n').map(line => `<p>${line}</p>`).join(''),
      attachments: [],
    };

    if (attachmentPath) {
      emailPayload.attachments.push({ path: attachmentPath });
    }

    await sendEmail(emailPayload);

    const dbMessage = await Message.create({
      senderId: req.user.id,
      receiverId: user._id,
      subject,
      text: message,
      interview_date: new Date(interview_date),
      interview_time,
      attachment_path: attachmentPath,
      is_read: false,
      applicationId,
    });

    const populatedMessage = await dbMessage
      .populate('senderId', 'name email role')
      .populate('receiverId', 'name email role');

    await createNotification({
      userId: user._id,
      title: subject,
      message: `You have a new interview message for ${variables.job_title}.`,
      link: `/messages?withUserId=${req.user.id}`,
    });

    emitDirectMessage(populatedMessage);

    res.status(201).json({ message: 'Interview message sent', data: populatedMessage });
  } catch (err) {
    console.error('sendInterviewMessage error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  sendInterviewMessage,
};
