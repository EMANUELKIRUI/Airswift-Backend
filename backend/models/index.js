const sequelize = require('../config/database');
const User = require('./User');
const Profile = require('./Profile');
const Job = require('./Job');
const JobCategory = require('./JobCategory');
const Application = require('./Application');
const Interview = require('./Interview');
const Payment = require('./Payment');
const Settings = require('./Settings');
const About = require('./About');
const Report = require('./Report');
const AuditLog = require('./AuditLog');

// Associations (Note: User is now a Mongoose model, skip Sequelize associations for it)
// For gradual migration, associations are preserved for Sequelize models only

// Profile associations (keeping Sequelize associations for now)
try {
  Profile.belongsTo(User, { foreignKey: 'user_id' });
} catch (e) {
  console.log("Skipping Profile-User association (User is Mongoose model)");
}

Job.belongsTo(JobCategory, { foreignKey: 'category_id', as: 'category' });
JobCategory.hasMany(Job, { foreignKey: 'category_id' });

// Job.belongsTo(User, { foreignKey: 'created_by', as: 'admin' });

Application.belongsTo(Job, { foreignKey: 'job_id' });
// Application.belongsTo(User, { foreignKey: 'user_id' });

Interview.belongsTo(Application, { foreignKey: 'application_id' });

// Payment.belongsTo(User, { foreignKey: 'user_id' });

Interview.belongsTo(Application, { foreignKey: 'application_id' });
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
  Payment,
  Settings,
  About,
  Report,
  AuditLog,
};