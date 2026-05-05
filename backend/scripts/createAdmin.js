require('dotenv').config();
const sequelize = require('../config/database');
const { createDefaultAdmin } = require('../utils/adminSeed');

const run = async () => {
  try {
    await sequelize.sync({ alter: true });
    const admin = await createDefaultAdmin();
    console.log(`✅ Admin user ready: ${admin.email} (role=${admin.role})`);
  } catch (error) {
    console.error('❌ Failed to create default admin:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

run();
