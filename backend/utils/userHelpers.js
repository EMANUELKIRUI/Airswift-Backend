// Helper function for case-insensitive user lookup
const User = require("../models/User");

// User is a Mongoose model in this backend
const isMongooseModel = Boolean(User.schema);

const findUserByEmail = async (email) => {
  if (!email || typeof email !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();
  return await User.findOne({ email: normalizedEmail });
};

const findUserById = async (id) => {
  if (!id) return null;
  return await User.findById(id);
};

const createUser = async (userData) => {
  return await User.create(userData);
};

module.exports = { findUserByEmail, findUserById, createUser };