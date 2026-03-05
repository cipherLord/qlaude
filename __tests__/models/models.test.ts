import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { ensureTestModels } from "../helpers/fixtures";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
  ensureTestModels();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Room model", () => {
  const Room = () => mongoose.models.Room;

  it("requires code, name, quizmasterId, mode, expiresAt", async () => {
    const room = new (Room())({});
    const err = room.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.code).toBeTruthy();
    expect(err!.errors.name).toBeTruthy();
    expect(err!.errors.quizmasterId).toBeTruthy();
    expect(err!.errors.mode).toBeTruthy();
    expect(err!.errors.expiresAt).toBeTruthy();
  });

  it("validates mode enum", async () => {
    const room = new (Room())({
      code: "ABC",
      name: "Test",
      quizmasterId: new mongoose.Types.ObjectId(),
      mode: "battle",
      expiresAt: new Date(),
    });
    const err = room.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.mode).toBeTruthy();
  });

  it("accepts valid mode values", async () => {
    for (const mode of ["individual", "team"]) {
      const room = new (Room())({
        code: `CODE_${mode}`,
        name: "Test",
        quizmasterId: new mongoose.Types.ObjectId(),
        mode,
        expiresAt: new Date(),
      });
      const err = room.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it("validates scoringMode enum", async () => {
    const room = new (Room())({
      code: "ABC",
      name: "Test",
      quizmasterId: new mongoose.Types.ObjectId(),
      mode: "team",
      scoringMode: "invalid",
      expiresAt: new Date(),
    });
    const err = room.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.scoringMode).toBeTruthy();
  });

  it("accepts valid scoringMode values", async () => {
    for (const scoringMode of ["normal", "bounce", "pounce_bounce"]) {
      const room = new (Room())({
        code: `CODE_${scoringMode}`,
        name: "Test",
        quizmasterId: new mongoose.Types.ObjectId(),
        mode: "team",
        scoringMode,
        expiresAt: new Date(),
      });
      const err = room.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it("defaults scoringMode to normal", () => {
    const room = new (Room())({
      code: "ABC",
      name: "Test",
      quizmasterId: new mongoose.Types.ObjectId(),
      mode: "individual",
      expiresAt: new Date(),
    });
    expect(room.scoringMode).toBe("normal");
  });

  it("defaults status to waiting", () => {
    const room = new (Room())({
      code: "ABC",
      name: "Test",
      quizmasterId: new mongoose.Types.ObjectId(),
      mode: "individual",
      expiresAt: new Date(),
    });
    expect(room.status).toBe("waiting");
  });

  it("validates status enum", async () => {
    const room = new (Room())({
      code: "ABC",
      name: "Test",
      quizmasterId: new mongoose.Types.ObjectId(),
      mode: "individual",
      status: "paused",
      expiresAt: new Date(),
    });
    const err = room.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.status).toBeTruthy();
  });

  it("defaults maxTeamSize to 5", () => {
    const room = new (Room())({});
    expect(room.maxTeamSize).toBe(5);
  });

  it("defaults currentTeamIndex to 0", () => {
    const room = new (Room())({});
    expect(room.currentTeamIndex).toBe(0);
  });

  it("validates pouncePenalty min value", async () => {
    const room = new (Room())({
      code: "ABC",
      name: "Test",
      quizmasterId: new mongoose.Types.ObjectId(),
      mode: "team",
      pouncePenalty: 0,
      expiresAt: new Date(),
    });
    const err = room.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.pouncePenalty).toBeTruthy();
  });
});

describe("Question model", () => {
  const Question = () => mongoose.models.Question;

  it("requires roomId, text, order, timerSeconds", async () => {
    const q = new (Question())({});
    const err = q.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.roomId).toBeTruthy();
    expect(err!.errors.text).toBeTruthy();
    expect(err!.errors.order).toBeTruthy();
    expect(err!.errors.timerSeconds).toBeTruthy();
  });

  it("validates status enum", async () => {
    const q = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      status: "invalid",
    });
    const err = q.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.status).toBeTruthy();
  });

  it("accepts valid status values", () => {
    for (const status of ["pending", "active", "closed"]) {
      const q = new (Question())({
        roomId: new mongoose.Types.ObjectId(),
        text: "Q?",
        order: 1,
        timerSeconds: 30,
        status,
      });
      const err = q.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it("validates questionPhase enum", async () => {
    const q = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      questionPhase: "invalid",
    });
    const err = q.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.questionPhase).toBeTruthy();
  });

  it("accepts valid questionPhase values", () => {
    for (const phase of ["pounce", "direct", "bounce", "resolved", null]) {
      const q = new (Question())({
        roomId: new mongoose.Types.ObjectId(),
        text: "Q?",
        order: 1,
        timerSeconds: 30,
        questionPhase: phase,
      });
      const err = q.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it("validates timerSeconds range (min 5)", async () => {
    const q = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 2,
    });
    const err = q.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.timerSeconds).toBeTruthy();
  });

  it("validates timerSeconds range (max 300)", async () => {
    const q = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 500,
    });
    const err = q.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.timerSeconds).toBeTruthy();
  });

  it("validates points range (min 1, max 100)", async () => {
    const q1 = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      points: 0,
    });
    expect(q1.validateSync()?.errors.points).toBeTruthy();

    const q2 = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      points: 101,
    });
    expect(q2.validateSync()?.errors.points).toBeTruthy();
  });

  it("validates parts range (min 1, max 10)", async () => {
    const q1 = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      parts: 0,
    });
    expect(q1.validateSync()?.errors.parts).toBeTruthy();

    const q2 = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      parts: 11,
    });
    expect(q2.validateSync()?.errors.parts).toBeTruthy();
  });

  it("defaults points to 10 and parts to 1", () => {
    const q = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
    });
    expect(q.points).toBe(10);
    expect(q.parts).toBe(1);
  });

  it("defaults status to pending", () => {
    const q = new (Question())({});
    expect(q.status).toBe("pending");
  });

  it("validates mediaType enum", async () => {
    const q = new (Question())({
      roomId: new mongoose.Types.ObjectId(),
      text: "Q?",
      order: 1,
      timerSeconds: 30,
      mediaType: "pdf",
    });
    const err = q.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.mediaType).toBeTruthy();
  });

  it("accepts valid mediaType values", () => {
    for (const mediaType of ["image", "video", null]) {
      const q = new (Question())({
        roomId: new mongoose.Types.ObjectId(),
        text: "Q?",
        order: 1,
        timerSeconds: 30,
        mediaType,
      });
      const err = q.validateSync();
      expect(err).toBeUndefined();
    }
  });
});

describe("Answer model", () => {
  const Answer = () => mongoose.models.Answer;

  it("requires questionId, roomId, userId, text", async () => {
    const a = new (Answer())({});
    const err = a.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.questionId).toBeTruthy();
    expect(err!.errors.roomId).toBeTruthy();
    expect(err!.errors.userId).toBeTruthy();
    expect(err!.errors.text).toBeTruthy();
  });

  it("validates answerType enum", async () => {
    const a = new (Answer())({
      questionId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      text: "answer",
      answerType: "invalid",
    });
    const err = a.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.answerType).toBeTruthy();
  });

  it("accepts valid answerType values", () => {
    for (const answerType of ["direct", "bounce", "pounce"]) {
      const a = new (Answer())({
        questionId: new mongoose.Types.ObjectId(),
        roomId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        text: "answer",
        answerType,
      });
      const err = a.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it("defaults answerType to direct", () => {
    const a = new (Answer())({});
    expect(a.answerType).toBe("direct");
  });

  it("defaults isCorrect to null", () => {
    const a = new (Answer())({});
    expect(a.isCorrect).toBeNull();
  });

  it("defaults submittedAt to now", () => {
    const a = new (Answer())({
      questionId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      text: "test",
    });
    expect(a.submittedAt).toBeTruthy();
    expect(a.submittedAt instanceof Date).toBe(true);
  });
});

describe("Score model", () => {
  const Score = () => mongoose.models.Score;

  it("requires roomId", async () => {
    const s = new (Score())({});
    const err = s.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.roomId).toBeTruthy();
  });

  it("defaults points to 0 and correctCount to 0", () => {
    const s = new (Score())({
      roomId: new mongoose.Types.ObjectId(),
    });
    expect(s.points).toBe(0);
    expect(s.correctCount).toBe(0);
  });

  it("defaults userId and teamId to null", () => {
    const s = new (Score())({
      roomId: new mongoose.Types.ObjectId(),
    });
    expect(s.userId).toBeNull();
    expect(s.teamId).toBeNull();
  });

  it("can store user-level score", async () => {
    const s = await Score().create({
      roomId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      points: 25,
      correctCount: 3,
    });
    expect(s.points).toBe(25);
    expect(s.correctCount).toBe(3);
  });

  it("can store team-level score", async () => {
    const s = await Score().create({
      roomId: new mongoose.Types.ObjectId(),
      teamId: new mongoose.Types.ObjectId(),
      points: 50,
      correctCount: 5,
    });
    expect(s.points).toBe(50);
    expect(s.teamId).toBeTruthy();
  });
});

describe("Team model", () => {
  const Team = () => mongoose.models.Team;

  it("requires roomId, name, code, captainId", async () => {
    const t = new (Team())({});
    const err = t.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.roomId).toBeTruthy();
    expect(err!.errors.name).toBeTruthy();
    expect(err!.errors.code).toBeTruthy();
    expect(err!.errors.captainId).toBeTruthy();
  });

  it("validates status enum", async () => {
    const t = new (Team())({
      roomId: new mongoose.Types.ObjectId(),
      name: "Test",
      code: "T1",
      captainId: new mongoose.Types.ObjectId(),
      status: "invalid",
    });
    const err = t.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.status).toBeTruthy();
  });

  it("defaults status to active", () => {
    const t = new (Team())({});
    expect(t.status).toBe("active");
  });
});

describe("Participation model", () => {
  const Participation = () => mongoose.models.Participation;

  it("requires userId, roomId, role", async () => {
    const p = new (Participation())({});
    const err = p.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.userId).toBeTruthy();
    expect(err!.errors.roomId).toBeTruthy();
    expect(err!.errors.role).toBeTruthy();
  });

  it("validates role enum", async () => {
    const p = new (Participation())({
      userId: new mongoose.Types.ObjectId(),
      roomId: new mongoose.Types.ObjectId(),
      role: "spectator",
    });
    const err = p.validateSync();
    expect(err).toBeTruthy();
    expect(err!.errors.role).toBeTruthy();
  });

  it("accepts valid role values", () => {
    for (const role of ["quizmaster", "captain", "member", "individual"]) {
      const p = new (Participation())({
        userId: new mongoose.Types.ObjectId(),
        roomId: new mongoose.Types.ObjectId(),
        role,
      });
      const err = p.validateSync();
      expect(err).toBeUndefined();
    }
  });

  it("defaults stats to 0", () => {
    const p = new (Participation())({});
    expect(p.answersGiven).toBe(0);
    expect(p.correctAnswers).toBe(0);
    expect(p.totalPoints).toBe(0);
  });
});
