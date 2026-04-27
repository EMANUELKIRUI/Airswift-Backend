const sequelize = require('../config/database');
const User = require('./User');
const Profile = require('./Profile');
const Job = require('./Job');
const JobCategory = require('./JobCategory');
const Application = require('./Application');
const Interview = require('./Interview');
const InterviewFeedback = require('./InterviewFeedback');
const InterviewParticipant = require('./InterviewParticipant');
const Payment = require('./Payment');
const Settings = require('./Settings').Sequelize; // Sequelize version for sync
const About = require('./About');
const Report = require('./Report');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');
const EmailTemplate = require('./EmailTemplate');
const UserActivityAudit = require('./UserActivityAudit');
const Permission = require('./Permission');
const Role = require('./Role');

// Associations (Note: User is now a Mongoose model, skip Sequelize associations for it)
// For gradual migration, associations are preserved for Sequelize models only

// Profile associations (skipping since User is now Mongoose model)
try {
  // Profile.belongsTo(User, { foreignKey: 'user_id' });
  console.log("Skipping Profile-User association (User is Mongoose model)");
} catch (e) {
  console.log("Skipping Profile-User association (User is Mongoose model)");
}

Job.belongsTo(JobCategory, { foreignKey: 'category_id', as: 'category' });
JobCategory.hasMany(Job, { foreignKey: 'category_id' });

// Job.belongsTo(User, { foreignKey: 'created_by', as: 'admin' });

Application.belongsTo(Job, { foreignKey: 'job_id' });
// Application.belongsTo(User, { foreignKey: 'user_id' });

Interview.belongsTo(Application, { foreignKey: 'application_id' });
Interview.hasMany(InterviewFeedback, { foreignKey: 'interview_id', as: 'feedback' });
Interview.hasMany(InterviewParticipant, { foreignKey: 'interview_id', as: 'participants' });

// Payment.belongsTo(User, { foreignKey: 'user_id' });

// Interview.belongsTo(Application, { foreignKey: 'application_id' });
// Interview.belongsTo(User, { foreignKey: 'interviewer_id', as: 'interviewer' });

// Payment.belongsTo(User, { foreignKey: 'user_id' });

// Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });
// Report.belongsTo(User, { foreignKey: 'reported_user_id', as: 'reportedUser' });
// User.hasMany(Report, { foreignKey: 'reporter_id' });
// User.hasMany(Report, { foreignKey: 'reported_user_id' });

// AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Profile,
  Job,
  JobCategory,
  Application,
  Interview,
  InterviewFeedback,
  InterviewParticipant,
  Payment,
  Settings,
  About,
  Report,
  AuditLog,
  Notification,
  EmailTemplate,
  UserActivityAudit,
  Permission,
  Role,
};