const initializeSocket = (io) => {
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

module.exports = initializeSocket;
