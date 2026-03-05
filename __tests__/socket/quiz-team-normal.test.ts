import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createUser,
  createRoom,
  createTeam,
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

describe("Team + Normal Mode", () => {
  let qmUser: any, captain1: any, captain2: any, member1: any;
  let room: any, team1: any, team2: any;
  let io: TestIO;
  let qmSocket: TestSocket,
    cap1Socket: TestSocket,
    cap2Socket: TestSocket,
    mem1Socket: TestSocket;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    captain1 = await createUser({ displayName: "Captain Alpha" });
    captain2 = await createUser({ displayName: "Captain Beta" });
    member1 = await createUser({ displayName: "Member One" });

    room = await createRoom(qmUser._id, {
      mode: "team",
      scoringMode: "normal",
      status: "waiting",
    });

    team1 = await createTeam(room._id, captain1._id, [captain1._id, member1._id], {
      name: "Alpha",
    });
    team2 = await createTeam(room._id, captain2._id, [captain2._id], {
      name: "Beta",
    });

    io = createTestIO();
    qmSocket = createTestSocket(qmUser._id.toString());
    cap1Socket = createTestSocket(captain1._id.toString());
    cap2Socket = createTestSocket(captain2._id.toString());
    mem1Socket = createTestSocket(member1._id.toString());

    io.addSocketForFetch(qmSocket);

    await registerHandler(io, qmSocket);
    await registerHandler(io, cap1Socket);
    await registerHandler(io, cap2Socket);
    await registerHandler(io, mem1Socket);
  });

  describe("join-room", () => {
    it("team member joins with mode=team in room-state", async () => {
      await cap1Socket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(cap1Socket, "room-state");
      expect(states).toHaveLength(1);
      const state = states[0] as any;
      expect(state.room.mode).toBe("team");
      expect(state.room.scoringMode).toBe("normal");
    });

    it("participation role is 'member' for non-QM in team mode", async () => {
      await cap1Socket.invoke("join-room", { roomCode: room.code });

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: captain1._id,
        roomId: room._id,
      });
      expect(p).toBeTruthy();
      expect(p.role).toBe("member");
    });
  });

  describe("submit-answer", () => {
    let question: any;

    beforeEach(async () => {
      await qmSocket.invoke("join-room", { roomCode: room.code });
      await cap1Socket.invoke("join-room", { roomCode: room.code });
      await cap2Socket.invoke("join-room", { roomCode: room.code });
      await mem1Socket.invoke("join-room", { roomCode: room.code });

      await qmSocket.invoke("post-question", {
        text: "Team question?",
        timerSeconds: 60,
        points: 10,
      });

      const Question = mongoose.models.Question;
      question = await Question.findOne({ roomId: room._id, status: "active" });
    });

    it("captain submits answer successfully", async () => {
      await cap1Socket.invoke("submit-answer", { text: "Team Alpha Answer" });

      const submitted = getSocketEmits(cap1Socket, "answer-submitted");
      expect(submitted).toHaveLength(1);

      const Answer = mongoose.models.Answer;
      const answer = await Answer.findOne({
        questionId: question._id,
        teamId: team1._id,
      });
      expect(answer).toBeTruthy();
      expect(answer.text).toBe("Team Alpha Answer");
      expect(answer.teamId.toString()).toBe(team1._id.toString());
    });

    it("QM receives answer-received with teamName", async () => {
      await cap1Socket.invoke("submit-answer", { text: "Alpha says 4" });

      const received = getSocketEmits(qmSocket, "answer-received");
      expect(received).toHaveLength(1);
      const r = received[0] as any;
      expect(r.teamName).toBe("Alpha");
      expect(r.text).toBe("Alpha says 4");
    });

    it("rejects non-captain submit", async () => {
      await mem1Socket.invoke("submit-answer", { text: "member tries" });

      const rejected = getSocketEmits(mem1Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Only captain can submit");
    });

    it("rejects second answer from same team", async () => {
      await cap1Socket.invoke("submit-answer", { text: "first" });
      cap1Socket.emit.mockClear();

      await cap1Socket.invoke("submit-answer", { text: "second" });

      const rejected = getSocketEmits(cap1Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Team already answered");
    });

    it("allows different teams to answer", async () => {
      await cap1Socket.invoke("submit-answer", { text: "alpha" });
      await cap2Socket.invoke("submit-answer", { text: "beta" });

      const Answer = mongoose.models.Answer;
      const answers = await Answer.find({ questionId: question._id });
      expect(answers).toHaveLength(2);
    });

    it("rejects user not in any team", async () => {
      const loner = await createUser({ displayName: "Loner" });
      const lonerSocket = createTestSocket(loner._id.toString());
      await registerHandler(io, lonerSocket);
      await lonerSocket.invoke("join-room", { roomCode: room.code });

      await lonerSocket.invoke("submit-answer", { text: "no team" });

      const rejected = getSocketEmits(lonerSocket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Not in a team");
    });
  });

  describe("mark-correct (team scoring)", () => {
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
        points: 20,
      });

      answer = await createAnswer(question._id, room._id, captain1._id, {
        teamId: team1._id,
        text: "correct",
      });

      await createParticipation(captain1._id, room._id, "captain", {
        teamId: team1._id,
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("awards points to team, not individual user", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Score = mongoose.models.Score;
      const teamScore = await Score.findOne({
        roomId: room._id,
        teamId: team1._id,
      });
      expect(teamScore).toBeTruthy();
      expect(teamScore.points).toBe(20);
      expect(teamScore.correctCount).toBe(1);

      const userScore = await Score.findOne({
        roomId: room._id,
        userId: captain1._id,
        teamId: null,
      });
      expect(userScore).toBeNull();
    });

    it("updates participation stats for submitting user", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: captain1._id,
        roomId: room._id,
      });
      expect(p.correctAnswers).toBe(1);
      expect(p.totalPoints).toBe(20);
    });

    it("leaderboard shows team names", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const lb = getIOEmits(io, "leaderboard-update");
      expect(lb.length).toBeGreaterThanOrEqual(1);
      const last = lb[lb.length - 1] as any;
      const teamEntry = last.leaderboard.find(
        (e: any) => e.teamId?.toString() === team1._id.toString()
      );
      expect(teamEntry).toBeTruthy();
      expect(teamEntry.teamName).toBe("Alpha");
    });
  });

  describe("mark-wrong (team mode normal)", () => {
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

      answer = await createAnswer(question._id, room._id, captain1._id, {
        teamId: team1._id,
        text: "wrong answer",
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("emits answer-marked-wrong with no score change", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const wrong = getIOEmits(io, "answer-marked-wrong");
      expect(wrong).toHaveLength(1);

      const Score = mongoose.models.Score;
      const score = await Score.findOne({
        roomId: room._id,
        teamId: team1._id,
      });
      expect(score).toBeNull();
    });

    it("marks answer isCorrect=false in database", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const Answer = mongoose.models.Answer;
      const updated = await Answer.findById(answer._id);
      expect(updated.isCorrect).toBe(false);
    });
  });
});
