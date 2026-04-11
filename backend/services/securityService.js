const { logAction } = require('../utils/logger');
const { sendEmail } = require('./emailService');
const { emitSecurityAlert } = require('../utils/socketEmitter');

const failedAttempts = new Map();
const otpRequests = new Map();

const trackFailedLogin = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const count = (failedAttempts.get(normalizedEmail) || 0) + 1;
  failedAttempts.set(normalizedEmail, count);
  return count;
};

const checkLoginSecurity = async (email, req) => {
  const attempts = trackFailedLogin(email);

  if (attempts >= 5) {
    console.warn('🚨 Suspicious login activity:', email, 'attempts=', attempts);

    emitSecurityAlert({
      message: 'Multiple failed login attempts',
      data: { email, attempts }
    });

    await logAction({
      action: 'SUSPICIOUS_LOGIN',
      details: { email, attempts },
      req,
      status: 'warning'
    });

    try {
      await sendEmail(
        'admin@talex.com',
        '🚨 Security Alert',
        `Multiple failed login attempts for ${email}. Attempts: ${attempts}`
      );
    } catch (emailError) {
      console.error('Failed to send security alert email:', emailError);
    }
  }

  return attempts;
};

const detectNewIP = async (user, req) => {
  const currentIp = req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || 'unknown';

  if (user.lastIP && user.lastIP !== currentIp) {
    await logAction({
      userId: user._id,
      action: 'NEW_IP_LOGIN',
      entity: 'User',
      entityId: user._id,
      details: {
        oldIP: user.lastIP,
        newIP: currentIp,
      },
      req,
      status: 'warning'
    });

    try {
      await sendEmail(
        user.email,
        'New Login Detected',
        `We detected a login from a new IP address: ${currentIp}. If this wasn\'t you, please secure your account immediately.`
      );
    } catch (emailError) {
      console.error('Failed to send new IP alert email:', emailError);
    }
  }

  user.lastIP = currentIp;
  await user.save();
};

const trackOTPRequests = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const count = (otpRequests.get(normalizedEmail) || 0) + 1;
  otpRequests.set(normalizedEmail, count);

  if (count > 3) {
    console.warn('🚨 OTP abuse detected:', email, 'count=', count);
  }

  return count;
};

module.exports = {
  trackFailedLogin,
  checkLoginSecurity,
  detectNewIP,
  trackOTPRequests,
};
