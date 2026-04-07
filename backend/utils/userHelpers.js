// Helper function for case-insensitive user lookup
const findUserByEmail = async (email) => {
  return await User.findOne({ email: email.toLowerCase() });
};

module.exports = { findUserByEmail };