import mongoose from "mongoose";

let Room, Question, Answer, Score, User, Participation, Team;

async function ensureModels() {
  if (Room) return;
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/p2p-quiz";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { bufferCommands: false, maxPoolSize: 20 });
  }

  const { Schema } = mongoose;

  if (!mongoose.models.User) {
    const UserSchema = new Schema({
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30, match: /^[a-z0-9_]+$/ },
      passwordHash: { type: String, required: true },
      displayName: { type: String, required: true, trim: true },
      avatarUrl: { type: String, default: null },
      bio: { type: String, default: null, maxlength: 200 },
      activeRoomId: { type: Schema.Types.ObjectId, ref: "Room", default: null },
      activeCaptainTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    }, { timestamps: true });
    mongoose.model("User", UserSchema);
  }

  if (!mongoose.models.Room) {
    const RoomSchema = new Schema({
      code: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      quizmasterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      mode: { type: String, enum: ["individual", "team"], required: true },
      maxTeams: { type: Number, default: null },
      maxTeamSize: { type: Number, default: 5 },
      bannedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      expiresAt: { type: Date, required: true },
      status: { type: String, enum: ["waiting", "active", "closed"], default: "waiting" },
    }, { timestamps: true });
    mongoose.model("Room", RoomSchema);
  }

  if (!mongoose.models.Team) {
    const TeamSchema = new Schema({
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      name: { type: String, required: true },
      code: { type: String, required: true },
      passwordHash: { type: String, default: null },
      captainId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      status: { type: String, enum: ["active", "disqualified"], default: "active" },
      disqualifiedAt: { type: Date, default: null },
      disqualifyReason: { type: String, default: null },
    }, { timestamps: true });
    mongoose.model("Team", TeamSchema);
  }

  if (!mongoose.models.Question) {
    const QuestionSchema = new Schema({
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      text: { type: String, required: true },
      order: { type: Number, required: true },
      timerSeconds: { type: Number, required: true },
      status: { type: String, enum: ["pending", "active", "closed"], default: "pending" },
      points: { type: Number, default: 10, min: 1, max: 100 },
      parts: { type: Number, default: 1, min: 1, max: 10 },
      correctAnswer: { type: String, default: null },
      mediaUrl: { type: String, default: null },
      mediaType: { type: String, enum: ["image", "video", null], default: null },
    }, { timestamps: true });
    mongoose.model("Question", QuestionSchema);
  }

  if (!mongoose.models.Answer) {
    const AnswerSchema = new Schema({
      questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      text: { type: String, required: true },
      isCorrect: { type: Boolean, default: null },
      submittedAt: { type: Date, default: Date.now },
    });
    mongoose.model("Answer", AnswerSchema);
  }

  if (!mongoose.models.Score) {
    const ScoreSchema = new Schema({
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      points: { type: Number, default: 0 },
      correctCount: { type: Number, default: 0 },
    });
    mongoose.model("Score", ScoreSchema);
  }

  if (!mongoose.models.Participation) {
    const ParticipationSchema = new Schema({
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
      teamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      role: { type: String, enum: ["quizmaster", "captain", "member", "individual"], required: true },
      answersGiven: { type: Number, default: 0 },
      correctAnswers: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      joinedAt: { type: Date, default: Date.now },
      leftAt: { type: Date, default: null },
    });
    mongoose.model("Participation", ParticipationSchema);
  }

  Room = mongoose.models.Room;
  Question = mongoose.models.Question;
  Answer = mongoose.models.Answer;
  Score = mongoose.models.Score;
  User = mongoose.models.User;
  Participation = mongoose.models.Participation;
  Team = mongoose.models.Team;
}

// In-memory timer tracking per room
const activeTimers = new Map();

export function registerQuizHandlers(io, socket) {
  const userId = socket.data.userId;

  socket.on("join-room", async ({ roomCode }) => {
    try {
      await ensureModels();

      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("error", { message: "Room not found" });

      if (new Date() > room.expiresAt) {
        return socket.emit("error", { message: "Room has expired" });
      }

      const isBanned = room.bannedUserIds?.some(id => id.toString() === userId);
      if (isBanned) {
        return socket.emit("error", { message: "You have been removed from this room" });
      }

      const isQuizmaster = room.quizmasterId.toString() === userId;
      const isRoomClosed = room.status === "closed";

      if (isRoomClosed && !isQuizmaster) {
        return socket.emit("error", { message: "This room has been closed" });
      }

      const user = await User.findById(userId);

      if (!isRoomClosed) {
        if (user?.activeRoomId && user.activeRoomId.toString() !== room._id.toString()) {
          return socket.emit("already-in-room", {
            currentRoomId: user.activeRoomId,
          });
        }

        await User.findByIdAndUpdate(userId, { activeRoomId: room._id });
      }

      socket.join(`room:${roomCode}`);
      socket.data.roomCode = roomCode;
      socket.data.roomId = room._id.toString();

      const role = isQuizmaster ? "quizmaster" : (room.mode === "team" ? "member" : "individual");

      if (!isRoomClosed) {
        await Participation.findOneAndUpdate(
          { userId, roomId: room._id },
          { $setOnInsert: { role, joinedAt: new Date() } },
          { upsert: true }
        );
      }

      // Get current question if any
      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });

      // Get leaderboard
      const scores = await Score.find({ roomId: room._id })
        .sort({ points: -1 })
        .limit(50)
        .lean();

      const populatedScores = await Promise.all(
        scores.map(async (s) => {
          if (s.userId) {
            const u = await User.findById(s.userId).select("displayName").lean();
            return { ...s, displayName: u?.displayName };
          }
          if (s.teamId) {
            const t = await Team.findById(s.teamId).select("name").lean();
            return { ...s, teamName: t?.name };
          }
          return s;
        })
      );

      socket.emit("room-state", {
        room: {
          id: room._id,
          code: room.code,
          name: room.name,
          mode: room.mode,
          status: room.status,
          isQuizmaster,
        },
        activeQuestion: activeQuestion ? {
          id: activeQuestion._id,
          text: activeQuestion.text,
          order: activeQuestion.order,
          timerSeconds: activeQuestion.timerSeconds,
          status: activeQuestion.status,
          points: activeQuestion.points || 10,
          parts: activeQuestion.parts || 1,
          mediaUrl: activeQuestion.mediaUrl || null,
          mediaType: activeQuestion.mediaType || null,
        } : null,
        leaderboard: populatedScores,
      });

      // Notify others
      socket.to(`room:${roomCode}`).emit("participant-joined", {
        userId,
        displayName: user?.displayName,
      });

    } catch (err) {
      console.error("join-room error:", err);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("leave-room", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      socket.leave(`room:${roomCode}`);
      await User.findByIdAndUpdate(userId, { activeRoomId: null });

      await Participation.findOneAndUpdate(
        { userId, roomId: socket.data.roomId },
        { leftAt: new Date() }
      );

      socket.to(`room:${roomCode}`).emit("participant-left", { userId });
      socket.data.roomCode = null;
      socket.data.roomId = null;
    } catch (err) {
      console.error("leave-room error:", err);
    }
  });

  socket.on("post-question", async ({ text, timerSeconds, points, parts, correctAnswer, mediaUrl, mediaType }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return socket.emit("error", { message: "Not in a room" });

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can post questions" });
      }
      if (room.status === "closed") {
        return socket.emit("error", { message: "This room has been closed" });
      }

      // Close any active question
      await Question.updateMany(
        { roomId: room._id, status: "active" },
        { status: "closed" }
      );

      if (room.status === "waiting") {
        room.status = "active";
        await room.save();
      }

      const validParts = Math.max(1, Math.min(10, parseInt(parts) || 1));
      const validPoints = Math.max(1, Math.min(100, parseInt(points) || 10));

      const questionCount = await Question.countDocuments({ roomId: room._id });
      const validMediaUrl = mediaUrl && typeof mediaUrl === "string" && mediaUrl.startsWith("/uploads/")
        ? mediaUrl
        : null;
      const validMediaType = validMediaUrl && ["image", "video"].includes(mediaType)
        ? mediaType
        : null;

      const question = await Question.create({
        roomId: room._id,
        text,
        order: questionCount + 1,
        timerSeconds: Math.max(5, Math.min(300, timerSeconds)),
        status: "active",
        points: validPoints,
        parts: validParts,
        correctAnswer: correctAnswer ? String(correctAnswer).substring(0, 2000) : null,
        mediaUrl: validMediaUrl,
        mediaType: validMediaType,
      });

      const endsAt = new Date(Date.now() + question.timerSeconds * 1000);

      io.to(`room:${roomCode}`).emit("question-started", {
        question: {
          id: question._id,
          text: question.text,
          order: question.order,
          timerSeconds: question.timerSeconds,
          points: question.points,
          parts: question.parts,
          mediaUrl: question.mediaUrl,
          mediaType: question.mediaType,
        },
        endsAt: endsAt.toISOString(),
      });

      // Server-side timer
      const timerKey = `room:${roomCode}:timer`;
      if (activeTimers.has(timerKey)) {
        clearTimeout(activeTimers.get(timerKey));
      }

      const timerId = setTimeout(async () => {
        activeTimers.delete(timerKey);
        try {
          await Question.findByIdAndUpdate(question._id, { status: "closed" });
          io.to(`room:${roomCode}`).emit("timer-expired", {
            questionId: question._id.toString(),
          });
        } catch (err) {
          console.error("timer-expired error:", err);
        }
      }, question.timerSeconds * 1000);

      activeTimers.set(timerKey, timerId);

    } catch (err) {
      console.error("post-question error:", err);
      socket.emit("error", { message: "Failed to post question" });
    }
  });

  socket.on("submit-answer", async ({ text }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return socket.emit("error", { message: "Not in a room" });

      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("error", { message: "Room not found" });

      // Check if user is banned/disqualified
      const isBanned = room.bannedUserIds?.some(id => id.toString() === userId);
      if (isBanned) {
        return socket.emit("answer-rejected", { reason: "disqualified" });
      }

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      if (!activeQuestion) {
        return socket.emit("answer-rejected", { reason: "time-expired" });
      }

      // Check timer via in-memory timer existence
      const timerKey = `room:${roomCode}:timer`;
      if (!activeTimers.has(timerKey)) {
        return socket.emit("answer-rejected", { reason: "time-expired" });
      }

      // In team mode, only captain can submit
      if (room.mode === "team") {
        const team = await Team.findOne({
          roomId: room._id,
          memberIds: userId,
          status: "active",
        });
        if (!team) {
          return socket.emit("answer-rejected", { reason: "Not in a team" });
        }
        if (team.captainId.toString() !== userId) {
          return socket.emit("answer-rejected", { reason: "Only captain can submit" });
        }

        // Check for existing team answer
        const existingAnswer = await Answer.findOne({
          questionId: activeQuestion._id,
          teamId: team._id,
        });
        if (existingAnswer) {
          return socket.emit("answer-rejected", { reason: "Team already answered" });
        }

        let answer;
        try {
          answer = await Answer.create({
            questionId: activeQuestion._id,
            roomId: room._id,
            userId,
            teamId: team._id,
            text: text.substring(0, 2000),
            submittedAt: new Date(),
          });
        } catch (dbErr) {
          if (dbErr.code === 11000) {
            return socket.emit("answer-rejected", { reason: "Team already answered" });
          }
          throw dbErr;
        }

        await Participation.findOneAndUpdate(
          { userId, roomId: room._id },
          { $inc: { answersGiven: 1 } }
        );

        // Notify quizmaster only
        const qmSockets = await io.in(`room:${roomCode}`).fetchSockets();
        for (const s of qmSockets) {
          if (s.data.userId === room.quizmasterId.toString()) {
            s.emit("answer-received", {
              answerId: answer._id,
              teamId: team._id,
              teamName: team.name,
              text: answer.text,
              submittedAt: answer.submittedAt,
            });
          }
        }

        socket.emit("answer-submitted", { answerId: answer._id });

      } else {
        // Individual mode - check for existing answer
        const existingAnswer = await Answer.findOne({
          questionId: activeQuestion._id,
          userId,
        });
        if (existingAnswer) {
          return socket.emit("answer-rejected", { reason: "Already answered" });
        }

        const user = await User.findById(userId).select("displayName").lean();

        let answer;
        try {
          answer = await Answer.create({
            questionId: activeQuestion._id,
            roomId: room._id,
            userId,
            text: text.substring(0, 2000),
            submittedAt: new Date(),
          });
        } catch (dbErr) {
          if (dbErr.code === 11000) {
            return socket.emit("answer-rejected", { reason: "Already answered" });
          }
          throw dbErr;
        }

        await Participation.findOneAndUpdate(
          { userId, roomId: room._id },
          { $inc: { answersGiven: 1 } }
        );

        // Notify quizmaster only
        const qmSockets = await io.in(`room:${roomCode}`).fetchSockets();
        for (const s of qmSockets) {
          if (s.data.userId === room.quizmasterId.toString()) {
            s.emit("answer-received", {
              answerId: answer._id,
              userId,
              displayName: user?.displayName,
              text: answer.text,
              submittedAt: answer.submittedAt,
            });
          }
        }

        socket.emit("answer-submitted", { answerId: answer._id });
      }

    } catch (err) {
      console.error("submit-answer error:", err);
      socket.emit("error", { message: "Failed to submit answer" });
    }
  });

  socket.on("mark-correct", async ({ answerId }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can mark answers" });
      }

      const answer = await Answer.findById(answerId);
      if (!answer) return socket.emit("error", { message: "Answer not found" });

      const question = await Question.findById(answer.questionId);
      if (!question) return socket.emit("error", { message: "Question not found" });

      answer.isCorrect = true;
      await answer.save();

      const points = question.points || 10;

      // Update score
      if (room.mode === "team" && answer.teamId) {
        await Score.findOneAndUpdate(
          { roomId: room._id, teamId: answer.teamId },
          { $inc: { points, correctCount: 1 } },
          { upsert: true }
        );
      } else {
        await Score.findOneAndUpdate(
          { roomId: room._id, userId: answer.userId },
          { $inc: { points, correctCount: 1 } },
          { upsert: true }
        );
      }

      // Update participation stats
      await Participation.findOneAndUpdate(
        { userId: answer.userId, roomId: room._id },
        { $inc: { correctAnswers: 1, totalPoints: points } }
      );

      // Get all answers for this question to reveal
      const allAnswers = await Answer.find({ questionId: answer.questionId })
        .sort({ submittedAt: 1 })
        .lean();

      const populatedAnswers = await Promise.all(
        allAnswers.map(async (a) => {
          const u = await User.findById(a.userId).select("displayName").lean();
          let teamName = null;
          if (a.teamId) {
            const t = await Team.findById(a.teamId).select("name").lean();
            teamName = t?.name;
          }
          return {
            id: a._id,
            text: a.text,
            isCorrect: a.isCorrect,
            userId: a.userId,
            displayName: u?.displayName,
            teamId: a.teamId,
            teamName,
            submittedAt: a.submittedAt,
          };
        })
      );

      // Get updated leaderboard
      const scores = await Score.find({ roomId: room._id })
        .sort({ points: -1 })
        .limit(50)
        .lean();

      const populatedScores = await Promise.all(
        scores.map(async (s) => {
          if (s.userId) {
            const u = await User.findById(s.userId).select("displayName").lean();
            return { ...s, displayName: u?.displayName };
          }
          if (s.teamId) {
            const t = await Team.findById(s.teamId).select("name").lean();
            return { ...s, teamName: t?.name };
          }
          return s;
        })
      );

      // Broadcast to everyone
      io.to(`room:${roomCode}`).emit("answers-revealed", {
        questionId: answer.questionId,
        questionText: question.text,
        questionOrder: question.order,
        correctAnswer: question.correctAnswer,
        answers: populatedAnswers,
        correctAnswerId: answerId,
        pointsAwarded: points,
        mediaUrl: question.mediaUrl || null,
        mediaType: question.mediaType || null,
      });

      io.to(`room:${roomCode}`).emit("leaderboard-update", {
        leaderboard: populatedScores,
      });

    } catch (err) {
      console.error("mark-correct error:", err);
      socket.emit("error", { message: "Failed to mark answer" });
    }
  });

  socket.on("mark-wrong", async ({ answerId }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can mark answers" });
      }

      const answer = await Answer.findById(answerId);
      if (!answer) return socket.emit("error", { message: "Answer not found" });

      answer.isCorrect = false;
      await answer.save();

      io.to(`room:${roomCode}`).emit("answer-marked-wrong", {
        answerId: answer._id,
        questionId: answer.questionId,
      });

    } catch (err) {
      console.error("mark-wrong error:", err);
      socket.emit("error", { message: "Failed to mark answer" });
    }
  });

  socket.on("close-room", async (payload, ack) => {
    try {
      await ensureModels();
      console.log("[close-room] payload:", payload, "socket.data.roomCode:", socket.data.roomCode, "userId:", userId);
      const roomCode = socket.data.roomCode || payload?.roomCode;
      if (!roomCode) {
        console.log("[close-room] no roomCode, aborting");
        if (typeof ack === "function") ack({ ok: false, error: "Not in a room" });
        return socket.emit("error", { message: "Not in a room. Try refreshing the page." });
      }

      const room = await Room.findOne({ code: roomCode });
      console.log("[close-room] room found:", !!room, "quizmasterId:", room?.quizmasterId?.toString(), "userId:", userId);
      if (!room || room.quizmasterId.toString() !== userId) {
        if (typeof ack === "function") ack({ ok: false, error: "Not quizmaster" });
        return socket.emit("error", { message: "Only quizmaster can close the room" });
      }

      await Question.updateMany(
        { roomId: room._id, status: "active" },
        { status: "closed" }
      );

      const timerKey = `room:${roomCode}:timer`;
      if (activeTimers.has(timerKey)) {
        clearTimeout(activeTimers.get(timerKey));
        activeTimers.delete(timerKey);
      }

      room.status = "closed";
      await room.save();

      await User.updateMany(
        { activeRoomId: room._id },
        { activeRoomId: null }
      );

      const socketsInRoom = await io.in(`room:${roomCode}`).fetchSockets();
      console.log("[close-room] sockets in room:", socketsInRoom.length, "ids:", socketsInRoom.map(s => s.id), "current:", socket.id);

      io.to(`room:${roomCode}`).emit("room-closed", {
        message: "The quizmaster has closed this room.",
      });

      // Direct emit to quizmaster as fallback
      socket.emit("room-closed", {
        message: "The quizmaster has closed this room.",
      });

      if (typeof ack === "function") ack({ ok: true });

      for (const s of socketsInRoom) {
        s.leave(`room:${roomCode}`);
        s.data.roomCode = null;
        s.data.roomId = null;
      }

      console.log("[close-room] done, room", roomCode, "closed");

    } catch (err) {
      console.error("close-room error:", err);
      if (typeof ack === "function") ack({ ok: false, error: err.message });
      socket.emit("error", { message: "Failed to close room" });
    }
  });

  socket.on("disqualify-team", async ({ teamId, reason }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can disqualify" });
      }

      const team = await Team.findById(teamId);
      if (!team || team.roomId.toString() !== room._id.toString()) {
        return socket.emit("error", { message: "Team not found" });
      }

      team.status = "disqualified";
      team.disqualifiedAt = new Date();
      team.disqualifyReason = reason || "Removed by quizmaster";
      await team.save();

      // Ban all members
      await Room.findByIdAndUpdate(room._id, {
        $addToSet: { bannedUserIds: { $each: team.memberIds } },
      });

      // Clear active room for all members
      await User.updateMany(
        { _id: { $in: team.memberIds } },
        { activeRoomId: null, activeCaptainTeamId: null }
      );

      // Notify team members and disconnect them
      const allSockets = await io.in(`room:${roomCode}`).fetchSockets();
      for (const s of allSockets) {
        if (team.memberIds.some(id => id.toString() === s.data.userId)) {
          s.emit("team-disqualified", { reason: team.disqualifyReason });
          s.leave(`room:${roomCode}`);
          s.leave(`room:${roomCode}:team:${teamId}`);
        }
      }

      // Remove team score and update leaderboard
      await Score.deleteMany({ roomId: room._id, teamId: team._id });

      const scores = await Score.find({ roomId: room._id }).sort({ points: -1 }).limit(50).lean();
      const populatedScores = await Promise.all(
        scores.map(async (s) => {
          if (s.userId) {
            const u = await User.findById(s.userId).select("displayName").lean();
            return { ...s, displayName: u?.displayName };
          }
          if (s.teamId) {
            const t = await Team.findById(s.teamId).select("name").lean();
            return { ...s, teamName: t?.name };
          }
          return s;
        })
      );

      io.to(`room:${roomCode}`).emit("leaderboard-update", { leaderboard: populatedScores });
      io.to(`room:${roomCode}`).emit("team-removed", { teamId, teamName: team.name });

    } catch (err) {
      console.error("disqualify-team error:", err);
      socket.emit("error", { message: "Failed to disqualify team" });
    }
  });

  socket.on("disqualify-participant", async ({ participantId, reason }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can disqualify" });
      }

      await Room.findByIdAndUpdate(room._id, {
        $addToSet: { bannedUserIds: participantId },
      });

      await User.findByIdAndUpdate(participantId, { activeRoomId: null });

      const allSockets = await io.in(`room:${roomCode}`).fetchSockets();
      for (const s of allSockets) {
        if (s.data.userId === participantId) {
          s.emit("participant-disqualified", { reason: reason || "Removed by quizmaster" });
          s.leave(`room:${roomCode}`);
        }
      }

      await Score.deleteMany({ roomId: room._id, userId: participantId });

      const scores = await Score.find({ roomId: room._id }).sort({ points: -1 }).limit(50).lean();
      const populatedScores = await Promise.all(
        scores.map(async (s) => {
          if (s.userId) {
            const u = await User.findById(s.userId).select("displayName").lean();
            return { ...s, displayName: u?.displayName };
          }
          if (s.teamId) {
            const t = await Team.findById(s.teamId).select("name").lean();
            return { ...s, teamName: t?.name };
          }
          return s;
        })
      );

      io.to(`room:${roomCode}`).emit("leaderboard-update", { leaderboard: populatedScores });

    } catch (err) {
      console.error("disqualify-participant error:", err);
      socket.emit("error", { message: "Failed to disqualify participant" });
    }
  });

  socket.on("get-participants", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) return;

      if (room.mode === "team") {
        const teams = await Team.find({ roomId: room._id, status: "active" })
          .populate("captainId", "displayName")
          .populate("memberIds", "displayName")
          .lean();

        socket.emit("participants-list", {
          mode: "team",
          teams: teams.map(t => ({
            id: t._id,
            name: t.name,
            captainId: t.captainId?._id || t.captainId,
            captainName: t.captainId?.displayName || "Unknown",
            members: (t.memberIds || []).map(m => ({
              id: m._id || m,
              displayName: m.displayName || "Unknown",
            })),
          })),
        });
      } else {
        const participations = await Participation.find({
          roomId: room._id,
          leftAt: null,
        }).lean();

        const users = await Promise.all(
          participations
            .filter(p => p.userId.toString() !== userId)
            .map(async (p) => {
              const u = await User.findById(p.userId).select("displayName").lean();
              return { id: p.userId, displayName: u?.displayName || "Unknown", role: p.role };
            })
        );

        socket.emit("participants-list", {
          mode: "individual",
          participants: users,
        });
      }
    } catch (err) {
      console.error("get-participants error:", err);
    }
  });

  // Cleanup on disconnect
  socket.on("disconnect", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (roomCode) {
        await User.findByIdAndUpdate(userId, { activeRoomId: null });
        await Participation.findOneAndUpdate(
          { userId, roomId: socket.data.roomId },
          { leftAt: new Date() }
        );
        socket.to(`room:${roomCode}`).emit("participant-left", { userId });
      }
    } catch (err) {
      console.error("disconnect cleanup error:", err);
    }
  });
}
