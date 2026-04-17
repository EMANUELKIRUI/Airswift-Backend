const User = require("../models/User");

// Check if User is a Mongoose model
const isMongooseModel = Boolean(User.schema);
const isSequelizeModel = Boolean(User.sequelize);

// ✅ Profile Endpoint (VERY IMPORTANT)
const getProfile = async (req, res) => {
  try {
    let user;

    if (isMongooseModel) {
      user = await User.findById(req.user.id);
    } else if (isSequelizeModel) {
      user = await User.findByPk(req.user.id);
    } else {
      return res.status(500).json({ message: "User model not properly configured" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      hasSubmittedApplication: user.hasSubmittedApplication,
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfile,
};