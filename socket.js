import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "https://airswift-backend-fjt3.onrender.com";
let socket = null;

export const connectSocket = (token) => {
  if (!token) {
    console.warn("⚠️ No token provided for socket connection");
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connect error:", error);
  });

  return socket;
};

export const initSocket = connectSocket;

export const reconnectSocketConnection = (token) => {
  console.log("🔌 Reconnecting socket with token...");

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  return connectSocket(authToken);
};

export const disconnectSocketConnection = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export default {
  connectSocket,
  initSocket,
  reconnectSocketConnection,
  disconnectSocketConnection,
  getSocket,
};
