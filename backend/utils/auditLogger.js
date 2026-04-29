const AuditLog = require("../models/AuditLogMongo");

const buildRequestMetadata = (request) => {
  const ip =
    request?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    request?.ip ||
    request?.connection?.remoteAddress ||
    request?.socket?.remoteAddress ||
    "";
  const userAgent = request?.headers?.["user-agent"] || "";

  return {
    ip,
    ip_address: ip,
    userAgent,
    user_agent: userAgent,
    method: request?.method || "",
    endpoint: request?.originalUrl || request?.url || "",
  };
};

const buildMetadata = (request, extra = {}) => ({
  ...buildRequestMetadata(request),
  ...extra,
});

const createAuditLog = async ({ user = null, userId = null, user_id = null, action = "UNKNOWN", resource = "SYSTEM", description, metadata = {}, request = null }) => {
  const resolvedUserId = user?._id || user?.id || userId || user_id || null;
  const resolvedDescription = description || action || "No description";
  const requestFields = request ? buildRequestMetadata(request) : {};

  try {
    const log = await AuditLog.create({
      user_id: resolvedUserId,
      action,
      resource,
      description: resolvedDescription,
      metadata: { ...requestFields, ...metadata },
      ...requestFields,
    });

    const io = global.io;
    if (io) {
      io.to("admins").emit("auditLogCreated", log);
    }

    return log;
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

// 🔥 NEW: Real-time audit streaming
const logAudit = async (io, data) => {
  const log = await AuditLog.create(data);

  io.emit("audit:stream", log);

  return log;
};

const logAction = async ({ userId = null, user_id = null, action = "UNKNOWN", resource = "SYSTEM", description, metadata = {}, request = null }) => {
  return createAuditLog({ userId, user_id, action, resource, description, metadata, request });
};

const logUserActivity = async (userId, action, request, details = {}) => {
  return logAction({
    userId,
    action,
    resource: "AUTH",
    description: details.description || action,
    metadata: buildMetadata(request, details),
    request,
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
logAction.createAuditLog = createAuditLog;
logAction.logAudit = logAudit;

module.exports = logAction;
