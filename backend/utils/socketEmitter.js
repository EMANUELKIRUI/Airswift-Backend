/**
 * Socket.io Event Emitter Utility
 * Used to emit real-time events from various parts of the application
 */

let io = null;

// Initialize socket.io instance (called from server.js)
const initializeSocket = (socketInstance) => {
  io = socketInstance;
  console.log('Socket.io initialized for real-time events');
};

// Emit new application event (ONLY to admins)
const emitNewApplication = (applicationData) => {
  if (io) {
    console.log('Emitting new application event to admins:', applicationData);
    const payload = {
      applicationId: applicationData.applicationId || applicationData.id,
      applicantName: applicationData.applicantName || 'New Applicant',
      jobTitle: applicationData.jobTitle,
      email: applicationData.email,
      location: applicationData.location,
      timestamp: new Date(),
      status: 'pending',
      score: applicationData.score || 0
    };

    // 🔥 Send only to admin room
    io.to('admins').emit('newApplication', payload);
    io.to('admins').emit('new_application', payload);
  } else {
    console.warn('Socket.io not initialized');
  }
};

// Emit application status update (ONLY to admins)
const emitApplicationStatusUpdate = (applicationData) => {
  if (io) {
    console.log('Emitting application status update to admins:', applicationData);
    // 🔥 Send only to admin room
    io.to('admins').emit('applicationUpdate', {
      applicationId: applicationData.applicationId || applicationData.id,
      applicantName: applicationData.applicantName,
      jobTitle: applicationData.jobTitle,
      status: applicationData.status,
      timestamp: new Date(),
      updatedBy: applicationData.updatedBy,
      email: applicationData.email
    });
  } else {
    console.warn('Socket.io not initialized');
  }
};

// Emit CV scoring event (ONLY to admins)
const emitCVScoringComplete = (applicationData) => {
  if (io) {
    console.log('Emitting CV scoring complete to admins:', applicationData);
    // 🔥 Send only to admin room
    io.to('admins').emit('cvScoringComplete', {
      applicationId: applicationData.applicationId || applicationData.id,
      applicantName: applicationData.applicantName,
      score: applicationData.score,
      skills: applicationData.skills,
      timestamp: new Date()
    });
  } else {
    console.warn('Socket.io not initialized');
  }
};

// Emit interview scheduled event (ONLY to admins)
const emitInterviewScheduled = (interviewData) => {
  if (io) {
    console.log('Emitting interview scheduled to admins:', interviewData);
    const payload = {
      applicationId: interviewData.applicationId,
      interviewId: interviewData.interviewId,
      applicantName: interviewData.applicantName,
      scheduledDate: interviewData.scheduledDate,
      interviewType: interviewData.interviewType,
      roomId: interviewData.roomId,
      timestamp: new Date()
    };

    // 🔥 Send only to admin room
    io.to('admins').emit('interviewScheduled', payload);
    io.to('admins').emit('new_interview', payload);
  } else {
    console.warn('Socket.io not initialized');
  }
};

// Emit email sent event
const emitEmailSent = (emailData) => {
  if (io) {
    console.log('Emitting email sent:', emailData);
    io.emit('emailSent', {
      applicationId: emailData.applicationId,
      recipientEmail: emailData.recipientEmail,
      recipientName: emailData.recipientName,
      subject: emailData.subject,
      timestamp: new Date()
    });
  } else {
    console.warn('Socket.io not initialized');
  }
};

// Emit offer letter generated
const emitOfferLetterGenerated = (offerData) => {
  if (io) {
    console.log('Emitting offer letter generated:', offerData);
    io.emit('offerLetterGenerated', {
      applicationId: offerData.applicationId,
      applicantName: offerData.applicantName,
      position: offerData.position,
      salary: offerData.salary,
      timestamp: new Date()
    });
  } else {
    console.warn('Socket.io not initialized');
  }
};

// Emit dashboard stats update
const emitDashboardUpdate = (stats) => {
  if (io) {
    console.log('Emitting dashboard update');
    io.emit('dashboardUpdate', {
      stats,
      timestamp: new Date()
    });
  }
};

// Emit bulk email sent event
const emitBulkEmailSent = (emailData) => {
  if (io) {
    console.log('Emitting bulk email sent:', emailData);
    io.emit('bulkEmailSent', {
      count: emailData.count,
      recipients: emailData.recipients,
      subject: emailData.subject,
      timestamp: new Date()
    });
  }
};

// Emit interview rescheduled event
const emitInterviewRescheduled = (interviewData) => {
  if (io) {
    console.log('Emitting interview rescheduled:', interviewData);
    io.emit('interviewRescheduled', {
      interviewId: interviewData.interviewId,
      applicantName: interviewData.applicantName,
      oldDate: interviewData.oldDate,
      newDate: interviewData.newDate,
      timestamp: new Date()
    });
  }
};

// Emit application pipeline update (drag & drop)
const emitApplicationPipelineUpdate = (data) => {
  if (io) {
    console.log('Emitting application pipeline update:', data);
    io.emit('pipelineUpdate', {
      applicationId: data.applicationId,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      applicantName: data.applicantName,
      timestamp: new Date()
    });
  }
};

// Notify admins only (admin dashboard)
const notifyAdminDashboard = (event, data) => {
  if (io) {
    console.log('Notifying admin dashboard:', event);
    io.to('admins').emit(`admin:${event}`, {
      ...data,
      timestamp: new Date()
    });
  }
};

const emitAuditLog = (log) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const payload = typeof log.get === 'function' ? log.get({ plain: true }) : log;
  io.emit('audit:new', payload);
  io.to('admins').emit('new_audit_log', payload);
};

const emitSecurityAlert = (alertData) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const payload = {
    ...alertData,
    time: new Date(),
  };

  io.to('admins').emit('security:alert', payload);
};

const emitAdminUserUpdate = (payload) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  io.to('admins').emit('user:updated', {
    ...payload,
    timestamp: new Date(),
  });
};

const emitUserEvent = (userId, event, payload) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  if (!userId) {
    console.warn('emitUserEvent missing userId');
    return;
  }

  io.to(`user_${userId}`).emit(event, {
    ...payload,
    timestamp: new Date(),
  });
};

const emitUserAction = (actionData) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  io.to('admins').emit('user_action', {
    ...actionData,
    timestamp: new Date()
  });
};

const emitNotification = (notificationData) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const { userId, notification } = notificationData;
  if (!userId) {
    console.warn('Notification missing userId');
    return;
  }

  io.to(`user_${userId}`).emit('new_notification', {
    notification: {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      is_read: notification.is_read,
      createdAt: notification.createdAt,
    },
  });
};

const emitDirectMessage = (message) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
  const receiverId = message.receiverId?._id?.toString() || message.receiverId?.toString();

  if (!senderId || !receiverId) {
    console.warn('Message missing sender or receiver id');
    return;
  }

  console.log('Emitting direct message:', { senderId, receiverId });
  io.to(`user_${receiverId}`).emit('new_message', { message });
  io.to(`user_${senderId}`).emit('new_message', { message });
};

module.exports = {
  initializeSocket,
  emitNewApplication,
  emitApplicationStatusUpdate,
  emitCVScoringComplete,
  emitInterviewScheduled,
  emitEmailSent,
  emitOfferLetterGenerated,
  emitDashboardUpdate,
  emitBulkEmailSent,
  emitInterviewRescheduled,
  emitApplicationPipelineUpdate,
  notifyAdminDashboard,
  emitAuditLog,
  emitSecurityAlert,
  emitAdminUserUpdate,
  emitUserEvent,
  emitUserAction,
  emitDirectMessage,
  emitNotification,
};
