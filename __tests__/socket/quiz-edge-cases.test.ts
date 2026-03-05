import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createUser,
  createRoom,
  createTeam,
  createQuestion,
  createAnswer,
  createParticipation,
  ensureTestModels,
} from "../helpers/fixtures";
import {
  createTestSocket,
  createTestIO,
  getSocketEmits,
  getIOEmits,
  registerHandler,
  TestIO,
  TestSocket,
} from "../helpers/quizHandler";

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
  jest.restoreAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Edge Cases", () => {
  let qmUser: any, player1: any;
  let io: TestIO;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    player1 = await createUser({ displayName: "Alice" });
    io = createTestIO();
  });

  describe("post-question authorization", () => {
    it("rejects non-QM from posting questions", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });

      const pSocket = createTestSocket(player1._id.toString());
      await registerHandler(io, pSocket);
      await pSocket.invoke("join-room", { roomCode: room.code });

      await pSocket.invoke("post-question", {
        text: "Unauthorized?",
        timerSeconds: 30,
        points: 10,
      });

      const errors = getSocketEmits(pSocket, "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect((errors[0] as any).message).toContain("quizmaster");
    });

    it("rejects question in closed room", async () => {
      const room = await createRoom(qmUser._id, { status: "closed" });

      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("post-question", {
        text: "Closed Q?",
        timerSeconds: 30,
        points: 10,
      });

      const errors = getSocketEmits(qmSocket, "error");
      const closedError = errors.find((e: any) =>
        e.message?.toLowerCase().includes("closed")
      );
      expect(closedError).toBeTruthy();
    });

    it("closes previous active question when posting new one", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });
      const q1 = await createQuestion(room._id, { status: "active", order: 1 });

      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      await qmSocket.invoke("join-room", { roomCode: room.code });

      await qmSocket.invoke("post-question", {
        text: "Q2?",
        timerSeconds: 30,
        points: 10,
      });

      const Question = mongoose.models.Question;
      const oldQ = await Question.findById(q1._id);
      expect(oldQ.status).toBe("closed");

      const newQ = await Question.findOne({
        roomId: room._id,
        status: "active",
      });
      expect(newQ.text).toBe("Q2?");
    });
  });

  describe("room status transitions", () => {
    it("transitions from waiting to active on first question", async () => {
      const room = await createRoom(qmUser._id, { status: "waiting" });

      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      await qmSocket.invoke("join-room", { roomCode: room.code });

      await qmSocket.invoke("post-question", {
        text: "First Q?",
        timerSeconds: 30,
        points: 10,
      });

      const Room = mongoose.models.Room;
      const updated = await Room.findById(room._id);
      expect(updated.status).toBe("active");
    });

    it("does not revert active to waiting on subsequent questions", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });

      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      await qmSocket.invoke("join-room", { roomCode: room.code });

      await qmSocket.invoke("post-question", {
        text: "Another Q?",
        timerSeconds: 30,
        points: 10,
      });

      const Room = mongoose.models.Room;
      const updated = await Room.findById(room._id);
      expect(updated.status).toBe("active");
    });
  });

  describe("input validation", () => {
    let room: any;
    let qmSocket: TestSocket;

    beforeEach(async () => {
      room = await createRoom(qmUser._id, { status: "waiting" });
      qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      await qmSocket.invoke("join-room", { roomCode: room.code });
    });

    it("clamps points to 1-100 range", async () => {
      await qmSocket.invoke("post-question", {
        text: "Points test?",
        timerSeconds: 30,
        points: 200,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.points).toBe(100);
    });

    it("defaults points to 10 when not provided", async () => {
      await qmSocket.invoke("post-question", {
        text: "No points?",
        timerSeconds: 30,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.points).toBe(10);
    });

    it("clamps points minimum to 1", async () => {
      await qmSocket.invoke("post-question", {
        text: "Min points?",
        timerSeconds: 30,
        points: -5,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.points).toBe(1);
    });

    it("clamps timer to 5-300 seconds", async () => {
      await qmSocket.invoke("post-question", {
        text: "Timer test?",
        timerSeconds: 1,
        points: 10,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.timerSeconds).toBe(5);
    });

    it("clamps timer maximum to 300", async () => {
      await qmSocket.invoke("post-question", {
        text: "Long timer?",
        timerSeconds: 999,
        points: 10,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.timerSeconds).toBe(300);
    });

    it("clamps parts to 1-10", async () => {
      await qmSocket.invoke("post-question", {
        text: "Parts test?",
        timerSeconds: 30,
        points: 10,
        parts: 50,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.parts).toBe(10);
    });

    it("defaults parts to 1 when not provided", async () => {
      await qmSocket.invoke("post-question", {
        text: "No parts?",
        timerSeconds: 30,
        points: 10,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.parts).toBe(1);
    });

    it("validates media URL must start with /uploads/", async () => {
      await qmSocket.invoke("post-question", {
        text: "Media test?",
        timerSeconds: 30,
        points: 10,
        mediaUrl: "https://evil.com/exploit.jpg",
        mediaType: "image",
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.mediaUrl).toBeNull();
      expect(q.mediaType).toBeNull();
    });

    it("accepts valid media URL", async () => {
      await qmSocket.invoke("post-question", {
        text: "Media test?",
        timerSeconds: 30,
        points: 10,
        mediaUrl: "/uploads/image123.jpg",
        mediaType: "image",
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.mediaUrl).toBe("/uploads/image123.jpg");
      expect(q.mediaType).toBe("image");
    });

    it("rejects invalid mediaType even with valid URL", async () => {
      await qmSocket.invoke("post-question", {
        text: "Bad media type?",
        timerSeconds: 30,
        points: 10,
        mediaUrl: "/uploads/file.pdf",
        mediaType: "pdf",
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.mediaType).toBeNull();
    });

    it("truncates correctAnswer to 2000 chars", async () => {
      const longAnswer = "A".repeat(3000);
      await qmSocket.invoke("post-question", {
        text: "Long answer?",
        timerSeconds: 30,
        points: 10,
        correctAnswer: longAnswer,
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.correctAnswer.length).toBe(2000);
    });
  });

  describe("answer text truncation", () => {
    it("truncates answer text to 2000 characters", async () => {
      const room = await createRoom(qmUser._id, {
        mode: "individual",
        status: "waiting",
      });

      const qmSocket = createTestSocket(qmUser._id.toString());
      io.addSocketForFetch(qmSocket);
      await registerHandler(io, qmSocket);
      await qmSocket.invoke("join-room", { roomCode: room.code });

      const pSocket = createTestSocket(player1._id.toString());
      await registerHandler(io, pSocket);
      await pSocket.invoke("join-room", { roomCode: room.code });

      await qmSocket.invoke("post-question", {
        text: "Long answer test?",
        timerSeconds: 60,
        points: 10,
      });

      const longText = "B".repeat(3000);
      await pSocket.invoke("submit-answer", { text: longText });

      const Answer = mongoose.models.Answer;
      const answer = await Answer.findOne({
        roomId: room._id,
        userId: player1._id,
      });
      expect(answer).toBeTruthy();
      expect(answer.text.length).toBe(2000);
    });
  });

  describe("not-in-room guards", () => {
    it("submit-answer without room emits error", async () => {
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("submit-answer", { text: "no room" });

      const errors = getSocketEmits(socket, "error");
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).message).toContain("Not in a room");
    });

    it("post-question without room emits error", async () => {
      const socket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("post-question", {
        text: "Q?",
        timerSeconds: 30,
        points: 10,
      });

      const errors = getSocketEmits(socket, "error");
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).message).toContain("Not in a room");
    });
  });

  describe("get-participants", () => {
    it("returns individual participants for individual mode", async () => {
      const room = await createRoom(qmUser._id, { mode: "individual" });
      await createParticipation(player1._id, room._id, "individual");

      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("get-participants");

      const list = getSocketEmits(qmSocket, "participants-list");
      expect(list).toHaveLength(1);
      expect((list[0] as any).mode).toBe("individual");
    });

    it("returns teams for team mode", async () => {
      const room = await createRoom(qmUser._id, { mode: "team" });
      await createTeam(room._id, player1._id, [player1._id], { name: "T1" });

      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("get-participants");

      const list = getSocketEmits(qmSocket, "participants-list");
      expect(list).toHaveLength(1);
      expect((list[0] as any).mode).toBe("team");
      expect((list[0] as any).teams.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("mark authorization", () => {
    it("non-QM cannot mark-correct", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });
      const question = await createQuestion(room._id, { status: "active" });
      const answer = await createAnswer(question._id, room._id, player1._id);

      const pSocket = createTestSocket(player1._id.toString());
      await registerHandler(io, pSocket);
      pSocket.data.roomCode = room.code;
      pSocket.data.roomId = room._id.toString();

      await pSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const errors = getSocketEmits(pSocket, "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect((errors[0] as any).message).toContain("quizmaster");
    });

    it("non-QM cannot mark-wrong", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });
      const question = await createQuestion(room._id, { status: "active" });
      const answer = await createAnswer(question._id, room._id, player1._id);

      const pSocket = createTestSocket(player1._id.toString());
      await registerHandler(io, pSocket);
      pSocket.data.roomCode = room.code;
      pSocket.data.roomId = room._id.toString();

      await pSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const errors = getSocketEmits(pSocket, "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect((errors[0] as any).message).toContain("quizmaster");
    });

    it("non-QM cannot mark-pounce", async () => {
      const room = await createRoom(qmUser._id, {
        mode: "team",
        scoringMode: "pounce_bounce",
        status: "active",
      });
      const question = await createQuestion(room._id, { status: "closed" });
      const answer = await createAnswer(question._id, room._id, player1._id, {
        answerType: "pounce",
      });

      const pSocket = createTestSocket(player1._id.toString());
      await registerHandler(io, pSocket);
      pSocket.data.roomCode = room.code;
      pSocket.data.roomId = room._id.toString();

      await pSocket.invoke("mark-pounce", {
        answerId: answer._id.toString(),
        isCorrect: true,
      });

      const errors = getSocketEmits(pSocket, "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});
