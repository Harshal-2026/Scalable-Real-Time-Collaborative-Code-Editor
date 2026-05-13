import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL || "https://scalable-real-time-collaborative-code.onrender.com";

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;