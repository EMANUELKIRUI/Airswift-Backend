const sequelize = require('../config/database');
const User = require('./User');
const Job = require('./Job');
const Application = require('./Application');

// Associations
Application.belongsTo(Job, { foreignKey: 'jobId' });
Application.belongsTo(User, { foreignKey: 'userId' });

Job.hasMany(Application, { foreignKey: 'jobId' });
User.hasMany(Application, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Job,
  Application,
};
