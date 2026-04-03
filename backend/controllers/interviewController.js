const Joi = require('joi');
const { Interview, Application, User, Payment } = require('../models');
const { sendEmail, sendStageEmail } = require('../utils/notifications');

const interviewSchema = Joi.object({
  application_id: Joi.number().integer().required(),
  scheduled_date: Joi.date().required(),
  meeting_link: Joi.string(),
  notes: Joi.string(),
});

const recordAttendanceSchema = Joi.object({
  attended: Joi.boolean().required(),
  notes: Joi.string(),
});

const recordDecisionSchema = Joi.object({
  decision: Joi.string().valid('hired', 'rejected').required(),
  notes: Joi.string(),
});

const scheduleInterview = async (req, res) => {
  try {
    const { error } = interviewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await Interview.create(req.body);

    // Notify user
    const application = await Application.findByPk(req.body.application_id, { include: [User, require('../models').Job] });
    if (application && application.User) {
      await sendStageEmail('interview_scheduled', application.User.email, {
        name: application.User.name,
        jobTitle: application.Job.title,
        scheduledDate: new Date(req.body.scheduled_date).toLocaleDateString(),
        meetingLink: req.body.meeting_link,
      });
    }

    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.findAll({
      include: [{
        model: Application,
        where: { user_id: req.user.id },
        include: [{ model: require('../models').Job }],
      }],
    });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const recordInterviewAttendance = async (req, res) => {
  try {
    const { error } = recordAttendanceSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await Interview.findByPk(req.params.id, {
      include: [{
        model: Application,
        include: [{ model: User }, { model: require('../models').Job }],
      }],
    });

    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    await interview.update({ attended: req.body.attended, notes: req.body.notes });

    if (req.body.attended && interview.Application.User) {
      await sendStageEmail('interview_attended', interview.Application.User.email, {
        name: interview.Application.User.name,
        jobTitle: interview.Application.Job.title,
      });
    }

    res.json({ message: 'Interview attendance recorded', interview });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const recordInterviewDecision = async (req, res) => {
  try {
    const { error } = recordDecisionSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await Interview.findByPk(req.params.id, {
      include: [{
        model: Application,
        include: [{ model: User }, { model: require('../models').Job }],
      }],
    });

    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    const { decision, notes } = req.body;
    const application = interview.Application;

    // Update interview decision
    await interview.update({ decision, notes });

    // Update application status
    const newApplicationStatus = decision === 'hired' ? 'hired' : 'rejected';
    await application.update({ status: newApplicationStatus });

    // If hired, create visa fee payment
    if (decision === 'hired') {
      const existingPayment = await Payment.findOne({
        where: { user_id: application.user_id, service_type: 'visa_fee' },
      });

      if (!existingPayment) {
        const Profile = require('../models').Profile;
        const profile = await Profile.findOne({ where: { user_id: application.user_id } });
        if (profile && profile.phone_number) {
          await Payment.create({
            user_id: application.user_id,
            phone_number: profile.phone_number,
            amount: 30000,
            service_type: 'visa_fee',
            status: 'pending',
          });
        }
      }

      await sendStageEmail('visa_payment_received', application.User.email, {
        name: application.User.name,
        jobTitle: application.Job.title,
      });
    } else if (decision === 'rejected') {
      await sendStageEmail('application_rejected', application.User.email, {
        name: application.User.name,
        jobTitle: application.Job.title,
      });
    }

    res.json({ message: 'Interview decision recorded', interview, application });
  } catch (error) {
    console.error('recordInterviewDecision error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  scheduleInterview,
  getMyInterviews,
  recordInterviewAttendance,
  recordInterviewDecision,
};