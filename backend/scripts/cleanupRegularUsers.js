const { loadEnv } = require('../config/env');
const connectDB = require('../config/db');
const sequelize = require('../config/database');
const mongoose = require('mongoose');
const { Op } = require('sequelize');
const User = require('../models/User');

loadEnv();

const cleanupRegularUsers = async () => {
  try {
    await connectDB();

    const mongoConnected = mongoose.connection.readyState === 1;
    if (!mongoConnected) {
      // Ensure the Sequelize database is ready when using fallback SQLite/Postgres.
      await sequelize.sync();
    }
    const deletedResult = {
      mongo: 0,
      sequelize: 0,
    };

    if (mongoConnected) {
      const result = await User.deleteMany({ role: { $ne: 'admin' } });
      deletedResult.mongo = result.deletedCount || 0;
      console.log(`✅ MongoDB: deleted ${deletedResult.mongo} regular user(s)`);
    } else {
      const result = await User.destroy({
        where: {
          role: {
            [Op.ne]: 'admin',
          },
        },
      });
      deletedResult.sequelize = result || 0;
      console.log(`✅ Sequelize: deleted ${deletedResult.sequelize} regular user(s)`);
    }

    console.log('✅ Cleanup complete. Admin account(s) preserved.');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (e) {
      // ignore close errors
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
};

cleanupRegularUsers();
