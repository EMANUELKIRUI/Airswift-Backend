const Joi = require('joi');
const { Interview, Application, User } = require('../models');
const { sendEmail } = require('../utils/notifications');

const interviewSchema = Joi.object({
  application_id: Joi.number().integer().required(),
  scheduled_date: Joi.date().required(),
  meeting_link: Joi.string(),
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
      await sendEmail(application.User.email, 'Interview Scheduled', `Your interview for ${application.Job.title} is scheduled on ${req.body.scheduled_date}`);
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

module.exports = {
  scheduleInterview,
  getMyInterviews,
};