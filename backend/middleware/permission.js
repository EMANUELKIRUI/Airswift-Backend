const roles = require("../config/roles");

const checkPermission = (permission) => {
  return (req, res, next) => {
    const role = req.user.role;

    if (!roles[role]?.includes(permission)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

module.exports = checkPermission;