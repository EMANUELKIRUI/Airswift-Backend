const { Op } = require('sequelize');
const { Interview, Application, Job, InterviewFeedback, InterviewParticipant } = require('../models');
const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');
const { sendStageEmail, sendSMS } = require('../utils/notifications');
const { createZoomMeeting } = require('./zoomService');
const { emitInterviewScheduled, emitInterviewRescheduled } = require('../utils/socketEmitter');

const DEFAULT_DURATION = 30;
const STATUS_VALUES = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];

const parseInterviewFilters = async (query) => {
  const where = {};
  const applicationWhere = {};
  const include = [
    {
      model: Application,
      include: [{ model: Job, attributes: ['id', 'title', 'category_id'] }],
    }
  ];

  if (query.status) {
    where.status = query.status;
  }

  if (query.start_date || query.end_date) {
    where.scheduled_at = {};
    if (query.start_date) where.scheduled_at[Op.gte] = new Date(query.start_date);
    if (query.end_date) {
      const endDate = new Date(query.end_date);
      endDate.setHours(23, 59, 59, 999);
      where.scheduled_at[Op.lte] = endDate;
    }
  }

  if (query.interviewer) {
    const interviewerId = query.interviewer;
    where[Op.or] = [
      { interviewer_id: interviewerId },
      { interviewer_ids: { [Op.like]: `%\"${interviewerId}\"%` } }
    ];
  }

  if (query.job_role) {
    applicationWhere['$Application.Job.title$'] = { [Op.like]: `%${query.job_role}%` };
  }

  if (query.search) {
    const userSearch = query.search;
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: userSearch, $options: 'i' } },
        { email: { $regex: userSearch, $options: 'i' } },
      ]
    }).select('_id');
    const userIds = matchingUsers.map((user) => user._id.toString());
    if (userIds.length) {
      applicationWhere.user_id = { [Op.in]: userIds };
    } else {
      applicationWhere.user_id = null;
    }
  }

  if (Object.keys(applicationWhere).length) {
    include[0].where = applicationWhere;
  }

  return { where, include };
};

const formatInterview = async (interview) => {
  const raw = interview.toJSON ? interview.toJSON() : interview;
  const application = raw.Application || null;
  const candidateId = application?.user_id;
  const candidate = candidateId ? await User.findById(candidateId).lean() : null;
  const interviewerIds = raw.interviewer_ids || [];
  const interviewers = interviewerIds.length ? await User.find({ _id: { $in: interviewerIds } }).select('name email role').lean() : [];

  return {
    ...raw,
    candidate: candidate ? {
      id: candidate._id.toString(),
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
    } : null,
    job: application?.Job ? {
      id: application.Job.id,
      title: application.Job.title,
    } : null,
    interviewers,
    scheduled_at: raw.scheduled_at,
    status: raw.status,
  };
};

const getInterviewList = async ({ page = 1, limit = 20, sortBy = 'scheduled_at', sortOrder = 'DESC', ...filters }) => {
  const offset = (page - 1) * limit;
  const { where, include } = await parseInterviewFilters(filters);
  const order = [[sortBy, sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

  const { count, rows } = await Interview.findAndCountAll({
    where,
    include,
    order,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
  });

  const interviews = await Promise.all(rows.map(formatInterview));
  return {
    interviews,
    pagination: {
      total: count,
      page: parseInt(page, 10),
      pages: Math.ceil(count / limit),
      limit: parseInt(limit, 10),
    }
  };
};

const getInterviewById = async (id) => {
  const interview = await Interview.findByPk(id, {
    include: [
      {
        model: Application,
        include: [{ model: Job }],
      }
    ],
  });
  if (!interview) return null;

  const formatted = await formatInterview(interview);
  formatted.participants = await InterviewParticipant.findAll({ where: { interview_id: id } });
  formatted.feedback = await InterviewFeedback.findAll({ where: { interview_id: id } });
  return formatted;
};

const getInterviewCalendar = async (month) => {
  const [year, monthNumber] = (month || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const start = new Date(year, monthNumber - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, monthNumber, 0, 23, 59, 59, 999);

  const interviews = await Interview.findAll({
    where: {
      scheduled_at: {
        [Op.between]: [start, end]
      },
      status: { [Op.notIn]: ['cancelled'] }
    },
    include: [
      {
        model: Application,
        include: [{ model: Job, attributes: ['title'] }]
      }
    ],
    order: [['scheduled_at', 'ASC']],
  });

  const users = await User.find({ _id: { $in: interviews.map(i => i.Application?.user_id).filter(Boolean) } }).select('name').lean();
  const userMap = users.reduce((acc, user) => ({ ...acc, [user._id.toString()]: user }), {});

  const events = interviews.map((interview) => {
    const raw = interview.toJSON();
    const jobTitle = raw.Application?.Job?.title || 'Interview';
    const candidate = userMap[raw.Application?.user_id] || { name: 'Candidate' };
    const color = getStatusColor(raw.status);
    return {
      id: raw.id,
      title: `${candidate.name} • ${jobTitle}`,
      start: raw.scheduled_at,
      end: new Date(new Date(raw.scheduled_at).getTime() + (raw.duration || DEFAULT_DURATION) * 60000),
      status: raw.status,
      type: raw.type,
      meeting_link: raw.meeting_link,
      color,
      raw,
    };
  });

  const grouped = events.reduce((acc, event) => {
    const dateKey = event.start.toISOString().slice(0, 10);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return {
    month: `${year}-${String(monthNumber).padStart(2, '0')}`,
    events,
    grouped,
  };
};

const getStatusColor = (status) => {
  switch (status) {
    case 'scheduled': return 'blue';
    case 'completed': return 'green';
    case 'no_show': return 'red';
    case 'cancelled': return 'gray';
    case 'rescheduled': return 'orange';
    case 'in_progress': return 'teal';
    default: return 'blue';
  }
};

const loadInterviewers = async (ids) => {
  if (!Array.isArray(ids) || !ids.length) return [];
  return User.find({ _id: { $in: ids } }).select('name email role').lean();
};

const buildMeetingLink = async ({ type, meeting_link, application, scheduled_at }) => {
  if (meeting_link) return meeting_link;

  if (type === 'video') {
    try {
      return await createZoomMeeting({
        topic: `Interview for ${application.Job.title}`,
        startTime: scheduled_at,
        duration: DEFAULT_DURATION,
        timezone: 'UTC',
      });
    } catch (error) {
      console.error('Zoom meeting generation failed:', error.message);
      return null;
    }
  }

  return null;
};

const buildInterviewParticipants = async (interviewId, application, interviewerIds) => {
  const records = [];
  if (application?.user_id) {
    records.push({ interview_id: interviewId, user_id: application.user_id, role: 'candidate' });
  }
  for (const id of interviewerIds || []) {
    records.push({ interview_id: interviewId, user_id: id, role: 'interviewer' });
  }
  await InterviewParticipant.bulkCreate(records);
};

const checkForOverlap = async ({ interviewId, interviewerIds, scheduled_at, duration }) => {
  const start = new Date(scheduled_at);
  const end = new Date(start.getTime() + (duration || DEFAULT_DURATION) * 60000);

  const existing = await Interview.findAll({
    where: {
      id: { [Op.ne]: interviewId || 0 },
      status: { [Op.notIn]: ['cancelled'] },
    }
  });

  for (const candidate of existing) {
    const candidateStart = new Date(candidate.scheduled_at);
    const candidateEnd = new Date(candidateStart.getTime() + (candidate.duration || DEFAULT_DURATION) * 60000);
    const hasInterviewer = interviewerIds.some((id) => {
      return candidate.interviewer_id === id || (Array.isArray(candidate.interviewer_ids) && candidate.interviewer_ids.includes(id));
    });
    if (!hasInterviewer) continue;
    if (start < candidateEnd && end > candidateStart) {
      return true;
    }
  }

  return false;
};

const scheduleInterview = async ({ payload, adminId, req }) => {
  const application = await Application.findByPk(payload.application_id, { include: [{ model: Job }] });
  if (!application) throw new Error('Application not found');

  const interviewerIds = Array.isArray(payload.interviewer_ids) ? payload.interviewer_ids : [adminId];
  if (!interviewerIds.length) interviewerIds.push(adminId);

  const overlap = await checkForOverlap({ interviewerIds, scheduled_at: payload.scheduled_at, duration: payload.duration || DEFAULT_DURATION });
  if (overlap) {
    throw new Error('Interviewer has a conflicting interview at the requested time');
  }

  const meeting_link = await buildMeetingLink({
    type: payload.type,
    meeting_link: payload.meeting_link,
    application,
    scheduled_at: payload.scheduled_at,
  });

  const interview = await Interview.create({
    application_id: payload.application_id,
    interviewer_id: adminId,
    interviewer_ids: interviewerIds,
    room_id: `interview-${payload.application_id}-${Date.now()}`,
    type: payload.type,
    mode: payload.mode,
    scheduled_at: payload.scheduled_at,
    duration: payload.duration || DEFAULT_DURATION,
    timezone: payload.timezone || 'UTC',
    meeting_link,
    notes: payload.notes || null,
    status: 'scheduled',
  });

  await InterviewParticipant.destroy({ where: { interview_id: interview.id } });
  await buildInterviewParticipants(interview.id, application, interviewerIds);

  if (application && application.user_id) {
    const candidate = await User.findById(application.user_id).lean();
    if (candidate?.email) {
      await sendStageEmail('interview_scheduled', candidate.email, {
        name: candidate.name || 'Candidate',
        jobTitle: application.Job.title,
        scheduledDate: new Date(payload.scheduled_at).toLocaleString(),
        meetingLink: meeting_link || 'To be shared',
      });
      if (candidate.phone) {
        await sendSMS(candidate.phone, `Your interview for ${application.Job.title} is scheduled on ${new Date(payload.scheduled_at).toLocaleString()}.`);
      }
    }
  }

  emitInterviewScheduled({
    applicationId: application.id,
    interviewId: interview.id,
    scheduled_at: payload.scheduled_at,
    type: payload.type,
    meeting_link,
    applicantId: application.user_id,
  });

  await logAuditEvent(adminId, 'interview_created', 'interview', interview.id, {
    application_id: payload.application_id,
    scheduled_at: payload.scheduled_at,
    duration: payload.duration || DEFAULT_DURATION,
    mode: payload.mode,
    meeting_link,
  }, req);

  return await getInterviewById(interview.id);
};

const updateInterview = async ({ id, payload, adminId, req }) => {
  const interview = await Interview.findByPk(id, {
    include: [{ model: Application, include: [Job] }]
  });
  if (!interview) throw new Error('Interview not found');

  if (payload.interviewer_ids) {
    const overlap = await checkForOverlap({ interviewId: id, interviewerIds: payload.interviewer_ids, scheduled_at: payload.scheduled_at || interview.scheduled_at, duration: payload.duration || interview.duration });
    if (overlap) {
      throw new Error('Interviewer has a conflicting interview at the requested time');
    }
  }

  if (payload.scheduled_at && !payload.meeting_link && interview.type === 'video') {
    payload.meeting_link = await buildMeetingLink({ type: interview.type, meeting_link: payload.meeting_link, application: interview.Application, scheduled_at: payload.scheduled_at });
  }

  const updated = await interview.update({
    interviewer_ids: payload.interviewer_ids || interview.interviewer_ids,
    type: payload.type || interview.type,
    mode: payload.mode || interview.mode,
    scheduled_at: payload.scheduled_at || interview.scheduled_at,
    duration: payload.duration || interview.duration,
    timezone: payload.timezone || interview.timezone,
    meeting_link: payload.meeting_link || interview.meeting_link,
    notes: payload.notes !== undefined ? payload.notes : interview.notes,
    status: payload.status || interview.status,
    cancel_reason: payload.cancel_reason !== undefined ? payload.cancel_reason : interview.cancel_reason,
    rescheduled_from: payload.rescheduled_from || interview.rescheduled_from,
  });

  if (payload.interviewer_ids) {
    await InterviewParticipant.destroy({ where: { interview_id: id } });
    await buildInterviewParticipants(id, interview.Application, payload.interviewer_ids);
  }

  await logAuditEvent(adminId, 'interview_updated', 'interview', id, { updates: payload }, req);
  return await getInterviewById(id);
};

const rescheduleInterview = async ({ id, payload, adminId, req }) => {
  const interview = await Interview.findByPk(id, { include: [{ model: Application, include: [Job] }] });
  if (!interview) throw new Error('Interview not found');

  const interviewers = payload.interviewer_ids || interview.interviewer_ids || [interview.interviewer_id];
  const overlap = await checkForOverlap({ interviewId: id, interviewerIds: interviewers, scheduled_at: payload.scheduled_at, duration: payload.duration || interview.duration });
  if (overlap) {
    throw new Error('Interviewer has a conflicting interview at the requested time');
  }

  const oldDate = interview.scheduled_at;
  const updated = await interview.update({
    scheduled_at: payload.scheduled_at,
    duration: payload.duration || interview.duration,
    timezone: payload.timezone || interview.timezone,
    meeting_link: payload.meeting_link || interview.meeting_link,
    notes: payload.notes !== undefined ? payload.notes : interview.notes,
    status: 'rescheduled',
    rescheduled_from: oldDate,
  });

  await InterviewParticipant.destroy({ where: { interview_id: id } });
  await buildInterviewParticipants(id, interview.Application, interviewers);

  if (interview.Application?.user_id) {
    const candidate = await User.findById(interview.Application.user_id).lean();
    if (candidate?.email) {
      await sendStageEmail('interview_scheduled', candidate.email, {
        name: candidate.name || 'Candidate',
        jobTitle: interview.Application.Job.title,
        scheduledDate: new Date(payload.scheduled_at).toLocaleString(),
        meetingLink: updated.meeting_link || 'To be shared',
      });
    }
  }

  emitInterviewRescheduled({
    interviewId: id,
    applicantName: interview.Application?.Job?.title,
    oldDate,
    newDate: payload.scheduled_at,
  });

  await logAuditEvent(adminId, 'interview_rescheduled', 'interview', id, { oldDate, newDate: payload.scheduled_at }, req);
  return await getInterviewById(id);
};

const updateInterviewStatus = async ({ id, payload, adminId, req }) => {
  const interview = await Interview.findByPk(id, { include: [{ model: Application, include: [Job] }] });
  if (!interview) throw new Error('Interview not found');
  if (!STATUS_VALUES.includes(payload.status)) throw new Error('Invalid interview status');

  const updated = await interview.update({
    status: payload.status,
    cancel_reason: payload.cancel_reason !== undefined ? payload.cancel_reason : interview.cancel_reason,
    notes: payload.notes !== undefined ? payload.notes : interview.notes,
    started_at: payload.status === 'in_progress' && !interview.started_at ? new Date() : interview.started_at,
    ended_at: payload.status === 'completed' && !interview.ended_at ? new Date() : interview.ended_at,
  });

  if (interview.Application?.user_id) {
    const candidate = await User.findById(interview.Application.user_id).lean();
    if (candidate?.email) {
      const subjectMap = {
        completed: 'interview_attended',
        cancelled: 'interview_cancelled',
        no_show: 'application_rejected',
      };
      const stage = subjectMap[payload.status] || null;
      if (stage) {
        await sendStageEmail(stage, candidate.email, {
          name: candidate.name || 'Candidate',
          jobTitle: interview.Application.Job.title,
          scheduledDate: new Date(interview.scheduled_at).toLocaleString(),
          meetingLink: interview.meeting_link || 'To be shared',
        });
      }
    }
  }

  await logAuditEvent(adminId, 'interview_status_updated', 'interview', id, { status: payload.status }, req);
  return await getInterviewById(id);
};

const getInterviewMetrics = async () => {
  const scheduled = await Interview.count({ where: { status: 'scheduled' } });
  const completed = await Interview.count({ where: { status: 'completed' } });
  const noShow = await Interview.count({ where: { status: 'no_show' } });
  const cancelled = await Interview.count({ where: { status: 'cancelled' } });
  const rescheduled = await Interview.count({ where: { status: 'rescheduled' } });
  const total = scheduled + completed + noShow + cancelled + rescheduled;

  return {
    scheduled,
    completed,
    noShow,
    cancelled,
    rescheduled,
    total,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    noShowRate: total ? Math.round((noShow / total) * 100) : 0,
    rescheduleRate: total ? Math.round((rescheduled / total) * 100) : 0,
  };
};

const getFeedbackForInterview = async (interviewId) => {
  return InterviewFeedback.findAll({ where: { interview_id: interviewId }, order: [['created_at', 'DESC']] });
};

const addInterviewFeedback = async ({ interviewId, payload, adminId, req }) => {
  const interview = await Interview.findByPk(interviewId);
  if (!interview) throw new Error('Interview not found');
  if (!payload.rating) throw new Error('Rating is required');

  const feedback = await InterviewFeedback.create({
    interview_id: interviewId,
    interviewer_id: payload.interviewer_id || adminId,
    rating: payload.rating,
    comments: payload.comments || null,
  });

  await logAuditEvent(adminId, 'interview_feedback_added', 'interview', interviewId, { rating: payload.rating }, req);
  return feedback;
};

module.exports = {
  getInterviewList,
  getInterviewById,
  getInterviewCalendar,
  scheduleInterview,
  updateInterview,
  rescheduleInterview,
  updateInterviewStatus,
  getInterviewMetrics,
  addInterviewFeedback,
  getFeedbackForInterview,
  STATUS_VALUES,
};
