const { Job } = require('../models');
const { sendEmail } = require('../utils/notifications');

// Auto-close expired jobs
const closeExpiredJobs = async () => {
  try {
    const now = new Date();
    const expiredJobs = await Job.findAll({
      where: {
        status: 'active',
        expiry_date: {
          [require('sequelize').Op.lt]: now,
        },
      },
    });

    for (const job of expiredJobs) {
      await Job.update({ status: 'closed' }, { where: { id: job.id } });
      console.log(`Job ${job.title} closed due to expiry`);
    }
  } catch (error) {
    console.error('Error closing expired jobs:', error);
  }
};

// Send interview reminders (placeholder - run daily)
const sendInterviewReminders = async () => {
  // Placeholder: Implement logic to send reminders for upcoming interviews
  console.log('Sending interview reminders...');
};

module.exports = {
  closeExpiredJobs,
  sendInterviewReminders,
};