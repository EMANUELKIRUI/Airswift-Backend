const roles = require("../config/roles");

/**
 * Granular permission checking middleware
 * Supports both old role-based and new permission-based systems
 * @param {string|array} requiredPermissions - Single permission string or array of permissions
 * @returns {function} Express middleware
 */
const checkPermission = (requiredPermissions) => {
  return (req, res, next) => {
    // Support both old and new systems
    const userRole = req.user.role || req.user.roleString; // Role can be ID or string
    const userPermissions = req.user.permissions || []; // From JWT

    // Convert single permission to array
    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // Check if user has ALL required permissions
    const hasPermission = permissions.every((p) =>
      userPermissions.includes(p)
    );

    if (!hasPermission) {
      // Fallback to old role-based system if available
      const rolePermissions = roles[userRole] || [];
      const hasRolePermission = permissions.every((p) =>
        rolePermissions.includes(p)
      );

      if (!hasRolePermission) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient permissions",
          requiredPermissions: permissions,
          userPermissions: userPermissions,
        });
      }
    }

    next();
  };
};

/**
 * Admin-only middleware
 * @returns {function} Express middleware
 */
const adminOnly = (req, res, next) => {
  const role = req.user.role || req.user.roleString;

  if (role !== "admin" && req.user.roleId !== process.env.ADMIN_ROLE_ID) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: admin access required",
    });
  }

  next();
};

/**
 * Recruiter-only middleware
 * @returns {function} Express middleware
 */
const recruiterOnly = (req, res, next) => {
  const role = req.user.role || req.user.roleString;

  if (!["admin", "recruiter"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: recruiter access required",
    });
  }

  next();
};

module.exports = checkPermission;
module.exports.adminOnly = adminOnly;
module.exports.recruiterOnly = recruiterOnly;