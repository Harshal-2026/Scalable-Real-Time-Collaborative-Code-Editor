import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL || 
  (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) 
    ? 'http://localhost:5000' 
    : "https://scalable-real-time-collaborative-code.onrender.com");

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;