const AuditLog = require("../models/AuditLogMongo");

const logAction = async ({ userId, action, resource, description, metadata = {} }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      description,
      metadata,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

const buildMetadata = (request, extra = {}) => ({
  ip:
    request?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request?.ip ||
    request?.connection?.remoteAddress ||
    "",
  userAgent: request?.headers?.["user-agent"] || "",
  ...extra,
});

const logUserActivity = async (userId, action, request, details = {}) => {
  return logAction({
    userId,
    action,
    resource: "AUTH",
    description: details.description || action,
    metadata: buildMetadata(request, details),
  });
};

const logRegistration = async (userId, request) =>
  logUserActivity(userId, "REGISTER", request, {
    event: "user_registration",
    description: "User registered successfully",
  });

const logLogin = async (userId, request) =>
  logUserActivity(userId, "LOGIN", request, {
    event: "user_login",
    description: "User successfully logged in",
  });

const logLogout = async (userId, request) =>
  logUserActivity(userId, "LOGOUT", request, {
    event: "user_logout",
    description: "User logged out",
  });

const logFailedLogin = async (request, email) =>
  logUserActivity(null, "FAILED_LOGIN", request, {
    event: "failed_login_attempt",
    description: "Login attempt failed",
    attempted_email: email,
  });

const logEmailVerification = async (userId, request) =>
  logUserActivity(userId, "EMAIL_VERIFICATION", request, {
    event: "email_verification",
    description: "User verified email address",
  });

const logPasswordReset = async (userId, request) =>
  logUserActivity(userId, "PASSWORD_RESET", request, {
    event: "password_reset",
    description: "User reset password",
  });

const logAuditEvent = async (
  userId,
  action,
  resource,
  resourceId = null,
  details = {},
  req = null
) => {
  const descriptionParts = [action.replace(/_/g, " ").toLowerCase()];
  if (resource) {
    descriptionParts.push(`on ${resource}`);
  }
  if (resourceId) {
    descriptionParts.push(`(ID: ${resourceId})`);
  }

  return logAction({
    userId,
    action,
    resource: resource || "SYSTEM",
    description: descriptionParts.join(" "),
    metadata: {
      ...details,
      ...(req ? buildMetadata(req) : {}),
    },
  });
};

// Attach named exports to the function object so both default and destructured imports work.
logAction.logUserActivity = logUserActivity;
logAction.logRegistration = logRegistration;
logAction.logLogin = logLogin;
logAction.logLogout = logLogout;
logAction.logFailedLogin = logFailedLogin;
logAction.logEmailVerification = logEmailVerification;
logAction.logPasswordReset = logPasswordReset;
logAction.logAuditEvent = logAuditEvent;
logAction.logAction = logAction;

module.exports = logAction;
