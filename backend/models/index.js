const sequelize = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');

// Associations
Application.belongsTo(Job, { foreignKey: 'job_id' });
Application.belongsTo(User, { foreignKey: 'user_id' });

Job.hasMany(Application, { foreignKey: 'job_id' });
User.hasMany(Application, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Job,
  Application,
};