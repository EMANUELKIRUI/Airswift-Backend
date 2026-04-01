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

// Associations
User.hasOne(Profile, { foreignKey: 'user_id' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

Job.belongsTo(JobCategory, { foreignKey: 'category_id', as: 'category' });
JobCategory.hasMany(Job, { foreignKey: 'category_id' });

Job.belongsTo(User, { foreignKey: 'created_by', as: 'admin' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

Job.belongsTo(User, { foreignKey: 'created_by', as: 'admin' });

Application.belongsTo(Job, { foreignKey: 'job_id' });
Application.belongsTo(User, { foreignKey: 'user_id' });

Interview.belongsTo(Application, { foreignKey: 'application_id' });

Payment.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Profile,
  Job,
  Application,
  Interview,
  Payment,
  Settings,
  About,
};