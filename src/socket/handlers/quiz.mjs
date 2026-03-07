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
      scoringMode: { type: String, enum: ["normal", "bounce", "pounce_bounce"], default: "normal" },
      pouncePoints: { type: Number, default: null, min: 1, max: 100 },
      pouncePenalty: { type: Number, default: null, min: 1 },
      totalQuestions: { type: Number, default: 0, min: 0 },
      isTiebreaker: { type: Boolean, default: false },
      tiebreakerEntityIds: [{ type: Schema.Types.ObjectId }],
      maxTeams: { type: Number, default: null },
      maxTeamSize: { type: Number, default: 5 },
      bannedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      teamOrder: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      playerOrder: [{ type: Schema.Types.ObjectId, ref: "User" }],
      currentTeamIndex: { type: Number, default: 0 },
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
      pouncePoints: { type: Number, default: null, min: 1, max: 100 },
      pouncePenalty: { type: Number, default: null, min: 1, max: 100 },
      mediaUrl: { type: String, default: null },
      mediaType: { type: String, enum: ["image", "video", null], default: null },
      assignedTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      questionPhase: { type: String, enum: ["pounce", "pounce_marking", "waiting_for_bounce", "direct", "bounce", "resolved", null], default: null },
      currentBounceTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      attemptedTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
      pouncedTeamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
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
      answerType: { type: String, enum: ["direct", "bounce", "pounce"], default: "direct" },
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

// --------------- Helpers ---------------

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isBounceMode(room) {
  return room.scoringMode === "bounce" || room.scoringMode === "pounce_bounce";
}

function clearBounceTimer(roomCode) {
  const key = `room:${roomCode}:bounce-timer`;
  if (activeTimers.has(key)) {
    clearTimeout(activeTimers.get(key));
    activeTimers.delete(key);
  }
}

function clearPounceTimer(roomCode) {
  const key = `room:${roomCode}:pounce-timer`;
  if (activeTimers.has(key)) {
    clearTimeout(activeTimers.get(key));
    activeTimers.delete(key);
  }
}

function clearAllQuestionTimers(roomCode) {
  clearBounceTimer(roomCode);
  clearPounceTimer(roomCode);
  const timerKey = `room:${roomCode}:timer`;
  if (activeTimers.has(timerKey)) {
    clearTimeout(activeTimers.get(timerKey));
    activeTimers.delete(timerKey);
  }
}

function findNextBounceTeamId(room, question) {
  const order = room.teamOrder.map(id => id.toString());
  const attempted = new Set(question.attemptedTeamIds.map(id => id.toString()));
  const pounced = new Set(question.pouncedTeamIds.map(id => id.toString()));
  const tiebreakerSet = room.isTiebreaker
    ? new Set((room.tiebreakerEntityIds || []).map(id => id.toString()))
    : null;
  const currentId = question.currentBounceTeamId?.toString();
  const currentIdx = order.indexOf(currentId);

  for (let offset = 1; offset < order.length; offset++) {
    const idx = (currentIdx + offset) % order.length;
    const teamId = order[idx];
    if (attempted.has(teamId)) continue;
    if (room.scoringMode === "pounce_bounce" && pounced.has(teamId)) continue;
    if (tiebreakerSet && !tiebreakerSet.has(teamId)) continue;
    return teamId;
  }
  return null;
}

function isIndividualBounce(room) {
  return room.mode === "individual" && isBounceMode(room);
}

function getOrder(room) {
  return room.mode === "team" ? room.teamOrder : room.playerOrder;
}

function findNextBouncePlayerId(room, question) {
  const order = (room.playerOrder || []).map(id => id.toString());
  const attempted = new Set(question.attemptedTeamIds.map(id => id.toString()));
  const pounced = new Set(question.pouncedTeamIds.map(id => id.toString()));
  const tiebreakerSet = room.isTiebreaker
    ? new Set((room.tiebreakerEntityIds || []).map(id => id.toString()))
    : null;
  const currentId = question.currentBounceTeamId?.toString();
  const currentIdx = order.indexOf(currentId);

  for (let offset = 1; offset < order.length; offset++) {
    const idx = (currentIdx + offset) % order.length;
    const playerId = order[idx];
    if (attempted.has(playerId)) continue;
    if (room.scoringMode === "pounce_bounce" && pounced.has(playerId)) continue;
    if (tiebreakerSet && !tiebreakerSet.has(playerId)) continue;
    return playerId;
  }
  return null;
}

function findNextBounceId(room, question) {
  return room.mode === "team"
    ? findNextBounceTeamId(room, question)
    : findNextBouncePlayerId(room, question);
}

async function getEntityName(room, entityId) {
  if (room.mode === "team") {
    return getTeamNameById(entityId);
  }
  const u = await User.findById(entityId).select("displayName").lean();
  return u?.displayName || "Unknown";
}

async function buildOrderWithNames(room) {
  if (room.mode === "team") {
    return buildTeamOrderWithNames(room.teamOrder);
  }
  return Promise.all(
    (room.playerOrder || []).map(async (id) => {
      const u = await User.findById(id).select("displayName").lean();
      return { id: id.toString(), name: u?.displayName || "Unknown" };
    })
  );
}

async function buildLeaderboard(roomId) {
  const room = await Room.findById(roomId).lean();
  if (!room) return [];

  const scores = await Score.find({ roomId }).lean();
  const scoreMap = new Map();
  for (const s of scores) {
    const key = s.teamId ? `team:${s.teamId}` : `user:${s.userId}`;
    scoreMap.set(key, s);
  }

  let entries = [];

  if (room.mode === "team") {
    const teams = await Team.find({ roomId, status: "active" }).select("_id name").lean();
    for (const t of teams) {
      const key = `team:${t._id}`;
      const existing = scoreMap.get(key);
      entries.push({
        _id: existing?._id || t._id,
        teamId: t._id,
        teamName: t.name,
        points: existing?.points || 0,
        correctCount: existing?.correctCount || 0,
      });
    }
  } else {
    const bannedSet = new Set((room.bannedUserIds || []).map(id => id.toString()));
    const participations = await Participation.find({
      roomId, role: "individual",
    }).select("userId").lean();

    const seen = new Set();
    for (const p of participations) {
      const uid = p.userId.toString();
      if (bannedSet.has(uid) || uid === room.quizmasterId.toString() || seen.has(uid)) continue;
      seen.add(uid);
      const key = `user:${p.userId}`;
      const existing = scoreMap.get(key);
      const u = await User.findById(p.userId).select("displayName").lean();
      entries.push({
        _id: existing?._id || p.userId,
        userId: p.userId,
        displayName: u?.displayName || "Unknown",
        points: existing?.points || 0,
        correctCount: existing?.correctCount || 0,
      });
    }
  }

  entries.sort((a, b) => b.points - a.points);
  return entries;
}

async function getTeamNameById(teamId) {
  const t = await Team.findById(teamId).select("name").lean();
  return t?.name || "Unknown";
}

async function buildTeamOrderWithNames(teamOrder) {
  return Promise.all(
    teamOrder.map(async (id) => {
      const t = await Team.findById(id).select("name").lean();
      return { id: id.toString(), name: t?.name || "Unknown" };
    })
  );
}

function startBounceTimerForTeam(io, roomCode, question, timerSeconds) {
  clearBounceTimer(roomCode);
  const endsAt = new Date(Date.now() + timerSeconds * 1000);
  const key = `room:${roomCode}:bounce-timer`;

  const timerId = setTimeout(async () => {
    activeTimers.delete(key);
    try {
      await ensureModels();
      const freshQ = await Question.findById(question._id);
      if (!freshQ || freshQ.status !== "active" || freshQ.questionPhase === "resolved") return;
      const freshRoom = await Room.findOne({ code: roomCode });
      if (!freshRoom) return;

      const timedOutId = freshQ.currentBounceTeamId?.toString();
      const timedOutName = await getEntityName(freshRoom, timedOutId);

      if (timedOutId && !freshQ.attemptedTeamIds.some(id => id.toString() === timedOutId)) {
        freshQ.attemptedTeamIds.push(timedOutId);
        await freshQ.save();
      }

      io.to(`room:${roomCode}`).emit("activity-event", {
        type: "timed_out", teamName: timedOutName, teamId: timedOutId,
      });

      const nextId = findNextBounceId(freshRoom, freshQ);
      if (nextId) {
        freshQ.currentBounceTeamId = nextId;
        await freshQ.save();
        const nextName = await getEntityName(freshRoom, nextId);
        const nextEndsAt = new Date(Date.now() + freshQ.timerSeconds * 1000);
        io.to(`room:${roomCode}`).emit("bounce-advanced", {
          currentBounceTeamId: nextId, currentBounceTeamName: nextName,
          endsAt: nextEndsAt.toISOString(),
        });
        startBounceTimerForTeam(io, roomCode, freshQ, freshQ.timerSeconds);
      } else {
        await handleQuestionExhausted(io, roomCode, freshRoom, freshQ);
      }
    } catch (err) {
      console.error("bounce-timer-expired error:", err);
    }
  }, timerSeconds * 1000);

  activeTimers.set(key, timerId);
  return endsAt;
}

async function handleQuestionExhausted(io, roomCode, room, question) {
  if (question.status !== "active") return;
  question.questionPhase = "resolved";
  question.status = "closed";
  await question.save();
  clearAllQuestionTimers(roomCode);

  const order = getOrder(room).map(id => id.toString());
  const assignedIdx = order.indexOf(question.assignedTeamId?.toString());
  room.currentTeamIndex = (assignedIdx + 1) % order.length;
  await room.save();

  io.to(`room:${roomCode}`).emit("activity-event", { type: "question_exhausted" });

  if (room.scoringMode === "pounce_bounce") {
    await emitDeferredPounceEvents(io, roomCode, room, question);
  }

  const allAnswers = await Answer.find({ questionId: question._id }).sort({ submittedAt: 1 }).lean();
  const populatedAnswers = await Promise.all(allAnswers.map(async (a) => {
    const u = await User.findById(a.userId).select("displayName").lean();
    let tName = null;
    if (a.teamId) tName = await getTeamNameById(a.teamId);
    return { id: a._id, text: a.text, isCorrect: a.isCorrect, userId: a.userId, displayName: u?.displayName, teamId: a.teamId, teamName: tName, answerType: a.answerType, submittedAt: a.submittedAt };
  }));

  io.to(`room:${roomCode}`).emit("answers-revealed", {
    questionId: question._id, questionText: question.text, questionOrder: question.order,
    correctAnswer: question.correctAnswer, answers: populatedAnswers,
    pointsAwarded: question.points ?? 10,
    mediaUrl: question.mediaUrl || null, mediaType: question.mediaType || null,
  });

  const lb = await buildLeaderboard(room._id);
  io.to(`room:${roomCode}`).emit("leaderboard-update", { leaderboard: lb });

  await checkQuizCompletion(io, roomCode, room);
}

async function emitDeferredPounceEvents(io, roomCode, room, question) {
  const pounceAnswers = await Answer.find({
    questionId: question._id, answerType: "pounce", isCorrect: { $ne: null },
  }).lean();

  for (const a of pounceAnswers) {
    const entityId = room.mode === "team" ? a.teamId : a.userId;
    const entityName = await getEntityName(room, entityId);
    const pts = question.pouncePoints ?? question.points ?? 10;
    const penalty = question.pouncePenalty ?? room.pouncePenalty ?? pts;
    io.to(`room:${roomCode}`).emit("activity-event", {
      type: a.isCorrect ? "pounce_correct" : "pounce_wrong",
      teamName: entityName,
      teamId: entityId?.toString(),
      points: a.isCorrect ? pts : -penalty,
    });
  }
}

async function checkQuizCompletion(io, roomCode, room) {
  if (room.totalQuestions <= 0) return;
  const closedCount = await Question.countDocuments({ roomId: room._id, status: "closed" });
  if (closedCount < room.totalQuestions) return;

  const lb = await buildLeaderboard(room._id);
  if (lb.length === 0) return;

  const topScore = lb[0].points;
  const winners = lb.filter(e => e.points === topScore);

  if (winners.length > 1 && !room.isTiebreaker) {
    room.isTiebreaker = true;
    room.tiebreakerEntityIds = winners.map(w => w.teamId ?? w.userId);
    await room.save();

    const winnerNames = await Promise.all(winners.map(async (w) => {
      return { id: (w.teamId ?? w.userId).toString(), name: w.teamName ?? w.displayName ?? "Unknown", score: w.points };
    }));

    io.to(`room:${roomCode}`).emit("tiebreaker-start", {
      tiedEntities: winnerNames,
      message: "Tiebreaker! Sudden death round begins.",
    });
    return;
  }

  const winner = {
    id: (winners[0].teamId ?? winners[0].userId).toString(),
    name: winners[0].teamName ?? winners[0].displayName ?? "Unknown",
    score: winners[0].points,
  };

  io.to(`room:${roomCode}`).emit("quiz-finished", {
    winner,
    leaderboard: lb,
    isTie: winners.length > 1,
  });
}

async function checkTiebreakerWin(io, roomCode, room, entityId) {
  if (!room.isTiebreaker) return;
  const lb = await buildLeaderboard(room._id);
  const entityIdStr = entityId.toString();
  const winnerEntry = lb.find(e => (e.teamId ?? e.userId)?.toString() === entityIdStr);
  if (!winnerEntry) return;

  const winner = {
    id: entityIdStr,
    name: winnerEntry.teamName ?? winnerEntry.displayName ?? "Unknown",
    score: winnerEntry.points,
  };

  io.to(`room:${roomCode}`).emit("quiz-finished", {
    winner,
    leaderboard: lb,
    isTie: false,
  });
}

// --------------- Main Handler ---------------

export function registerQuizHandlers(io, socket) {
  const userId = socket.data.userId;

  // ==================== JOIN ROOM ====================
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
          return socket.emit("already-in-room", { currentRoomId: user.activeRoomId });
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
          { $setOnInsert: { role, joinedAt: new Date() }, $set: { leftAt: null } },
          { upsert: true }
        );
      }

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      const populatedScores = await buildLeaderboard(room._id);

      let teamOrderWithNames = null;
      if (isBounceMode(room)) {
        const order = getOrder(room);
        if (order?.length > 0) {
          teamOrderWithNames = await buildOrderWithNames(room);
        }
      }

      socket.emit("room-state", {
        room: {
          id: room._id,
          code: room.code,
          name: room.name,
          mode: room.mode,
          status: room.status,
          isQuizmaster,
          scoringMode: room.scoringMode ?? "normal",
          pouncePoints: room.pouncePoints ?? null,
          pouncePenalty: room.pouncePenalty ?? null,
          totalQuestions: room.totalQuestions ?? 0,
          isTiebreaker: room.isTiebreaker ?? false,
          teamOrder: teamOrderWithNames,
          currentTeamIndex: room.currentTeamIndex ?? 0,
        },
        activeQuestion: activeQuestion ? {
          id: activeQuestion._id,
          text: activeQuestion.text,
          order: activeQuestion.order,
          timerSeconds: activeQuestion.timerSeconds,
          status: activeQuestion.status,
          points: activeQuestion.points ?? 10,
          parts: activeQuestion.parts ?? 1,
          pouncePoints: activeQuestion.pouncePoints ?? null,
          pouncePenalty: activeQuestion.pouncePenalty ?? null,
          mediaUrl: activeQuestion.mediaUrl || null,
          mediaType: activeQuestion.mediaType || null,
          assignedTeamId: activeQuestion.assignedTeamId?.toString() || null,
          questionPhase: activeQuestion.questionPhase || null,
          currentBounceTeamId: activeQuestion.currentBounceTeamId?.toString() || null,
          attemptedTeamIds: activeQuestion.attemptedTeamIds?.map(id => id.toString()) || [],
          pouncedTeamIds: activeQuestion.pouncedTeamIds?.map(id => id.toString()) || [],
        } : null,
        leaderboard: populatedScores,
      });

      socket.to(`room:${roomCode}`).emit("participant-joined", {
        userId, displayName: user?.displayName,
      });
    } catch (err) {
      console.error("join-room error:", err);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // ==================== LEAVE ROOM ====================
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

  // ==================== POST QUESTION ====================
  socket.on("post-question", async ({ text, timerSeconds, points, parts, correctAnswer, mediaUrl, mediaType, pouncePoints, pouncePenalty: perQuestionPouncePenalty }) => {
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

      await Question.updateMany({ roomId: room._id, status: "active" }, { status: "closed" });
      clearAllQuestionTimers(roomCode);

      if (room.status === "waiting") {
        room.status = "active";
        await room.save();
      }

      const validParts = Math.max(1, Math.min(10, parseInt(parts) || 1));
      const validPoints = Math.max(1, Math.min(100, parseInt(points) || 10));
      const validTimer = Math.max(5, Math.min(300, timerSeconds));
      const questionCount = await Question.countDocuments({ roomId: room._id });
      const validMediaUrl = mediaUrl && typeof mediaUrl === "string" && mediaUrl.startsWith("/uploads/") ? mediaUrl : null;
      const validMediaType = validMediaUrl && ["image", "video"].includes(mediaType) ? mediaType : null;

      const validPouncePoints = room.scoringMode === "pounce_bounce"
        ? Math.max(1, Math.min(100, parseInt(pouncePoints) || room.pouncePoints || validPoints))
        : null;
      const validPouncePenalty = room.scoringMode === "pounce_bounce" && perQuestionPouncePenalty
        ? Math.max(1, Math.min(100, parseInt(perQuestionPouncePenalty)))
        : null;

      const bounce = isBounceMode(room);

      if (bounce && room.mode === "team" && (!room.teamOrder || room.teamOrder.length === 0)) {
        const teams = await Team.find({ roomId: room._id, status: "active" }).select("_id").lean();
        if (teams.length < 2) {
          return socket.emit("error", { message: "Need at least 2 active teams for bounce mode" });
        }
        room.teamOrder = shuffleArray(teams.map(t => t._id));
        room.currentTeamIndex = 0;
        await room.save();
        const orderWithNames = await buildTeamOrderWithNames(room.teamOrder);
        io.to(`room:${roomCode}`).emit("team-order-set", { teamOrder: orderWithNames });
      }

      if (bounce && room.mode === "individual" && (!room.playerOrder || room.playerOrder.length === 0)) {
        const bannedSet = new Set((room.bannedUserIds || []).map(id => id.toString()));
        const participants = await Participation.find({
          roomId: room._id, role: "individual",
        }).select("userId").lean();
        const activePlayers = participants.filter(p => !bannedSet.has(p.userId.toString()));
        if (activePlayers.length < 2) {
          return socket.emit("error", { message: "Need at least 2 players for bounce mode" });
        }
        room.playerOrder = shuffleArray(activePlayers.map(p => p.userId));
        room.currentTeamIndex = 0;
        await room.save();
        const orderWithNames = await buildOrderWithNames(room);
        io.to(`room:${roomCode}`).emit("team-order-set", { teamOrder: orderWithNames });
      }

      let assignedTeamId = null;
      let questionPhase = null;
      let currentBounceTeamId = null;

      if (bounce) {
        const order = getOrder(room);
        assignedTeamId = order[room.currentTeamIndex];
        currentBounceTeamId = assignedTeamId;
        questionPhase = room.scoringMode === "pounce_bounce" ? "pounce" : "direct";
      }

      const question = await Question.create({
        roomId: room._id,
        text,
        order: questionCount + 1,
        timerSeconds: validTimer,
        status: "active",
        points: validPoints,
        parts: validParts,
        correctAnswer: correctAnswer ? String(correctAnswer).substring(0, 2000) : null,
        pouncePoints: validPouncePoints,
        pouncePenalty: validPouncePenalty,
        mediaUrl: validMediaUrl,
        mediaType: validMediaType,
        assignedTeamId,
        questionPhase,
        currentBounceTeamId,
        attemptedTeamIds: [],
        pouncedTeamIds: [],
      });

      if (bounce) {
        const assignedName = await getEntityName(room, assignedTeamId);
        let bounceEndsAt = null;

        if (questionPhase === "pounce") {
          const pounceTime = Math.max(10, Math.floor(validTimer / 2));
          const pounceEndsAt = new Date(Date.now() + pounceTime * 1000);
          const pounceKey = `room:${roomCode}:pounce-timer`;
          const pounceTimerId = setTimeout(async () => {
            activeTimers.delete(pounceKey);
            try {
              const freshQ = await Question.findById(question._id);
              if (!freshQ || freshQ.questionPhase !== "pounce") return;
              const freshRoom = await Room.findOne({ code: roomCode });
              if (!freshRoom) return;

              const pounceAnswerCount = await Answer.countDocuments({
                questionId: freshQ._id, answerType: "pounce",
              });

              if (pounceAnswerCount > 0) {
                freshQ.questionPhase = "pounce_marking";
                await freshQ.save();

                const pounceAnswers = await Answer.find({
                  questionId: freshQ._id, answerType: "pounce",
                }).lean();
                const pounceData = await Promise.all(pounceAnswers.map(async (a) => {
                  const eId = freshRoom.mode === "team" ? a.teamId : a.userId;
                  const eName = await getEntityName(freshRoom, eId);
                  return { answerId: a._id.toString(), teamId: eId?.toString(), teamName: eName, text: a.text };
                }));

                io.to(`room:${roomCode}`).emit("pounce-marking-phase", {
                  questionId: freshQ._id.toString(), pounceAnswers: pounceData,
                });
              } else {
                freshQ.questionPhase = "waiting_for_bounce";
                await freshQ.save();

                io.to(`room:${roomCode}`).emit("pounce-closed-waiting", {
                  questionId: freshQ._id.toString(),
                });
              }

              io.to(`room:${roomCode}`).emit("activity-event", {
                type: "pounce_closed",
              });
            } catch (err) {
              console.error("pounce-timer error:", err);
            }
          }, pounceTime * 1000);
          activeTimers.set(pounceKey, pounceTimerId);

          io.to(`room:${roomCode}`).emit("question-started", {
            question: {
              id: question._id, text: question.text, order: question.order,
              timerSeconds: question.timerSeconds, points: question.points, parts: question.parts,
              pouncePoints: question.pouncePoints, pouncePenalty: question.pouncePenalty,
              mediaUrl: question.mediaUrl, mediaType: question.mediaType,
              assignedTeamId: assignedTeamId?.toString(), assignedTeamName: assignedName,
              questionPhase, currentBounceTeamId: currentBounceTeamId?.toString(),
              attemptedTeamIds: [], pouncedTeamIds: [],
            },
            scoringMode: room.scoringMode,
            pouncePenalty: question.pouncePenalty ?? room.pouncePenalty ?? question.pouncePoints,
            pounceEndsAt: pounceEndsAt.toISOString(),
            endsAt: null,
          });
          io.to(`room:${roomCode}`).emit("activity-event", {
            type: "question_started", teamName: assignedName, teamId: assignedTeamId?.toString(),
          });
          io.to(`room:${roomCode}`).emit("activity-event", { type: "pounce_open" });
        } else {
          bounceEndsAt = startBounceTimerForTeam(io, roomCode, question, validTimer);
          io.to(`room:${roomCode}`).emit("question-started", {
            question: {
              id: question._id, text: question.text, order: question.order,
              timerSeconds: question.timerSeconds, points: question.points, parts: question.parts,
              pouncePoints: question.pouncePoints, pouncePenalty: question.pouncePenalty,
              mediaUrl: question.mediaUrl, mediaType: question.mediaType,
              assignedTeamId: assignedTeamId?.toString(), assignedTeamName: assignedName,
              questionPhase, currentBounceTeamId: currentBounceTeamId?.toString(),
              attemptedTeamIds: [], pouncedTeamIds: [],
            },
            scoringMode: room.scoringMode,
            endsAt: bounceEndsAt.toISOString(),
            pounceEndsAt: null,
          });
          io.to(`room:${roomCode}`).emit("activity-event", {
            type: "question_started", teamName: assignedName, teamId: assignedTeamId?.toString(),
          });
          io.to(`room:${roomCode}`).emit("activity-event", {
            type: "team_answering", teamName: assignedName, teamId: assignedTeamId?.toString(),
          });
        }
      } else {
        // Normal mode: existing behavior
        const endsAt = new Date(Date.now() + question.timerSeconds * 1000);
        io.to(`room:${roomCode}`).emit("question-started", {
          question: {
            id: question._id, text: question.text, order: question.order,
            timerSeconds: question.timerSeconds, points: question.points, parts: question.parts,
            pouncePoints: null, pouncePenalty: null,
            mediaUrl: question.mediaUrl, mediaType: question.mediaType,
            assignedTeamId: null, questionPhase: null, currentBounceTeamId: null,
            attemptedTeamIds: [], pouncedTeamIds: [],
          },
          scoringMode: room.scoringMode || "normal",
          endsAt: endsAt.toISOString(),
          pounceEndsAt: null,
        });

        const timerKey = `room:${roomCode}:timer`;
        if (activeTimers.has(timerKey)) clearTimeout(activeTimers.get(timerKey));
        const timerId = setTimeout(async () => {
          activeTimers.delete(timerKey);
          try {
            await Question.findByIdAndUpdate(question._id, { status: "closed" });
            io.to(`room:${roomCode}`).emit("timer-expired", { questionId: question._id.toString() });
          } catch (err) { console.error("timer-expired error:", err); }
        }, question.timerSeconds * 1000);
        activeTimers.set(timerKey, timerId);
      }
    } catch (err) {
      console.error("post-question error:", err);
      socket.emit("error", { message: "Failed to post question" });
    }
  });

  // ==================== SUBMIT ANSWER ====================
  socket.on("submit-answer", async ({ text }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return socket.emit("error", { message: "Not in a room" });

      const room = await Room.findOne({ code: roomCode });
      if (!room) return socket.emit("error", { message: "Room not found" });

      const isBanned = room.bannedUserIds?.some(id => id.toString() === userId);
      if (isBanned) return socket.emit("answer-rejected", { reason: "disqualified" });

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      if (!activeQuestion) return socket.emit("answer-rejected", { reason: "No active question" });

      const bounce = isBounceMode(room);

      if (bounce) {
        const phase = activeQuestion.questionPhase;
        if (phase !== "direct" && phase !== "bounce") {
          return socket.emit("answer-rejected", { reason: "Not in answering phase" });
        }

        let entityId, entityName;

        if (room.mode === "team") {
          const team = await Team.findOne({ roomId: room._id, memberIds: userId, status: "active" });
          if (!team) return socket.emit("answer-rejected", { reason: "Not in a team" });
          if (team.captainId.toString() !== userId) {
            return socket.emit("answer-rejected", { reason: "Only captain can submit" });
          }
          entityId = team._id;
          entityName = team.name;
        } else {
          entityId = userId;
          const u = await User.findById(userId).select("displayName").lean();
          entityName = u?.displayName || "Unknown";
        }

        if (activeQuestion.attemptedTeamIds.some(id => id.toString() === entityId.toString())) {
          return socket.emit("answer-rejected", { reason: "No reattempts allowed" });
        }

        if (activeQuestion.currentBounceTeamId?.toString() !== entityId.toString()) {
          return socket.emit("answer-rejected", { reason: "Not your turn" });
        }

        clearBounceTimer(roomCode);

        const answerType = activeQuestion.assignedTeamId?.toString() === entityId.toString() ? "direct" : "bounce";
        activeQuestion.attemptedTeamIds.push(entityId);
        await activeQuestion.save();

        const answer = await Answer.create({
          questionId: activeQuestion._id,
          roomId: room._id,
          userId,
          teamId: room.mode === "team" ? entityId : null,
          text: text.substring(0, 2000),
          answerType,
          submittedAt: new Date(),
        });

        await Participation.findOneAndUpdate(
          { userId, roomId: room._id },
          { $inc: { answersGiven: 1 } }
        );

        io.to(`room:${roomCode}`).emit("bounce-answer-submitted", {
          answerId: answer._id.toString(),
          teamId: entityId.toString(),
          teamName: entityName,
          text: answer.text,
          answerType,
        });

        io.to(`room:${roomCode}`).emit("activity-event", {
          type: "answer_submitted",
          teamName: entityName,
          teamId: entityId.toString(),
          answerText: answer.text,
          answerType,
        });

        socket.emit("answer-submitted", { answerId: answer._id });
      } else {
        // ---- Normal mode submit (unchanged logic) ----
        const timerKey = `room:${roomCode}:timer`;
        if (!activeTimers.has(timerKey)) {
          return socket.emit("answer-rejected", { reason: "time-expired" });
        }

        if (room.mode === "team") {
          const team = await Team.findOne({ roomId: room._id, memberIds: userId, status: "active" });
          if (!team) return socket.emit("answer-rejected", { reason: "Not in a team" });
          if (team.captainId.toString() !== userId) return socket.emit("answer-rejected", { reason: "Only captain can submit" });

          const existingAnswer = await Answer.findOne({ questionId: activeQuestion._id, teamId: team._id });
          if (existingAnswer) return socket.emit("answer-rejected", { reason: "Team already answered" });

          let answer;
          try {
            answer = await Answer.create({
              questionId: activeQuestion._id, roomId: room._id, userId,
              teamId: team._id, text: text.substring(0, 2000), submittedAt: new Date(),
            });
          } catch (dbErr) {
            if (dbErr.code === 11000) return socket.emit("answer-rejected", { reason: "Team already answered" });
            throw dbErr;
          }

          await Participation.findOneAndUpdate({ userId, roomId: room._id }, { $inc: { answersGiven: 1 } });

          const qmSockets = await io.in(`room:${roomCode}`).fetchSockets();
          for (const s of qmSockets) {
            if (s.data.userId === room.quizmasterId.toString()) {
              s.emit("answer-received", {
                answerId: answer._id, teamId: team._id, teamName: team.name,
                text: answer.text, submittedAt: answer.submittedAt,
              });
            }
          }
          socket.emit("answer-submitted", { answerId: answer._id });
        } else {
          const existingAnswer = await Answer.findOne({ questionId: activeQuestion._id, userId });
          if (existingAnswer) return socket.emit("answer-rejected", { reason: "Already answered" });

          const user = await User.findById(userId).select("displayName").lean();
          let answer;
          try {
            answer = await Answer.create({
              questionId: activeQuestion._id, roomId: room._id, userId,
              text: text.substring(0, 2000), submittedAt: new Date(),
            });
          } catch (dbErr) {
            if (dbErr.code === 11000) return socket.emit("answer-rejected", { reason: "Already answered" });
            throw dbErr;
          }

          await Participation.findOneAndUpdate({ userId, roomId: room._id }, { $inc: { answersGiven: 1 } });

          const qmSockets = await io.in(`room:${roomCode}`).fetchSockets();
          for (const s of qmSockets) {
            if (s.data.userId === room.quizmasterId.toString()) {
              s.emit("answer-received", {
                answerId: answer._id, userId, displayName: user?.displayName,
                text: answer.text, submittedAt: answer.submittedAt,
              });
            }
          }
          socket.emit("answer-submitted", { answerId: answer._id });
        }
      }
    } catch (err) {
      console.error("submit-answer error:", err);
      socket.emit("error", { message: "Failed to submit answer" });
    }
  });

  // ==================== SUBMIT POUNCE ====================
  socket.on("submit-pounce", async ({ text }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return socket.emit("error", { message: "Not in a room" });

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.scoringMode !== "pounce_bounce") {
        return socket.emit("answer-rejected", { reason: "Pounce not available" });
      }

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      if (!activeQuestion || activeQuestion.questionPhase !== "pounce") {
        return socket.emit("answer-rejected", { reason: "Pounce window closed" });
      }

      let entityId, entityName;

      if (room.mode === "team") {
        const team = await Team.findOne({ roomId: room._id, memberIds: userId, status: "active" });
        if (!team) return socket.emit("answer-rejected", { reason: "Not in a team" });
        if (team.captainId.toString() !== userId) {
          return socket.emit("answer-rejected", { reason: "Only captain can pounce" });
        }
        entityId = team._id;
        entityName = team.name;
      } else {
        entityId = userId;
        const u = await User.findById(userId).select("displayName").lean();
        entityName = u?.displayName || "Unknown";
      }

      if (activeQuestion.assignedTeamId?.toString() === entityId.toString()) {
        return socket.emit("answer-rejected", { reason: "Assigned player cannot pounce" });
      }

      if (activeQuestion.pouncedTeamIds.some(id => id.toString() === entityId.toString())) {
        return socket.emit("answer-rejected", { reason: "Already pounced" });
      }

      activeQuestion.pouncedTeamIds.push(entityId);
      await activeQuestion.save();

      const answer = await Answer.create({
        questionId: activeQuestion._id,
        roomId: room._id,
        userId,
        teamId: room.mode === "team" ? entityId : null,
        text: text.substring(0, 2000),
        answerType: "pounce",
        submittedAt: new Date(),
      });

      await Participation.findOneAndUpdate({ userId, roomId: room._id }, { $inc: { answersGiven: 1 } });

      const qmSockets = await io.in(`room:${roomCode}`).fetchSockets();
      for (const s of qmSockets) {
        if (s.data.userId === room.quizmasterId.toString()) {
          s.emit("pounce-received", {
            answerId: answer._id.toString(), teamId: entityId.toString(),
            teamName: entityName, text: answer.text,
          });
        }
      }

      io.to(`room:${roomCode}`).emit("activity-event", {
        type: "team_pounced", teamName: entityName, teamId: entityId.toString(),
      });

      io.to(`room:${roomCode}`).emit("pounce-status-update", {
        pouncedTeamIds: activeQuestion.pouncedTeamIds.map(id => id.toString()),
      });

      socket.emit("answer-submitted", { answerId: answer._id });
    } catch (err) {
      console.error("submit-pounce error:", err);
      socket.emit("error", { message: "Failed to submit pounce" });
    }
  });

  // ==================== PASS BOUNCE ====================
  socket.on("pass-bounce", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || !isBounceMode(room)) return;

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      if (!activeQuestion) return;
      if (activeQuestion.questionPhase !== "direct" && activeQuestion.questionPhase !== "bounce") return;

      let entityId, entityName;
      if (room.mode === "team") {
        const team = await Team.findOne({ roomId: room._id, memberIds: userId, status: "active" });
        if (!team || team.captainId.toString() !== userId) return;
        entityId = team._id;
        entityName = team.name;
      } else {
        entityId = userId;
        const u = await User.findById(userId).select("displayName").lean();
        entityName = u?.displayName || "Unknown";
      }

      if (activeQuestion.currentBounceTeamId?.toString() !== entityId.toString()) return;

      clearBounceTimer(roomCode);

      if (!activeQuestion.attemptedTeamIds.some(id => id.toString() === entityId.toString())) {
        activeQuestion.attemptedTeamIds.push(entityId);
        await activeQuestion.save();
      }

      io.to(`room:${roomCode}`).emit("activity-event", {
        type: "team_passed", teamName: entityName, teamId: entityId.toString(),
      });

      const nextId = findNextBounceId(room, activeQuestion);
      if (nextId) {
        activeQuestion.currentBounceTeamId = nextId;
        activeQuestion.questionPhase = "bounce";
        await activeQuestion.save();
        const nextName = await getEntityName(room, nextId);
        const endsAt = startBounceTimerForTeam(io, roomCode, activeQuestion, activeQuestion.timerSeconds);
        io.to(`room:${roomCode}`).emit("bounce-advanced", {
          currentBounceTeamId: nextId, currentBounceTeamName: nextName,
          endsAt: endsAt.toISOString(),
        });
        io.to(`room:${roomCode}`).emit("activity-event", {
          type: "team_answering", teamName: nextName, teamId: nextId,
        });
      } else {
        await handleQuestionExhausted(io, roomCode, room, activeQuestion);
      }
    } catch (err) {
      console.error("pass-bounce error:", err);
    }
  });

  // ==================== ADVANCE PHASE (QM) - Close Pounce ====================
  socket.on("advance-phase", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) return;

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      if (!activeQuestion || activeQuestion.questionPhase !== "pounce") return;

      clearPounceTimer(roomCode);

      const pounceAnswerCount = await Answer.countDocuments({
        questionId: activeQuestion._id, answerType: "pounce",
      });

      if (pounceAnswerCount > 0) {
        activeQuestion.questionPhase = "pounce_marking";
        await activeQuestion.save();

        const pounceAnswers = await Answer.find({
          questionId: activeQuestion._id, answerType: "pounce",
        }).lean();
        const pounceData = await Promise.all(pounceAnswers.map(async (a) => {
          const eId = room.mode === "team" ? a.teamId : a.userId;
          const eName = await getEntityName(room, eId);
          return { answerId: a._id.toString(), teamId: eId?.toString(), teamName: eName, text: a.text };
        }));

        io.to(`room:${roomCode}`).emit("pounce-marking-phase", {
          questionId: activeQuestion._id.toString(), pounceAnswers: pounceData,
        });
      } else {
        activeQuestion.questionPhase = "waiting_for_bounce";
        await activeQuestion.save();

        io.to(`room:${roomCode}`).emit("pounce-closed-waiting", {
          questionId: activeQuestion._id.toString(),
        });
      }

      io.to(`room:${roomCode}`).emit("activity-event", { type: "pounce_closed" });
    } catch (err) {
      console.error("advance-phase error:", err);
    }
  });

  // ==================== START BOUNCE (QM) ====================
  socket.on("start-bounce", async () => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) return;

      const activeQuestion = await Question.findOne({ roomId: room._id, status: "active" });
      if (!activeQuestion) return;
      if (activeQuestion.questionPhase !== "pounce_marking" && activeQuestion.questionPhase !== "waiting_for_bounce") return;

      activeQuestion.questionPhase = "direct";
      await activeQuestion.save();

      const assignedName = await getEntityName(room, activeQuestion.currentBounceTeamId);
      const endsAt = startBounceTimerForTeam(io, roomCode, activeQuestion, activeQuestion.timerSeconds);

      io.to(`room:${roomCode}`).emit("phase-changed", {
        questionPhase: "direct",
        currentBounceTeamId: activeQuestion.currentBounceTeamId?.toString(),
        currentBounceTeamName: assignedName,
        endsAt: endsAt.toISOString(),
      });
      io.to(`room:${roomCode}`).emit("activity-event", {
        type: "team_answering", teamName: assignedName,
        teamId: activeQuestion.currentBounceTeamId?.toString(),
      });
    } catch (err) {
      console.error("start-bounce error:", err);
    }
  });

  // ==================== MARK CORRECT ====================
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

      const pts = question.points ?? 10;

      if (room.mode === "team" && answer.teamId) {
        await Score.findOneAndUpdate(
          { roomId: room._id, teamId: answer.teamId },
          { $inc: { points: pts, correctCount: 1 } },
          { upsert: true }
        );
      } else {
        await Score.findOneAndUpdate(
          { roomId: room._id, userId: answer.userId },
          { $inc: { points: pts, correctCount: 1 } },
          { upsert: true }
        );
      }
      await Participation.findOneAndUpdate(
        { userId: answer.userId, roomId: room._id },
        { $inc: { correctAnswers: 1, totalPoints: pts } }
      );

      const bounce = isBounceMode(room);

      if (bounce && (answer.answerType === "direct" || answer.answerType === "bounce")) {
        clearAllQuestionTimers(roomCode);
        question.questionPhase = "resolved";
        question.status = "closed";
        await question.save();

        const entityId = room.mode === "team" ? answer.teamId : answer.userId;
        const entityName = await getEntityName(room, entityId);
        io.to(`room:${roomCode}`).emit("activity-event", {
          type: "answer_correct", teamName: entityName, teamId: entityId?.toString(),
          points: pts, answerType: answer.answerType,
        });

        const order = getOrder(room).map(id => id.toString());
        const answeringIdx = order.indexOf(entityId?.toString());
        room.currentTeamIndex = answeringIdx >= 0 ? (answeringIdx + 1) % order.length : (room.currentTeamIndex + 1) % order.length;
        await room.save();

        if (room.scoringMode === "pounce_bounce") {
          await emitDeferredPounceEvents(io, roomCode, room, question);
        }

        const allAnswers = await Answer.find({ questionId: question._id }).sort({ submittedAt: 1 }).lean();
        const populatedAnswers = await Promise.all(allAnswers.map(async (a) => {
          const u = await User.findById(a.userId).select("displayName").lean();
          let tName = null;
          if (a.teamId) tName = await getTeamNameById(a.teamId);
          return { id: a._id, text: a.text, isCorrect: a.isCorrect, userId: a.userId, displayName: u?.displayName, teamId: a.teamId, teamName: tName, answerType: a.answerType, submittedAt: a.submittedAt };
        }));
        io.to(`room:${roomCode}`).emit("answers-revealed", {
          questionId: question._id, questionText: question.text, questionOrder: question.order,
          correctAnswer: question.correctAnswer, answers: populatedAnswers,
          correctAnswerId: answerId, pointsAwarded: pts,
          mediaUrl: question.mediaUrl || null, mediaType: question.mediaType || null,
        });
        const lb = await buildLeaderboard(room._id);
        io.to(`room:${roomCode}`).emit("leaderboard-update", { leaderboard: lb });

        if (room.isTiebreaker) {
          const correctEntityId = room.mode === "team" ? answer.teamId : answer.userId;
          await checkTiebreakerWin(io, roomCode, room, correctEntityId);
        } else {
          await checkQuizCompletion(io, roomCode, room);
        }
      } else {
        // Normal mode: existing reveal flow
        const allAnswers = await Answer.find({ questionId: answer.questionId }).sort({ submittedAt: 1 }).lean();
        const populatedAnswers = await Promise.all(allAnswers.map(async (a) => {
          const u = await User.findById(a.userId).select("displayName").lean();
          let teamName = null;
          if (a.teamId) { const t = await Team.findById(a.teamId).select("name").lean(); teamName = t?.name; }
          return { id: a._id, text: a.text, isCorrect: a.isCorrect, userId: a.userId, displayName: u?.displayName, teamId: a.teamId, teamName, answerType: a.answerType || "direct", submittedAt: a.submittedAt };
        }));
        const populatedScores = await buildLeaderboard(room._id);
        io.to(`room:${roomCode}`).emit("answers-revealed", {
          questionId: answer.questionId, questionText: question.text, questionOrder: question.order,
          correctAnswer: question.correctAnswer, answers: populatedAnswers,
          correctAnswerId: answerId, pointsAwarded: pts,
          mediaUrl: question.mediaUrl || null, mediaType: question.mediaType || null,
        });
        io.to(`room:${roomCode}`).emit("leaderboard-update", { leaderboard: populatedScores });
      }
    } catch (err) {
      console.error("mark-correct error:", err);
      socket.emit("error", { message: "Failed to mark answer" });
    }
  });

  // ==================== MARK WRONG ====================
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

      const question = await Question.findById(answer.questionId);
      const bounce = isBounceMode(room);

      if (bounce && question && question.status === "active" && (answer.answerType === "direct" || answer.answerType === "bounce")) {
        const entityId = room.mode === "team" ? answer.teamId : answer.userId;
        const entityName = await getEntityName(room, entityId);

        io.to(`room:${roomCode}`).emit("answer-marked-wrong", {
          answerId: answer._id, questionId: answer.questionId,
        });

        io.to(`room:${roomCode}`).emit("activity-event", {
          type: "answer_wrong", teamName: entityName, teamId: entityId?.toString(), answerType: answer.answerType,
        });

        const nextId = findNextBounceId(room, question);
        if (nextId) {
          question.currentBounceTeamId = nextId;
          question.questionPhase = "bounce";
          await question.save();
          const nextName = await getEntityName(room, nextId);
          const endsAt = startBounceTimerForTeam(io, roomCode, question, question.timerSeconds);
          io.to(`room:${roomCode}`).emit("bounce-advanced", {
            currentBounceTeamId: nextId, currentBounceTeamName: nextName,
            endsAt: endsAt.toISOString(),
          });
          io.to(`room:${roomCode}`).emit("activity-event", {
            type: "team_answering", teamName: nextName, teamId: nextId,
          });
        } else {
          await handleQuestionExhausted(io, roomCode, room, question);
        }
      } else {
        io.to(`room:${roomCode}`).emit("answer-marked-wrong", {
          answerId: answer._id, questionId: answer.questionId,
        });
      }
    } catch (err) {
      console.error("mark-wrong error:", err);
      socket.emit("error", { message: "Failed to mark answer" });
    }
  });

  // ==================== MARK POUNCE (QM) ====================
  socket.on("mark-pounce", async ({ answerId, isCorrect }) => {
    try {
      await ensureModels();
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      const room = await Room.findOne({ code: roomCode });
      if (!room || room.quizmasterId.toString() !== userId) {
        return socket.emit("error", { message: "Only quizmaster can mark pounce" });
      }

      const answer = await Answer.findById(answerId);
      if (!answer || answer.answerType !== "pounce") {
        return socket.emit("error", { message: "Invalid pounce answer" });
      }

      const question = await Question.findById(answer.questionId);
      if (!question) return;

      answer.isCorrect = isCorrect;
      await answer.save();

      const pts = question.pouncePoints ?? question.points ?? 10;
      const penalty = question.pouncePenalty ?? room.pouncePenalty ?? pts;
      const entityId = room.mode === "team" ? answer.teamId : answer.userId;
      const entityName = await getEntityName(room, entityId);

      if (isCorrect) {
        if (room.mode === "team" && answer.teamId) {
          await Score.findOneAndUpdate(
            { roomId: room._id, teamId: answer.teamId },
            { $inc: { points: pts, correctCount: 1 } },
            { upsert: true }
          );
        } else {
          await Score.findOneAndUpdate(
            { roomId: room._id, userId: answer.userId },
            { $inc: { points: pts, correctCount: 1 } },
            { upsert: true }
          );
        }
        await Participation.findOneAndUpdate(
          { userId: answer.userId, roomId: room._id },
          { $inc: { correctAnswers: 1, totalPoints: pts } }
        );
      } else {
        if (room.mode === "team" && answer.teamId) {
          await Score.findOneAndUpdate(
            { roomId: room._id, teamId: answer.teamId },
            { $inc: { points: -penalty } },
            { upsert: true }
          );
        } else {
          await Score.findOneAndUpdate(
            { roomId: room._id, userId: answer.userId },
            { $inc: { points: -penalty } },
            { upsert: true }
          );
        }
        await Participation.findOneAndUpdate(
          { userId: answer.userId, roomId: room._id },
          { $inc: { totalPoints: -penalty } }
        );
      }

      io.to(`room:${roomCode}`).emit("pounce-marked", {
        answerId: answer._id.toString(), teamId: entityId?.toString(),
        teamName: entityName, isCorrect, points: isCorrect ? pts : -penalty,
      });

      const unmarked = await Answer.countDocuments({
        questionId: question._id, answerType: "pounce", isCorrect: null,
      });

      if (unmarked === 0) {
        io.to(`room:${roomCode}`).emit("all-pounces-marked", { questionId: question._id.toString() });
      }
    } catch (err) {
      console.error("mark-pounce error:", err);
      socket.emit("error", { message: "Failed to mark pounce" });
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

      const lb = await buildLeaderboard(room._id);
      if (lb.length > 0) {
        const topScore = lb[0].points;
        const winners = lb.filter(e => e.points === topScore);
        const winner = {
          id: (winners[0].teamId ?? winners[0].userId).toString(),
          name: winners[0].teamName ?? winners[0].displayName ?? "Unknown",
          score: winners[0].points,
        };
        io.to(`room:${roomCode}`).emit("quiz-finished", {
          winner,
          leaderboard: lb,
          isTie: winners.length > 1,
        });
      }

      await User.updateMany(
        { activeRoomId: room._id },
        { activeRoomId: null }
      );

      const socketsInRoom = await io.in(`room:${roomCode}`).fetchSockets();

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
