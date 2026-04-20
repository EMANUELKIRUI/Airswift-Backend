import { createContext, useContext, useEffect, useState, useRef } from "react";
import api from "../api";
import { initSocket, disconnectSocketConnection } from "../socket";
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
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 SOCKET CONNECTOR
  const connectSocket = (token) => {
    if (!token) {
      console.warn("⚠️ No token available for socket connection.");
      return;
    }

    if (socketRef.current?.connected) {
      return socketRef.current;
    }

    const socket = initSocket(token);
    if (!socket) return;

    socketRef.current = socket;

    socket.on("status:update", (data) => {
      console.log("📡 Status update:", data);

      setUser((prev) => ({
        ...prev,
        applicationStatus: data.status,
      }));

      addNotification(data.message);
    });

    return socket;
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

    return () => {
      disconnectSocketConnection();
      socketRef.current = null;
    };
  }, []);

  const login = (userData, token, onSuccess) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    connectSocket(token);

    // Redirect based on role if callback provided
    if (typeof onSuccess === 'function') {
      onSuccess(userData);
    } else if (typeof window !== 'undefined') {
      // Fallback: Redirect based on role
      const redirectPath = userData?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      const currentPath = window.location.pathname;
      
      // Only redirect if not already on the target page
      if (currentPath !== redirectPath && currentPath !== '/') {
        window.location.href = redirectPath;
      }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocketConnection();
    socketRef.current = null;
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, refreshUser: fetchUser, socket: socketRef.current, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);