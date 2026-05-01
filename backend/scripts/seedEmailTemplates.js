const mongoose = require('mongoose');
const EmailTemplate = require('../models/EmailTemplate');

const seedEmailTemplates = async () => {
  try {
    const templates = [
      {
        name: 'interview_invitation',
        subject: 'Interview Invitation - {{job_title}}',
        body: `Dear {{name}},

Congratulations! You have been shortlisted for the position of {{job_title}}.

Your interview is scheduled for:
Date: {{date}}
Time: {{time}}

Please prepare for your interview and arrive on time. You will receive further instructions via email.

Best regards,
AIRSWIFT HR Team`
      },
      {
        name: 'application_rejection',
        subject: 'Application Update - {{job_title}}',
        body: `Dear {{name}},

Thank you for your interest in the {{job_title}} position at AIRSWIFT.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.

We appreciate the time and effort you invested in your application and encourage you to apply for future opportunities that may be a better fit.

Best regards,
AIRSWIFT HR Team`
      },
      {
        name: 'application_shortlisted',
        subject: 'Congratulations - You are Shortlisted!',
        body: `Dear {{name}},

Great news! You have been shortlisted for the {{job_title}} position.

Our team will be in touch soon with interview details and next steps.

Best regards,
AIRSWIFT HR Team`
      }
    ];

    for (const template of templates) {
      const existing = await EmailTemplate.findOne({ name: template.name });
      if (!existing) {
        await EmailTemplate.create(template);
        console.log(`Created template: ${template.name}`);
      } else {
        console.log(`Template ${template.name} already exists`);
      }
    }

    console.log('Email templates seeded successfully');
  } catch (error) {
    console.error('Error seeding email templates:', error);
  }
};

module.exports = { seedEmailTemplates };