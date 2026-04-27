let ioInstance = null;

const initializeSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join("user_" + userId);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

const getIO = () => ioInstance;

module.exports = {
  initializeSocket,
  getIO,
};
