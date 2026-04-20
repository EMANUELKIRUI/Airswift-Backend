// ✅ FIXED: Socket.IO Client Configuration with Authentication
// This file provides authenticated Socket.IO connections

import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || process.env.REACT_APP_API_URL || 'https://airswift-backend-fjt3.onrender.com';
let socket = null;
let currentToken = null;

const createSocketInstance = (token) => {
  if (!token) {
    console.warn('⚠️ No token found for Socket.IO connection - socket will be created after login');
    return null;
  }

  const instance = io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    auth: { token },
    pingInterval: 25000,
    pingTimeout: 20000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  instance.on('connect', () => {
    console.log('✅ Socket.IO connected:', instance.id);
  });

  instance.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });

  instance.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  return instance;
};

export const initSocket = (token) => {
  const authToken = token || localStorage.getItem('token');

  if (!authToken) {
    console.warn('⚠️ No token found for Socket.IO initialization.');
    return null;
  }

  if (socket) {
    if (socket.connected && authToken === currentToken) {
      return socket;
    }

    socket.disconnect();
    socket = null;
  }

  socket = createSocketInstance(authToken);
  currentToken = authToken;
  return socket;
};

export const disconnectSocketConnection = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
    console.log('🔌 Socket disconnected');
  }
};

export const reconnectSocketConnection = (token) => {
  disconnectSocketConnection();
  return initSocket(token);
};

export const getSocket = () => socket;

export default initSocket;

