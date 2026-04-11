// Helper function for case-insensitive user lookup
const User = require("../models/User");

// Check if User is a Mongoose model or Sequelize model
const isMongooseModel = User.prototype && User.prototype.save;
const isSequelizeModel = User.prototype && User.prototype.update;

const findUserByEmail = async (email) => {
  if (!email || typeof email !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();

  if (isMongooseModel) {
    return await User.findOne({ email: normalizedEmail });
  } else if (isSequelizeModel) {
    return await User.findOne({ where: { email: normalizedEmail } });
  } else {
    console.error('User model not properly configured');
    return null;
  }
};

const findUserById = async (id) => {
  if (isMongooseModel) {
    return await User.findById(id);
  } else if (isSequelizeModel) {
    return await User.findByPk(id);
  } else {
    console.error('User model not properly configured');
    return null;
  }
};

const createUser = async (userData) => {
  if (isMongooseModel) {
    return await User.create(userData);
  } else if (isSequelizeModel) {
    return await User.create(userData);
  } else {
    console.error('User model not properly configured');
    return null;
  }
};

module.exports = { findUserByEmail, findUserById, createUser };