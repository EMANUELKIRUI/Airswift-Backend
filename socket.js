// ✅ FIXED: Socket.IO Client Configuration with Authentication
// This file provides authenticated Socket.IO connections

import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'https://airswift-backend-fjt3.onrender.com';

let socket = null;

// Create authenticated socket connection
const createSocket = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('⚠️ No token found for Socket.IO connection - socket will be created after login');
    return null;
  }

  if (socket && socket.connected) {
    console.log('🔌 Socket already connected:', socket.id);
    return socket;
  }

  console.log('🔌 Connecting to Socket.IO...');

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      token: token // Send token for authentication
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
    // Try to reconnect with fresh token on error
    setTimeout(() => {
      const freshToken = localStorage.getItem('token');
      if (freshToken && socket) {
        socket.auth.token = freshToken;
        socket.connect();
      }
    }, 2000);
  });

  return socket;
};

// Disconnect socket
const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected');
  }
};

// Reconnect socket (useful after login)
const reconnectSocket = () => {
  disconnectSocket();
  return createSocket();
};

// Export socket instance getter
export const getSocket = () => socket;

// Export createSocket function for initial connection
export const initSocket = createSocket;

// Export reconnect function
export const reconnectSocketConnection = reconnectSocket;

// Export disconnect function
export const disconnectSocketConnection = disconnectSocket;

export default createSocket;