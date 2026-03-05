import jwt from "jsonwebtoken";
import { registerQuizHandlers } from "./handlers/quiz.mjs";
import { registerChatHandlers } from "./handlers/chat.mjs";

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.data.userId})`);
    registerQuizHandlers(io, socket);
    registerChatHandlers(io, socket);
  });
}
