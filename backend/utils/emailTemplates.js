exports.paymentReceiptTemplate = ({ name, amount, receipt }) => {
  return `
    <div style="font-family: Arial; padding: 20px;">
      <h2>✅ Payment Successful</h2>
      <p>Hello <b>${name}</b>,</p>

      <p>Your payment has been received successfully.</p>

      <div style="background:#f4f4f4;padding:15px;border-radius:8px;">
        <p><strong>Amount:</strong> KES ${amount}</p>
        <p><strong>M-Pesa Receipt:</strong> ${receipt}</p>
      </div>

      <p>Thank you for using Airswift 🚀</p>
    </div>
  `;
};

// 📩 New Application Notification
exports.applicationNotification = (user, job) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #007bff; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>📩 New Job Application</h2>
      </div>
      <div class="content">
        <p><strong>Hello Admin,</strong></p>
        <p><strong>${user.name || ''}</strong> (${user.email || ''}) has applied for:</p>
        <h3>${job.title || ''}</h3>
        <p>Login to the admin dashboard to review the application.</p>
        <br>
        <a href="${process.env.ADMIN_URL || 'https://admin.airswift.com'}/applications" class="button">View Applications</a>
      </div>
    </div>
  </body>
  </html>
`;

// 🎉 Job Approved
exports.jobApproved = (job) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #28a745; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .button { background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>🎉 Job Approved</h2>
      </div>
      <div class="content">
        <p><strong>Congratulations!</strong></p>
        <p>Your job "<strong>${job.title || ''}</strong>" has been approved and is now live.</p>
        <p>Job applicants can now see and apply to your position.</p>
      </div>
    </div>
  </body>
  </html>
`;

// ❌ Job Rejected
exports.jobRejected = (job, reason) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>❌ Job Not Approved</h2>
      </div>
      <div class="content">
        <p>Your job "<strong>${job.title || ''}</strong>" was not approved.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Please review and resubmit if needed.</p>
      </div>
    </div>
  </body>
  </html>
`;

// 📋 Application Status Update
exports.applicationStatusUpdate = (application, status) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #007bff; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>📋 Application Status Update</h2>
      </div>
      <div class="content">
        <p><strong>Your application status has been updated!</strong></p>
        <p><strong>New Status:</strong> ${status.toUpperCase()}</p>
        <p>Login to your account to see more details.</p>
        <br>
        <a href="${process.env.FRONTEND_URL || 'https://airswift.com'}/dashboard" class="button">View Application</a>
      </div>
    </div>
  </body>
  </html>
`;

// 📅 Interview Scheduled
exports.interviewScheduled = (interview, candidateName, jobTitle) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #007bff; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .button { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
      .details { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>📅 Interview Scheduled</h2>
      </div>
      <div class="content">
        <p><strong>Hello ${candidateName},</strong></p>
        <p>Your interview for <strong>${jobTitle}</strong> has been scheduled!</p>
        <div class="details">
          <p><strong>Interview Date & Time:</strong> ${interview.scheduledAt || 'TBD'}</p>
          <p><strong>Interview Type:</strong> ${interview.type || 'Video Call'}</p>
          ${interview.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></p>` : ''}
        </div>
        <p>Please make sure you're in a quiet environment with a stable internet connection.</p>
      </div>
    </div>
  </body>
  </html>
`;

// 🎉 Welcome Email
exports.welcomeEmail = (userName) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #28a745; color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .button { background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>🎉 Welcome to Airswift!</h2>
      </div>
      <div class="content">
        <p><strong>Hello ${userName},</strong></p>
        <p>Thank you for joining Airswift! We're excited to have you on board.</p>
        <p>Your account is now active and you can start exploring job opportunities.</p>
      </div>
    </div>
  </body>
  </html>
`;
