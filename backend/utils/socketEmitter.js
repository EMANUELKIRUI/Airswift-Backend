let io;

const initSocket = (serverIO) => {
  io = serverIO;
};

const emitApplicationUpdate = (userId, app) => {
  if (!io) return;
  io.to(`user_${userId}`).emit("application_updated", app);
};

const emitInterviewScheduled = (userId, interview) => {
  if (!io) return;
  io.to(`user_${userId}`).emit("interview_scheduled", interview);
};

const emitNotification = (userId, notification) => {
  if (!io) return;
  io.to(`user_${userId}`).emit("notification", notification);
};

module.exports = {
  initSocket,
  emitApplicationUpdate,
  emitInterviewScheduled,
  emitNotification,
};
