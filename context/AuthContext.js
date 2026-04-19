import { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "../api";
import { io } from "socket.io-client";
import { useNotification } from "./NotificationContext";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const { addNotification } = useNotification();

  const fetchUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
      return res.data.user;
    } catch {
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SOCKET CONNECTOR
  const connectSocket = (token) => {
    if (socketRef.current) return;

    socketRef.current = io(process.env.REACT_APP_API_URL, {
      auth: { token },
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socketRef.current.on("status:update", (data) => {
      console.log("📡 Status update:", data);

      setUser((prev) => ({
        ...prev,
        applicationStatus: data.status,
      }));

      addNotification(data.message);
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser().then((user) => {
        if (user) connectSocket(token);
      });
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, refreshUser: fetchUser, socket: socketRef.current }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);