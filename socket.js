// ✅ FIXED: Socket.IO Client Configuration with Authentication
// This file provides authenticated Socket.IO connections

import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'https://airswift-backend-fjt3.onrender.com';

// Create authenticated socket connection
const createSocket = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('⚠️ No token found for Socket.IO connection');
    return null;
  }

  console.log('🔌 Connecting to Socket.IO...');

  const socket = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      token: token // Send token for authentication
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  return socket;
};

// Export socket instance
export const socket = createSocket();

// Export createSocket function for manual reconnection
export default createSocket;