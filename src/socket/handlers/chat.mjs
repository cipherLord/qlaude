import mongoose from "mongoose";

let ChatMessage, Team, Room;

async function ensureModels() {
  if (ChatMessage) return;
  const { Schema } = mongoose;

  if (!mongoose.models.ChatMessage) {
    const ChatMessageSchema = new Schema({
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      text: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now },
    });
    mongoose.model("ChatMessage", ChatMessageSchema);
  }

  ChatMessage = mongoose.models.ChatMessage;
  Team = mongoose.models.Team;
  Room = mongoose.models.Room;
}

export function registerChatHandlers(io, socket) {
  const userId = socket.data.userId;

  socket.on("join-team", async ({ teamId }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const team = await Team.findById(teamId);
      if (!team || team.status !== "active") return;

      const isMember = team.memberIds.some(id => id.toString() === userId);
      if (!isMember) return;

      const teamRoom = `room:${roomCode}:team:${teamId}`;
      socket.join(teamRoom);
      socket.data.teamId = teamId;
      socket.data.teamRoom = teamRoom;

      // Send recent chat history
      const recentMessages = await ChatMessage.find({ teamId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      socket.emit("team-state", {
        teamId,
        teamName: team.name,
        isCaptain: team.captainId.toString() === userId,
        chatHistory: recentMessages.reverse(),
      });
    } catch (err) {
      console.error("join-team error:", err);
    }
  });

  socket.on("team-chat", async ({ text }) => {
    try {
      await ensureModels();
      const { teamRoom, teamId, roomCode } = socket.data;
      if (!teamRoom || !teamId) return;

      const sanitizedText = text?.substring(0, 500);
      if (!sanitizedText?.trim()) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room) return;

      const msg = await ChatMessage.create({
        roomId: room._id,
        teamId,
        userId,
        text: sanitizedText.trim(),
      });

      const user = await mongoose.models.User.findById(userId).select("displayName").lean();

      io.to(teamRoom).emit("team-chat-message", {
        id: msg._id,
        userId,
        displayName: user?.displayName,
        text: msg.text,
        createdAt: msg.createdAt,
      });
    } catch (err) {
      console.error("team-chat error:", err);
    }
  });

  socket.on("transfer-captain", async ({ newCaptainId }) => {
    try {
      await ensureModels();
      const { teamId, roomCode } = socket.data;
      if (!teamId) return;

      const team = await Team.findById(teamId);
      if (!team || team.captainId.toString() !== userId) {
        return socket.emit("error", { message: "Only captain can transfer" });
      }

      const isMember = team.memberIds.some(id => id.toString() === newCaptainId);
      if (!isMember) {
        return socket.emit("error", { message: "User not in team" });
      }

      // Clear old captain's activeCaptainTeamId
      await mongoose.models.User.findByIdAndUpdate(userId, { activeCaptainTeamId: null });

      team.captainId = newCaptainId;
      await team.save();

      // Set new captain's activeCaptainTeamId
      await mongoose.models.User.findByIdAndUpdate(newCaptainId, { activeCaptainTeamId: team._id });

      const teamRoom = `room:${roomCode}:team:${teamId}`;
      io.to(teamRoom).emit("captain-changed", {
        newCaptainId,
      });
    } catch (err) {
      console.error("transfer-captain error:", err);
    }
  });
}
