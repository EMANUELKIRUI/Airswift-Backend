const Joi = require('joi');
const { Application, User, Interview } = require('../models');
const { generateInterviewQuestions, scoreInterviewResponse, generateOverallInterviewScore } = require('../utils/aiInterview');
const { logAuditEvent } = require('../utils/auditLogger');
const { sendStageEmail } = require('../utils/notifications');
const { sendInterviewInvitation } = require('../services/emailService');
const { createZoomMeeting } = require('../services/zoomService');
const { emitInterviewScheduled, emitInterviewRescheduled } = require('../utils/socketEmitter');
const interviewService = require('../services/interviewService');

// Validation schemas
const createInterviewSchema = Joi.object({
  application_id: Joi.number().integer().required(),
  scheduled_at: Joi.date().required(),
  type: Joi.string().valid('video', 'voice_ai', 'in_person').default('video'),
  mode: Joi.string().valid('online', 'in_person', 'hybrid').default('online'),
  duration: Joi.number().integer().min(10).default(30),
  timezone: Joi.string().optional().default('UTC'),
  meeting_link: Joi.string().uri().optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
  interviewer_ids: Joi.array().items(Joi.string()).optional(),
});

const updateInterviewSchema = Joi.object({
  status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled').optional(),
  notes: Joi.string().optional().allow('', null),
  ai_responses: Joi.array().optional(),
  type: Joi.string().valid('video', 'voice_ai', 'in_person').optional(),
  mode: Joi.string().valid('online', 'in_person', 'hybrid').optional(),
  duration: Joi.number().integer().min(10).optional(),
  timezone: Joi.string().optional(),
  meeting_link: Joi.string().uri().optional().allow('', null),
  interviewer_ids: Joi.array().items(Joi.string()).optional(),
  cancel_reason: Joi.string().optional().allow('', null),
});

const rescheduleInterviewSchema = Joi.object({
  scheduled_at: Joi.date().required(),
  duration: Joi.number().integer().min(10).optional(),
  timezone: Joi.string().optional(),
  meeting_link: Joi.string().uri().optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
  interviewer_ids: Joi.array().items(Joi.string()).optional(),
});

const updateInterviewStatusSchema = Joi.object({
  status: Joi.string().valid('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled').required(),
  cancel_reason: Joi.string().optional().allow('', null),
  notes: Joi.string().optional().allow('', null),
});

const createFeedbackSchema = Joi.object({
  interviewer_id: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comments: Joi.string().optional().allow('', null),
});

// Create new interview
const createInterview = async (req, res) => {
  try {
    const { error, value } = createInterviewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await interviewService.scheduleInterview({ payload: value, adminId: req.user.id, req });
    res.status(201).json(interview);
  } catch (error) {
    console.error('createInterview error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const createVoiceSession = async (req, res) => {
  try {
    const { jobRole, candidateName } = req.body;

    const sessionId = `voice_${req.user.id}_${Date.now()}`;
    res.json({
      sessionId,
      userId: req.user.id,
      jobRole: jobRole || 'Candidate',
      candidateName: candidateName || req.user.name || 'Candidate',
    });
  } catch (error) {
    console.error('createVoiceSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get interview by ID
const getInterview = async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Application, include: [{ model: require('../models').Job }] }
      ],
    });

    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    const application = interview.Application;
    const user = application?.user_id ? await User.findById(application.user_id) : null;

    res.json({
      ...interview.toJSON(),
      applicant: user,
    });
  } catch (error) {
    console.error('getInterview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update interview
const updateInterview = async (req, res) => {
  try {
    const { error, value } = updateInterviewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await interviewService.updateInterview({ id: req.params.id, payload: value, adminId: req.user.id, req });
    res.json(interview);
  } catch (error) {
    console.error('updateInterview error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get interviews for admin
const getAdminInterviews = async (req, res) => {
  try {
    const result = await interviewService.getInterviewList(req.query);
    res.json(result);
  } catch (error) {
    console.error('getAdminInterviews error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get user's interviews
const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.findAll({
      include: [{
        model: Application,
        where: { user_id: req.user.id },
        include: [{ model: require('../models').Job }],
      }],
    });
    res.json(interviews);
  } catch (error) {
    console.error('getMyInterviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getInterviewCalendar = async (req, res) => {
  try {
    const calendar = await interviewService.getInterviewCalendar(req.query.month);
    res.json(calendar);
  } catch (error) {
    console.error('getInterviewCalendar error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const rescheduleInterview = async (req, res) => {
  try {
    const { error, value } = rescheduleInterviewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await interviewService.rescheduleInterview({ id: req.params.id, payload: value, adminId: req.user.id, req });
    res.json(interview);
  } catch (error) {
    console.error('rescheduleInterview error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const updateInterviewStatus = async (req, res) => {
  try {
    const { error, value } = updateInterviewStatusSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await interviewService.updateInterviewStatus({ id: req.params.id, payload: value, adminId: req.user.id, req });
    res.json(interview);
  } catch (error) {
    console.error('updateInterviewStatus error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getInterviewMetrics = async (req, res) => {
  try {
    const metrics = await interviewService.getInterviewMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('getInterviewMetrics error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getInterviewFeedback = async (req, res) => {
  try {
    const feedback = await interviewService.getFeedbackForInterview(req.params.id);
    res.json(feedback);
  } catch (error) {
    console.error('getInterviewFeedback error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const addInterviewFeedback = async (req, res) => {
  try {
    const { error, value } = createFeedbackSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const feedback = await interviewService.addInterviewFeedback({ interviewId: req.params.id, payload: value, adminId: req.user.id, req });
    res.status(201).json(feedback);
  } catch (error) {
    console.error('addInterviewFeedback error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Score interview response (for real-time AI scoring)
const scoreResponse = async (req, res) => {
  try {
    const { question, response, jobRequirements } = req.body;

    const score = await scoreInterviewResponse(question, response, jobRequirements);

    res.json({ score });
  } catch (error) {
    console.error('scoreResponse error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Legacy functions for backward compatibility
const scheduleInterview = async (req, res) => {
  try {
    const interviewSchema = Joi.object({
      application_id: Joi.number().integer().required(),
      scheduled_date: Joi.date().required(),
      meeting_link: Joi.string(),
      notes: Joi.string(),
    });

    const { error } = interviewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const interview = await Interview.create({
      application_id: req.body.application_id,
      interviewer_id: req.user.id,
      room_id: `legacy-${req.body.application_id}-${Date.now()}`,
      scheduled_at: req.body.scheduled_date,
      notes: req.body.notes,
    });

    // Notify user
    const application = await Application.findByPk(req.body.application_id, { include: [require('../models').Job] });
    const user = application?.user_id ? await User.findById(application.user_id) : null;
    if (application && user) {
      await sendStageEmail('interview_scheduled', user.email, {
        name: user.name,
        jobTitle: application.Job?.title,
        scheduledDate: new Date(req.body.scheduled_date).toLocaleDateString(),
        meetingLink: req.body.meeting_link,
      });
    }

    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const OpenAI = require('openai');

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// AI Interview Bot - Interactive Q&A
const askAIInterview = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    const systemMessage = {
      role: "system",
      content: "You are a strict technical interviewer. Ask one question at a time and evaluate answers. Be professional, thorough, and provide constructive feedback. Keep responses concise but informative."
    };

    const conversation = [systemMessage, ...messages];

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4",
      messages: conversation,
      max_tokens: 500,
      temperature: 0.7,
    });

    res.json({
      reply: response.choices[0].message.content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('askAIInterview error:', error);
    res.status(500).json({
      message: 'AI interview service temporarily unavailable',
      reply: 'I apologize, but I\'m currently unable to process your response. Please try again in a moment.'
    });
  }
};

// CV AI Scorer
const scoreCV = async (req, res) => {
  try {
    const { cvText, jobRole } = req.body;

    if (!cvText || !jobRole) {
      return res.status(400).json({ message: 'CV text and job role are required' });
    }

    const prompt = `
You are an expert HR AI recruiter analyzing a candidate's CV for a ${jobRole} position.

CV Content:
${cvText}

Please analyze this CV and provide a detailed assessment in the following JSON format:
{
  "score": 0-100,
  "skills": ["skill1", "skill2", "skill3"],
  "summary": "Brief 2-3 sentence summary of candidate's fit",
  "recommendation": "hire" | "shortlist" | "reject",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "experience_level": "entry" | "mid" | "senior" | "expert"
}

Be thorough and objective in your analysis. Consider technical skills, experience, education, and cultural fit.
`;

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content.trim());

    // Log audit event
    await logAuditEvent(req.user?.id || null, 'cv_ai_scored', 'cv_analysis', null, {
      job_role: jobRole,
      score: result.score,
      recommendation: result.recommendation
    }, req);

    res.json(result);
  } catch (error) {
    console.error('scoreCV error:', error);
    res.status(500).json({
      message: 'CV scoring service temporarily unavailable',
      score: 50,
      skills: [],
      summary: 'Unable to analyze CV at this time',
      recommendation: 'shortlist'
    });
  }
};

// Autonomous Recruiter AI Agent
const autonomousRecruiter = async (req, res) => {
  try {
    const { applications, jobDescription } = req.body;

    if (!applications || !Array.isArray(applications) || !jobDescription) {
      return res.status(400).json({ message: 'Applications array and job description are required' });
    }

    const prompt = `
You are an autonomous HR recruiter AI making data-driven hiring decisions.

Job Description:
${jobDescription}

Candidate Applications (JSON format):
${JSON.stringify(applications, null, 2)}

Your tasks:
1. Analyze each candidate's qualifications, experience, and fit for the role
2. Score each candidate on a scale of 0-100 based on job requirements
3. Rank all candidates by score (highest first)
4. Select the top 3 candidates for interviews (if 3+ candidates available)
5. Identify candidates to reject (score below 40)
6. Provide detailed reasoning for each decision

Return ONLY valid JSON in this exact format:
{
  "topCandidates": [
    {
      "id": "candidate_id",
      "name": "candidate_name",
      "score": 85,
      "reasoning": "Why they were selected"
    }
  ],
  "rejected": [
    {
      "id": "candidate_id",
      "name": "candidate_name",
      "score": 25,
      "reasoning": "Why they were rejected"
    }
  ],
  "reasoning": "Overall analysis and hiring strategy summary",
  "recommendations": ["action1", "action2", "action3"]
}
`;

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content.trim());

    // Log audit event
    await logAuditEvent(req.user?.id || null, 'autonomous_recruiter_run', 'bulk_analysis', null, {
      candidates_count: applications.length,
      top_candidates: result.topCandidates?.length || 0,
      rejected: result.rejected?.length || 0
    }, req);

    res.json(result);
  } catch (error) {
    console.error('autonomousRecruiter error:', error);
    res.status(500).json({
      message: 'Autonomous recruiter service temporarily unavailable',
      topCandidates: [],
      rejected: [],
      reasoning: 'Unable to process applications at this time'
    });
  }
};

// Batch rank applications using real CV scoring algorithm
const rankApplicationsViaAI = async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'jobId is required' });

    const { cvScorer } = require('../utils/cvScorer');
    
    const job = await Job.findByPk(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const applications = await Application.findAll({
      where: { job_id: jobId },
      include: [{ model: require('../models').Job }]
    });

    if (!applications.length) {
      return res.json({ ranked: [], total: 0 });
    }

    // Score each application
    const ranked = applications
      .map(app => ({
        ...app.toJSON(),
        scoreDetails: require('../utils/cvScorer').scoreCV(
          {
            skills: app.skills || [],
            yearsOfExperience: app.yearsOfExperience || 0,
            education: app.education || '',
            text: app.cvText || ''
          },
          {
            requiredSkills: job.required_skills || [],
            requiredExperience: job.experience_required || 0,
            requiredEducation: job.education_required || 'bachelor',
            description: job.description || job.title
          }
        ),
        score: 0 // Will be updated below
      }))
      .map(app => ({
        ...app,
        score: app.scoreDetails.totalScore
      }))
      .sort((a, b) => b.score - a.score);

    // Log audit event
    await logAuditEvent(req.user.id, 'applications_ranked', 'ranking', null, {
      job_id: jobId,
      total_applications: ranked.length,
      top_score: ranked[0]?.score || 0
    }, req);

    res.json({
      ranked,
      total: ranked.length,
      jobTitle: job.title,
      topCandidates: ranked.slice(0, 3)
    });
  } catch (error) {
    console.error('rankApplicationsViaAI error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createInterview,
  getInterview,
  updateInterview,
  getAdminInterviews,
  getMyInterviews,
  scoreResponse,
  scheduleInterview, // Legacy
  askAIInterview,
  scoreCV,
  autonomousRecruiter,
  rankApplicationsViaAI,
  createVoiceSession
};