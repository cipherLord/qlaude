import mongoose from "mongoose";

const { Schema } = mongoose;

function ensureTestModels() {
  if (!mongoose.models.User) {
    const UserSchema = new Schema({
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      username: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      displayName: { type: String, required: true, trim: true },
      avatarUrl: { type: String, default: null },
      bio: { type: String, default: null },
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
      pouncePenalty: { type: Number, default: null, min: 1 },
      maxTeams: { type: Number, default: null },
      maxTeamSize: { type: Number, default: 5 },
      bannedUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      teamOrder: [{ type: Schema.Types.ObjectId, ref: "Team" }],
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
      timerSeconds: { type: Number, required: true, min: 5, max: 300 },
      status: { type: String, enum: ["pending", "active", "closed"], default: "pending" },
      points: { type: Number, default: 10, min: 1, max: 100 },
      parts: { type: Number, default: 1, min: 1, max: 10 },
      correctAnswer: { type: String, default: null },
      mediaUrl: { type: String, default: null },
      mediaType: { type: String, enum: ["image", "video", null], default: null },
      assignedTeamId: { type: Schema.Types.ObjectId, ref: "Team", default: null },
      questionPhase: { type: String, enum: ["pounce", "direct", "bounce", "resolved", null], default: null },
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
}

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  displayName: string;
}

export async function createUser(overrides: Partial<{
  email: string;
  username: string;
  displayName: string;
}> = {}): Promise<UserDoc> {
  ensureTestModels();
  const User = mongoose.models.User;
  const id = new mongoose.Types.ObjectId();
  const suffix = id.toString().slice(-6);
  return User.create({
    _id: id,
    email: overrides.email || `user${suffix}@test.com`,
    username: overrides.username || `user${suffix}`,
    passwordHash: "$2b$12$placeholder",
    displayName: overrides.displayName || `User ${suffix}`,
  });
}

export async function createRoom(
  quizmasterId: mongoose.Types.ObjectId,
  overrides: Partial<{
    code: string;
    name: string;
    mode: "individual" | "team";
    scoringMode: "normal" | "bounce" | "pounce_bounce";
    pouncePenalty: number | null;
    status: "waiting" | "active" | "closed";
    expiresAt: Date;
    teamOrder: mongoose.Types.ObjectId[];
    currentTeamIndex: number;
    bannedUserIds: mongoose.Types.ObjectId[];
  }> = {}
) {
  ensureTestModels();
  const Room = mongoose.models.Room;
  const code = overrides.code || Math.random().toString(36).substring(2, 10).toUpperCase();
  return Room.create({
    code,
    name: overrides.name || "Test Room",
    quizmasterId,
    mode: overrides.mode || "individual",
    scoringMode: overrides.scoringMode || "normal",
    pouncePenalty: overrides.pouncePenalty ?? null,
    status: overrides.status || "waiting",
    expiresAt: overrides.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000),
    teamOrder: overrides.teamOrder || [],
    currentTeamIndex: overrides.currentTeamIndex || 0,
    bannedUserIds: overrides.bannedUserIds || [],
  });
}

export async function createTeam(
  roomId: mongoose.Types.ObjectId,
  captainId: mongoose.Types.ObjectId,
  memberIds: mongoose.Types.ObjectId[],
  overrides: Partial<{
    name: string;
    code: string;
    status: "active" | "disqualified";
  }> = {}
) {
  ensureTestModels();
  const Team = mongoose.models.Team;
  const id = new mongoose.Types.ObjectId();
  const suffix = id.toString().slice(-4);
  return Team.create({
    _id: id,
    roomId,
    name: overrides.name || `Team ${suffix}`,
    code: overrides.code || `T${suffix}`,
    captainId,
    memberIds,
    status: overrides.status || "active",
  });
}

export async function createQuestion(
  roomId: mongoose.Types.ObjectId,
  overrides: Partial<{
    text: string;
    order: number;
    timerSeconds: number;
    status: "pending" | "active" | "closed";
    points: number;
    parts: number;
    correctAnswer: string | null;
    assignedTeamId: mongoose.Types.ObjectId | null;
    questionPhase: "pounce" | "direct" | "bounce" | "resolved" | null;
    currentBounceTeamId: mongoose.Types.ObjectId | null;
    attemptedTeamIds: mongoose.Types.ObjectId[];
    pouncedTeamIds: mongoose.Types.ObjectId[];
  }> = {}
) {
  ensureTestModels();
  const Question = mongoose.models.Question;
  return Question.create({
    roomId,
    text: overrides.text || "What is 2+2?",
    order: overrides.order || 1,
    timerSeconds: overrides.timerSeconds || 30,
    status: overrides.status || "active",
    points: overrides.points || 10,
    parts: overrides.parts || 1,
    correctAnswer: overrides.correctAnswer ?? null,
    assignedTeamId: overrides.assignedTeamId ?? null,
    questionPhase: overrides.questionPhase ?? null,
    currentBounceTeamId: overrides.currentBounceTeamId ?? null,
    attemptedTeamIds: overrides.attemptedTeamIds || [],
    pouncedTeamIds: overrides.pouncedTeamIds || [],
  });
}

export async function createAnswer(
  questionId: mongoose.Types.ObjectId,
  roomId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  overrides: Partial<{
    teamId: mongoose.Types.ObjectId | null;
    text: string;
    isCorrect: boolean | null;
    answerType: "direct" | "bounce" | "pounce";
  }> = {}
) {
  ensureTestModels();
  const Answer = mongoose.models.Answer;
  return Answer.create({
    questionId,
    roomId,
    userId,
    teamId: overrides.teamId ?? null,
    text: overrides.text || "4",
    isCorrect: overrides.isCorrect ?? null,
    answerType: overrides.answerType || "direct",
    submittedAt: new Date(),
  });
}

export async function createParticipation(
  userId: mongoose.Types.ObjectId,
  roomId: mongoose.Types.ObjectId,
  role: "quizmaster" | "captain" | "member" | "individual",
  overrides: Partial<{
    teamId: mongoose.Types.ObjectId | null;
    answersGiven: number;
    correctAnswers: number;
    totalPoints: number;
  }> = {}
) {
  ensureTestModels();
  const Participation = mongoose.models.Participation;
  return Participation.create({
    userId,
    roomId,
    role,
    teamId: overrides.teamId ?? null,
    answersGiven: overrides.answersGiven || 0,
    correctAnswers: overrides.correctAnswers || 0,
    totalPoints: overrides.totalPoints || 0,
    joinedAt: new Date(),
  });
}

export async function createScore(
  roomId: mongoose.Types.ObjectId,
  overrides: Partial<{
    userId: mongoose.Types.ObjectId | null;
    teamId: mongoose.Types.ObjectId | null;
    points: number;
    correctCount: number;
  }> = {}
) {
  ensureTestModels();
  const Score = mongoose.models.Score;
  return Score.create({
    roomId,
    userId: overrides.userId ?? null,
    teamId: overrides.teamId ?? null,
    points: overrides.points || 0,
    correctCount: overrides.correctCount || 0,
  });
}

export { ensureTestModels };
