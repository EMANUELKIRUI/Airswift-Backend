// Email templates for user account status notifications
// These templates are used when banning, suspending, or reactivating users

const accountBannedTemplate = ({ userName, email, reason, supportEmail }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #dc3545; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .alert { background: #ffe5e5; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
    .reason { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚫 Account Banned</h1>
    </div>
    <div class="content">
      <p>Dear {{userName}},</p>
      
      <div class="alert">
        <strong>Your account has been permanently banned</strong>
        <p>You will no longer be able to access the Talex platform.</p>
      </div>
      
      {{#if reason}}
      <h3>Reason:</h3>
      <div class="reason">
        {{reason}}
      </div>
      {{/if}}
      
      <h3>What happens now?</h3>
      <ul>
        <li>You cannot log in to your account</li>
        <li>All your active sessions have been terminated</li>
        <li>You cannot create a new account with this email</li>
      </ul>
      
      <h3>Appeal Process</h3>
      <p>If you believe this is a mistake, you can contact our support team.</p>
      <a href="mailto:{{supportEmail}}" class="button">Contact Support</a>
      
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        <strong>Account Email:</strong> {{email}}<br>
        <strong>Action:</strong> Account Ban
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Talex. This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

const accountSuspendedTemplate = ({ userName, email, reason, supportEmail, resumeDate }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #ffc107; color: #333; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .reason { background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏸️ Account Suspended</h1>
    </div>
    <div class="content">
      <p>Dear {{userName}},</p>
      
      <div class="alert">
        <strong>Your account has been temporarily suspended</strong>
        <p>Your access to the Talex platform is currently restricted.</p>
      </div>
      
      {{#if reason}}
      <h3>Reason:</h3>
      <div class="reason">
        {{reason}}
      </div>
      {{/if}}
      
      <h3>What happens now?</h3>
      <ul>
        <li>You cannot log in to your account at this time</li>
        <li>Your applications and data are preserved</li>
        <li>Your account may be reactivated after review</li>
      </ul>
      
      {{#if resumeDate}}
      <h3>Review Date</h3>
      <p>Your account will be reviewed on: <strong>{{resumeDate}}</strong></p>
      {{/if}}
      
      <h3>Need Help?</h3>
      <p>If you have questions or believe this is a mistake, please contact our support team.</p>
      <a href="mailto:{{supportEmail}}" class="button">Contact Support</a>
      
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        <strong>Account Email:</strong> {{email}}<br>
        <strong>Action:</strong> Account Suspension
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Talex. This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

const accountReactivatedTemplate = ({ userName, email }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: white; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #28a745; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .alert { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; color: #155724; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .button { display: inline-block; background: #28a745; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Account Reactivated</h1>
    </div>
    <div class="content">
      <p>Dear {{userName}},</p>
      
      <div class="alert">
        <strong>Your account has been reactivated!</strong>
        <p>You can now access the Talex platform again.</p>
      </div>
      
      <h3>You're All Set</h3>
      <ul>
        <li>✅ You can now log in to your account</li>
        <li>✅ Your applications and data are intact</li>
        <li>✅ All your platform features are available</li>
      </ul>
      
      <p>Welcome back to Talex! We're glad to have you again.</p>
      
      <a href="https://talex.com/login" class="button">Log In to Your Account</a>
      
      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        <strong>Account Email:</strong> {{email}}<br>
        <strong>Action:</strong> Account Reactivation
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Talex. This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

const renderEmailTemplate = (template, variables) => {
  let html = typeof template === 'function' ? template(variables) : template;
  
  // Simple template variable replacement
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, variables[key] || '');
  });
  
  return html;
};

module.exports = {
  accountBannedTemplate,
  accountSuspendedTemplate,
  accountReactivatedTemplate,
  renderEmailTemplate
};
