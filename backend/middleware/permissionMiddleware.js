/**
 * Permission Middleware
 * Validates that user has required permissions before accessing a route
 * @param {Array<String>} requiredPermissions - Array of permission names required
 * @returns {Function} Express middleware function
 */
module.exports = (requiredPermissions = []) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }

    // If no permissions required, allow access
    if (requiredPermissions.length === 0) {
      return next();
    }

    // Get user permissions from JWT token
    const userPermissions = req.user.permissions || [];

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        message: "Forbidden: Insufficient permissions",
        required: requiredPermissions,
        current: userPermissions,
      });
    }

    next();
  };
};
