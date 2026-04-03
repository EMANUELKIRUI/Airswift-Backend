const https = require('https');

const sendEmail = async (to, subject, text) => {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS configuration missing');
  }

  const data = JSON.stringify({
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: to,
      subject: subject,
      message: text,
    },
  });

  const options = {
    hostname: 'api.emailjs.com',
    port: 443,
    path: '/api/v1.0/email/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`EmailJS error: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
};

// OTP email function
const sendOTPEmail = async (to_email, otp) => {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS configuration missing');
  }

  const data = JSON.stringify({
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_email: to_email,
      otp: otp,
      from_name: "AIRSWIFT",
    },
  });

  const options = {
    hostname: 'api.emailjs.com',
    port: 443,
    path: '/api/v1.0/email/send',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`EmailJS error: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
};

// Example OTP generator
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
};

// SMS placeholder (using Africa's Talking)
const sendSMS = async (to, message) => {
  // Implement Africa's Talking API here
  console.log(`Sending SMS to ${to}: ${message}`);
};

const buildEmailForStage = (stage, data) => {
  const templates = {
    application_submitted: {
      subject: 'Application Received',
      text: `Dear ${data.name || 'Applicant'},\n\nThank you for applying to ${data.jobTitle}. Your application is now under review.\n\nBest regards,\nAirswift Team`,
    },
    shortlisted: {
      subject: 'You are shortlisted',
      text: `Dear ${data.name || 'Applicant'},\n\nGreat news: You have been shortlisted for ${data.jobTitle}. Prepare for the interview.\n\nBest regards,\nAirswift Team`,
    },
    interview_scheduled: {
      subject: 'Interview Scheduled',
      text: `Dear ${data.name || 'Applicant'},\n\nYour interview for ${data.jobTitle} is scheduled on ${data.scheduledDate}. Please join at ${data.meetingLink}.\n\nBest regards,\nAirswift Team`,
    },
    interview_attended: {
      subject: 'Interview Completed',
      text: `Dear ${data.name || 'Applicant'},\n\nThank you for attending your interview for ${data.jobTitle}. We will share the next steps shortly.\n\nBest regards,\nAirswift Team`,
    },
    visa_payment_received: {
      subject: 'Visa Payment Received',
      text: `Dear ${data.name || 'Applicant'},\n\nWe have received your visa fee payment for ${data.jobTitle}. Please wait for further guidance.\n\nBest regards,\nAirswift Team`,
    },
    application_rejected: {
      subject: 'Application Update',
      text: `Dear ${data.name || 'Applicant'},\n\nThank you for your application for ${data.jobTitle}. Unfortunately, we are unable to proceed at this time.\n\nBest regards,\nAirswift Team`,
    },
  };

  return templates[stage] || { subject: data.subject || 'Airswift update', text: data.text || '' };
};

const sendStageEmail = async (stage, to, data) => {
  const { subject, text } = buildEmailForStage(stage, data);
  await sendEmail(to, subject, text);
};

module.exports = {
  sendEmail,
  sendSMS,
  sendStageEmail,
  buildEmailForStage,
  sendOTPEmail,
  generateOTP,
};