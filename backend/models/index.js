const sequelize = require('../config/database');
const User = require('./User');
const Profile = require('./Profile');
const Job = require('./Job');
const Application = require('./Application');
const Interview = require('./Interview');
const Payment = require('./Payment');

// Associations
User.hasOne(Profile, { foreignKey: 'user_id' });
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
};