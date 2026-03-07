import mongoose from "mongoose";

let RoomMessage, Room, User, Team;

async function ensureModels() {
  if (RoomMessage) return;
  const { Schema } = mongoose;

  if (!mongoose.models.RoomMessage) {
    const RoomMessageSchema = new Schema({
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      type: { type: String, enum: ["broadcast", "hint_request"], required: true },
      text: { type: String, required: true, maxlength: 500 },
      status: { type: String, enum: ["active", "blocked", "answered", "declined"], default: "active" },
      blockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
      response: { type: String, default: null, maxlength: 500 },
    }, { timestamps: true });
    mongoose.model("RoomMessage", RoomMessageSchema);
  }

  RoomMessage = mongoose.models.RoomMessage;
  Room = mongoose.models.Room;
  User = mongoose.models.User;
  Team = mongoose.models.Team;
}

export function registerRoomChatHandlers(io, socket) {
  const userId = socket.data.userId;

  socket.on("qm-broadcast", async ({ text }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can broadcast" });
      }

      const sanitizedText = String(text).substring(0, 500).trim();
      if (!sanitizedText) return;

      const msg = await RoomMessage.create({
        roomId: room._id,
        userId,
        type: "broadcast",
        text: sanitizedText,
        status: "active",
      });

      const user = await User.findById(userId).select("displayName").lean();

      io.to(`room:${roomCode}`).emit("room-message", {
        id: msg._id.toString(),
        type: "broadcast",
        text: sanitizedText,
        userId,
        displayName: user?.displayName ?? "Quizmaster",
        status: "active",
        createdAt: msg.createdAt,
      });
    } catch (err) {
      console.error("qm-broadcast error:", err);
    }
  });

  socket.on("request-hint", async ({ text }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      if (room.quizmasterId.toString() === userId) {
        return socket.emit("error", { message: "Quizmaster cannot request hints" });
      }

      const sanitizedText = String(text).substring(0, 500).trim();
      if (!sanitizedText) return;

      let senderName = null;
      if (room.mode === "team") {
        const team = await Team.findOne({ roomId: room._id, captainId: userId, status: "active" });
        if (!team) {
          return socket.emit("error", { message: "Only team captains can request hints" });
        }
        senderName = team.name;
      } else {
        const user = await User.findById(userId).select("displayName").lean();
        senderName = user?.displayName ?? "Unknown";
      }

      const msg = await RoomMessage.create({
        roomId: room._id,
        userId,
        type: "hint_request",
        text: sanitizedText,
        status: "active",
      });

      io.to(`room:${roomCode}`).emit("hint-requested", {
        id: msg._id.toString(),
        text: sanitizedText,
        userId,
        senderName,
        status: "active",
        createdAt: msg.createdAt,
      });
    } catch (err) {
      console.error("request-hint error:", err);
    }
  });

  socket.on("block-hint", async ({ messageId }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return;
      if (room.quizmasterId.toString() === userId) {
        return socket.emit("error", { message: "Quizmaster cannot block hints" });
      }

      const msg = await RoomMessage.findById(messageId);
      if (!msg || msg.roomId.toString() !== room._id.toString()) return;
      if (msg.type !== "hint_request" || msg.status !== "active") return;
      if (msg.userId.toString() === userId) {
        return socket.emit("error", { message: "Cannot block your own hint request" });
      }

      msg.status = "blocked";
      msg.blockedBy = userId;
      await msg.save();

      let blockerName = null;
      if (room.mode === "team") {
        const team = await Team.findOne({ roomId: room._id, captainId: userId, status: "active" });
        blockerName = team?.name ?? "Unknown";
      } else {
        const user = await User.findById(userId).select("displayName").lean();
        blockerName = user?.displayName ?? "Unknown";
      }

      io.to(`room:${roomCode}`).emit("hint-blocked", {
        id: messageId,
        blockedBy: userId,
        blockerName,
      });
    } catch (err) {
      console.error("block-hint error:", err);
    }
  });

  socket.on("answer-hint", async ({ messageId, response }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can answer hints" });
      }

      const msg = await RoomMessage.findById(messageId);
      if (!msg || msg.roomId.toString() !== room._id.toString()) return;
      if (msg.type !== "hint_request" || msg.status !== "active") return;

      const sanitizedResponse = String(response).substring(0, 500).trim();
      if (!sanitizedResponse) return;

      msg.status = "answered";
      msg.response = sanitizedResponse;
      await msg.save();

      io.to(`room:${roomCode}`).emit("hint-answered", {
        id: messageId,
        response: sanitizedResponse,
      });
    } catch (err) {
      console.error("answer-hint error:", err);
    }
  });

  socket.on("decline-hint", async ({ messageId }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can decline hints" });
      }

      const msg = await RoomMessage.findById(messageId);
      if (!msg || msg.roomId.toString() !== room._id.toString()) return;
      if (msg.type !== "hint_request" || msg.status !== "active") return;

      msg.status = "declined";
      await msg.save();

      io.to(`room:${roomCode}`).emit("hint-declined", {
        id: messageId,
      });
    } catch (err) {
      console.error("decline-hint error:", err);
    }
  });

  socket.on("get-room-messages", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      const messages = await RoomMessage.find({ roomId: room._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const populated = await Promise.all(messages.map(async (m) => {
        const user = await User.findById(m.userId).select("displayName").lean();
        let senderName = user?.displayName ?? "Unknown";
        if (m.type === "hint_request" && room.mode === "team") {
          const team = await Team.findOne({ roomId: room._id, captainId: m.userId, status: "active" });
          if (team) senderName = team.name;
        }
        let blockerName = null;
        if (m.blockedBy) {
          if (room.mode === "team") {
            const team = await Team.findOne({ roomId: room._id, captainId: m.blockedBy, status: "active" });
            blockerName = team?.name ?? "Unknown";
          } else {
            const blocker = await User.findById(m.blockedBy).select("displayName").lean();
            blockerName = blocker?.displayName ?? "Unknown";
          }
        }
        return {
          id: m._id.toString(),
          type: m.type,
          text: m.text,
          userId: m.userId.toString(),
          senderName,
          displayName: senderName,
          status: m.status,
          blockedBy: m.blockedBy?.toString() ?? null,
          blockerName,
          response: m.response,
          createdAt: m.createdAt,
        };
      }));

      socket.emit("room-messages", { messages: populated.reverse() });
    } catch (err) {
      console.error("get-room-messages error:", err);
    }
  });
}
