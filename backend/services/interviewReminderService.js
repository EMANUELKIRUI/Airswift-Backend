const { Op } = require('sequelize');
const { Interview, Application, Job } = require('../models');
const User = require('../models/User');
const { sendStageEmail, sendSMS } = require('../utils/notifications');

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

const findUpcomingInterviews = async (minutesWindow, reminderField) => {
  const now = new Date();
  const start = new Date(now.getTime() + (minutesWindow - 5) * 60000);
  const end = new Date(now.getTime() + (minutesWindow + 5) * 60000);

  return Interview.findAll({
    where: {
      status: { [Op.in]: ['scheduled', 'rescheduled'] },
      scheduled_at: { [Op.between]: [start, end] },
      [reminderField]: false,
    },
    include: [{ model: Application, include: [Job] }],
  });
};

const markReminderSent = async (interview, reminderField) => {
  await interview.update({ [reminderField]: true });
};

const sendReminder = async (interview, minutes) => {
  const application = interview.Application;
  if (!application || !application.user_id) return;

  const candidate = await User.findById(application.user_id).lean();
  if (!candidate || !candidate.email) return;

  await sendStageEmail('interview_scheduled', candidate.email, {
    name: candidate.name || 'Candidate',
    jobTitle: application.Job?.title || 'Interview',
    scheduledDate: interview.scheduled_at.toLocaleString(),
    meetingLink: interview.meeting_link || 'To be shared',
  });
  if (candidate.phone) {
    await sendSMS(candidate.phone, `Reminder: your interview for ${application.Job?.title || 'the role'} is in ${minutes} minutes.`);
  }
};

const processReminders = async () => {
  try {
    const reminders = [
      { minutes: 60 * 24, field: 'reminder_24h_sent' },
      { minutes: 60, field: 'reminder_1h_sent' },
    ];

    for (const config of reminders) {
      const interviews = await findUpcomingInterviews(config.minutes, config.field);
      await Promise.all(interviews.map(async (interview) => {
        await sendReminder(interview, config.minutes);
        await markReminderSent(interview, config.field);
      }));
    }
  } catch (error) {
    console.error('Interview reminder service error:', error);
  }
};

let reminderTimer;

const startReminderService = () => {
  if (process.env.INTERVIEW_REMINDERS_ENABLED !== 'true') {
    console.log('Interview reminder service disabled by configuration');
    return;
  }

  if (reminderTimer) return;
  reminderTimer = setInterval(processReminders, REMINDER_INTERVAL_MS);
  processReminders();
  console.log('Interview reminder service started');
};

const stopReminderService = () => {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
};

module.exports = {
  startReminderService,
  stopReminderService,
};
