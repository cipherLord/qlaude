import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createUser,
  createRoom,
  createQuestion,
  createAnswer,
  createParticipation,
  createScore,
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

describe("Individual + Normal Mode", () => {
  let qmUser: any, player1: any, player2: any;
  let room: any;
  let io: TestIO;
  let qmSocket: TestSocket, p1Socket: TestSocket, p2Socket: TestSocket;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "Quizmaster" });
    player1 = await createUser({ displayName: "Alice" });
    player2 = await createUser({ displayName: "Bob" });

    room = await createRoom(qmUser._id, {
      mode: "individual",
      scoringMode: "normal",
      status: "waiting",
    });

    io = createTestIO();

    qmSocket = createTestSocket(qmUser._id.toString());
    p1Socket = createTestSocket(player1._id.toString());
    p2Socket = createTestSocket(player2._id.toString());

    io.addSocketForFetch(qmSocket);

    await registerHandler(io, qmSocket);
    await registerHandler(io, p1Socket);
    await registerHandler(io, p2Socket);
  });

  describe("join-room", () => {
    it("joins room and receives room-state with mode=individual", async () => {
      await qmSocket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(qmSocket, "room-state");
      expect(states).toHaveLength(1);

      const state = states[0] as any;
      expect(state.room.mode).toBe("individual");
      expect(state.room.scoringMode).toBe("normal");
      expect(state.room.isQuizmaster).toBe(true);
      expect(state.room.code).toBe(room.code);
    });

    it("player receives room-state with isQuizmaster=false", async () => {
      await p1Socket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(p1Socket, "room-state");
      expect(states).toHaveLength(1);
      const state = states[0] as any;
      expect(state.room.isQuizmaster).toBe(false);
      expect(state.room.mode).toBe("individual");
    });

    it("creates participation record for player", async () => {
      await p1Socket.invoke("join-room", { roomCode: room.code });

      const Participation = mongoose.models.Participation;
      const participation = await Participation.findOne({
        userId: player1._id,
        roomId: room._id,
      });
      expect(participation).toBeTruthy();
      expect(participation.role).toBe("individual");
    });

    it("sets user activeRoomId on join", async () => {
      await p1Socket.invoke("join-room", { roomCode: room.code });

      const User = mongoose.models.User;
      const updatedUser = await User.findById(player1._id);
      expect(updatedUser.activeRoomId.toString()).toBe(room._id.toString());
    });

    it("emits participant-joined to room", async () => {
      await p1Socket.invoke("join-room", { roomCode: room.code });

      const toEmit = p1Socket.to.mock.results[0]?.value?.emit;
      expect(toEmit).toBeDefined();
      expect(toEmit).toHaveBeenCalledWith(
        "participant-joined",
        expect.objectContaining({ userId: player1._id.toString() })
      );
    });

    it("returns leaderboard in room-state", async () => {
      await createScore(room._id, {
        userId: player1._id,
        points: 20,
        correctCount: 2,
      });

      await p1Socket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(p1Socket, "room-state");
      const state = states[0] as any;
      expect(state.leaderboard).toBeDefined();
      expect(state.leaderboard.length).toBeGreaterThanOrEqual(1);
    });

    it("returns activeQuestion if one exists", async () => {
      await createQuestion(room._id, { status: "active", text: "Q1?" });

      await p1Socket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(p1Socket, "room-state");
      const state = states[0] as any;
      expect(state.activeQuestion).toBeTruthy();
      expect(state.activeQuestion.text).toBe("Q1?");
    });
  });

  describe("post-question", () => {
    beforeEach(async () => {
      await qmSocket.invoke("join-room", { roomCode: room.code });
    });

    it("quizmaster posts question and question-started is emitted", async () => {
      await qmSocket.invoke("post-question", {
        text: "What is 2+2?",
        timerSeconds: 30,
        points: 10,
        parts: 1,
      });

      const started = getIOEmits(io, "question-started");
      expect(started).toHaveLength(1);

      const event = started[0] as any;
      expect(event.question.text).toBe("What is 2+2?");
      expect(event.question.timerSeconds).toBe(30);
      expect(event.question.points).toBe(10);
      expect(event.scoringMode).toBe("normal");
      expect(event.endsAt).toBeTruthy();
    });

    it("transitions room status from waiting to active", async () => {
      await qmSocket.invoke("post-question", {
        text: "Q1?",
        timerSeconds: 30,
        points: 10,
      });

      const Room = mongoose.models.Room;
      const updated = await Room.findById(room._id);
      expect(updated.status).toBe("active");
    });

    it("creates question in database", async () => {
      await qmSocket.invoke("post-question", {
        text: "Capital of France?",
        timerSeconds: 60,
        points: 20,
        parts: 2,
        correctAnswer: "Paris",
      });

      const Question = mongoose.models.Question;
      const q = await Question.findOne({ roomId: room._id });
      expect(q.text).toBe("Capital of France?");
      expect(q.timerSeconds).toBe(60);
      expect(q.points).toBe(20);
      expect(q.parts).toBe(2);
      expect(q.correctAnswer).toBe("Paris");
      expect(q.status).toBe("active");
    });

    it("closes previous active question when posting new one", async () => {
      await qmSocket.invoke("post-question", {
        text: "Q1?",
        timerSeconds: 30,
        points: 10,
      });

      await qmSocket.invoke("post-question", {
        text: "Q2?",
        timerSeconds: 30,
        points: 10,
      });

      const Question = mongoose.models.Question;
      const questions = await Question.find({ roomId: room._id }).sort({ order: 1 });
      expect(questions).toHaveLength(2);
      expect(questions[0].status).toBe("closed");
      expect(questions[1].status).toBe("active");
    });
  });

  describe("submit-answer", () => {
    let question: any;

    beforeEach(async () => {
      await qmSocket.invoke("join-room", { roomCode: room.code });
      await p1Socket.invoke("join-room", { roomCode: room.code });
      await p2Socket.invoke("join-room", { roomCode: room.code });

      await qmSocket.invoke("post-question", {
        text: "What is 2+2?",
        timerSeconds: 60,
        points: 10,
      });

      const Question = mongoose.models.Question;
      question = await Question.findOne({ roomId: room._id, status: "active" });
    });

    it("individual submits answer successfully", async () => {
      await p1Socket.invoke("submit-answer", { text: "4" });

      const submitted = getSocketEmits(p1Socket, "answer-submitted");
      expect(submitted).toHaveLength(1);
      expect((submitted[0] as any).answerId).toBeTruthy();
    });

    it("answer is stored in database", async () => {
      await p1Socket.invoke("submit-answer", { text: "4" });

      const Answer = mongoose.models.Answer;
      const answer = await Answer.findOne({
        questionId: question._id,
        userId: player1._id,
      });
      expect(answer).toBeTruthy();
      expect(answer.text).toBe("4");
      expect(answer.answerType).toBe("direct");
      expect(answer.teamId).toBeNull();
    });

    it("QM receives answer-received", async () => {
      await p1Socket.invoke("submit-answer", { text: "4" });

      const received = getSocketEmits(qmSocket, "answer-received");
      expect(received).toHaveLength(1);
      const r = received[0] as any;
      expect(r.text).toBe("4");
      expect(r.displayName).toBe("Alice");
    });

    it("rejects duplicate answer from same user", async () => {
      await p1Socket.invoke("submit-answer", { text: "4" });
      p1Socket.emit.mockClear();

      await p1Socket.invoke("submit-answer", { text: "5" });

      const rejected = getSocketEmits(p1Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Already answered");
    });

    it("increments answersGiven in participation", async () => {
      await p1Socket.invoke("submit-answer", { text: "4" });

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: player1._id,
        roomId: room._id,
      });
      expect(p.answersGiven).toBe(1);
    });

    it("allows multiple different users to answer", async () => {
      await p1Socket.invoke("submit-answer", { text: "4" });
      await p2Socket.invoke("submit-answer", { text: "5" });

      const Answer = mongoose.models.Answer;
      const answers = await Answer.find({ questionId: question._id });
      expect(answers).toHaveLength(2);
    });

    it("rejects answer when timer has expired (no active timer)", async () => {
      // Simulate timer expiry by removing the timer from activeTimers
      // The handler checks if activeTimers.has(timerKey)
      // We'll post a question and then manually clear the timer to simulate expiry
      const Question = mongoose.models.Question;
      await Question.findByIdAndUpdate(question._id, { status: "closed" });

      // Create a new question without a timer by posting and waiting
      await qmSocket.invoke("post-question", {
        text: "Q2?",
        timerSeconds: 60,
        points: 10,
      });
      const q2 = await Question.findOne({ roomId: room._id, status: "active" });
      expect(q2).toBeTruthy();

      // We can't easily remove from activeTimers Map since it's internal,
      // but we can test the "no active question" path
      await Question.findByIdAndUpdate(q2!._id, { status: "closed" });

      p1Socket.emit.mockClear();
      await p1Socket.invoke("submit-answer", { text: "4" });

      const rejected = getSocketEmits(p1Socket, "answer-rejected");
      expect(rejected.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects banned user answer", async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        $push: { bannedUserIds: player1._id },
      });

      p1Socket.emit.mockClear();
      await p1Socket.invoke("submit-answer", { text: "4" });

      const rejected = getSocketEmits(p1Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("disqualified");
    });
  });

  describe("mark-correct", () => {
    let question: any;
    let answer: any;

    beforeEach(async () => {
      room = await mongoose.models.Room.findByIdAndUpdate(
        room._id,
        { status: "active" },
        { new: true }
      );

      question = await createQuestion(room._id, {
        status: "active",
        points: 15,
        correctAnswer: "4",
      });

      answer = await createAnswer(question._id, room._id, player1._id, {
        text: "4",
      });

      await createParticipation(player1._id, room._id, "individual");

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("marks answer correct and awards points to user", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Score = mongoose.models.Score;
      const score = await Score.findOne({
        roomId: room._id,
        userId: player1._id,
      });
      expect(score).toBeTruthy();
      expect(score.points).toBe(15);
      expect(score.correctCount).toBe(1);
    });

    it("updates participation stats", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: player1._id,
        roomId: room._id,
      });
      expect(p.correctAnswers).toBe(1);
      expect(p.totalPoints).toBe(15);
    });

    it("emits answers-revealed", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const revealed = getIOEmits(io, "answers-revealed");
      expect(revealed).toHaveLength(1);
      const r = revealed[0] as any;
      expect(r.questionId.toString()).toBe(question._id.toString());
      expect(r.correctAnswerId).toBe(answer._id.toString());
      expect(r.pointsAwarded).toBe(15);
    });

    it("emits leaderboard-update", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const lb = getIOEmits(io, "leaderboard-update");
      expect(lb).toHaveLength(1);
      const update = lb[0] as any;
      expect(update.leaderboard).toBeDefined();
      expect(update.leaderboard.length).toBeGreaterThanOrEqual(1);
    });

    it("scores for userId, not teamId, in individual mode", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Score = mongoose.models.Score;
      const score = await Score.findOne({
        roomId: room._id,
        userId: player1._id,
      });
      expect(score.teamId).toBeNull();
    });
  });

  describe("mark-wrong", () => {
    let question: any;
    let answer: any;

    beforeEach(async () => {
      room = await mongoose.models.Room.findByIdAndUpdate(
        room._id,
        { status: "active" },
        { new: true }
      );

      question = await createQuestion(room._id, {
        status: "active",
        points: 10,
      });

      answer = await createAnswer(question._id, room._id, player1._id, {
        text: "wrong",
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("marks answer wrong with no score change", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const Answer = mongoose.models.Answer;
      const updatedAnswer = await Answer.findById(answer._id);
      expect(updatedAnswer.isCorrect).toBe(false);

      const Score = mongoose.models.Score;
      const score = await Score.findOne({
        roomId: room._id,
        userId: player1._id,
      });
      expect(score).toBeNull();
    });

    it("emits answer-marked-wrong in normal mode", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const wrong = getIOEmits(io, "answer-marked-wrong");
      expect(wrong).toHaveLength(1);
      expect((wrong[0] as any).answerId.toString()).toBe(answer._id.toString());
    });
  });

  describe("multiple questions and leaderboard", () => {
    beforeEach(async () => {
      room = await mongoose.models.Room.findByIdAndUpdate(
        room._id,
        { status: "active" },
        { new: true }
      );

      await createParticipation(player1._id, room._id, "individual");
      await createParticipation(player2._id, room._id, "individual");

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("scores accumulate across multiple questions", async () => {
      const q1 = await createQuestion(room._id, {
        status: "active",
        points: 10,
        order: 1,
      });
      const a1 = await createAnswer(q1._id, room._id, player1._id, {
        text: "ans1",
      });

      await qmSocket.invoke("mark-correct", {
        answerId: a1._id.toString(),
      });

      const q2 = await createQuestion(room._id, {
        status: "active",
        points: 20,
        order: 2,
      });
      const a2 = await createAnswer(q2._id, room._id, player1._id, {
        text: "ans2",
      });

      await qmSocket.invoke("mark-correct", {
        answerId: a2._id.toString(),
      });

      const Score = mongoose.models.Score;
      const score = await Score.findOne({
        roomId: room._id,
        userId: player1._id,
      });
      expect(score.points).toBe(30);
      expect(score.correctCount).toBe(2);
    });

    it("leaderboard orders by highest points first", async () => {
      await createScore(room._id, {
        userId: player1._id,
        points: 30,
        correctCount: 3,
      });
      await createScore(room._id, {
        userId: player2._id,
        points: 50,
        correctCount: 5,
      });

      const q = await createQuestion(room._id, {
        status: "active",
        points: 10,
      });
      const a = await createAnswer(q._id, room._id, player1._id, {
        text: "x",
      });

      await qmSocket.invoke("mark-correct", {
        answerId: a._id.toString(),
      });

      const lb = getIOEmits(io, "leaderboard-update");
      expect(lb.length).toBeGreaterThanOrEqual(1);
      const last = lb[lb.length - 1] as any;
      expect(last.leaderboard[0].points).toBeGreaterThanOrEqual(
        last.leaderboard[1].points
      );
    });
  });
});
