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
  jest.useRealTimers();
  jest.restoreAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("Team + Bounce Mode", () => {
  let qmUser: any, cap1: any, cap2: any, cap3: any;
  let room: any, team1: any, team2: any, team3: any;
  let io: TestIO;
  let qmSocket: TestSocket, c1Socket: TestSocket, c2Socket: TestSocket, c3Socket: TestSocket;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    cap1 = await createUser({ displayName: "Cap1" });
    cap2 = await createUser({ displayName: "Cap2" });
    cap3 = await createUser({ displayName: "Cap3" });

    room = await createRoom(qmUser._id, {
      mode: "team",
      scoringMode: "bounce",
      status: "waiting",
    });

    team1 = await createTeam(room._id, cap1._id, [cap1._id], { name: "Team A" });
    team2 = await createTeam(room._id, cap2._id, [cap2._id], { name: "Team B" });
    team3 = await createTeam(room._id, cap3._id, [cap3._id], { name: "Team C" });

    io = createTestIO();
    qmSocket = createTestSocket(qmUser._id.toString());
    c1Socket = createTestSocket(cap1._id.toString());
    c2Socket = createTestSocket(cap2._id.toString());
    c3Socket = createTestSocket(cap3._id.toString());

    io.addSocketForFetch(qmSocket);

    await registerHandler(io, qmSocket);
    await registerHandler(io, c1Socket);
    await registerHandler(io, c2Socket);
    await registerHandler(io, c3Socket);
  });

  describe("post-question", () => {
    beforeEach(async () => {
      await qmSocket.invoke("join-room", { roomCode: room.code });
    });

    it("initializes team order on first bounce question", async () => {
      await qmSocket.invoke("post-question", {
        text: "Bounce Q1?",
        timerSeconds: 30,
        points: 10,
      });

      const teamOrderSet = getIOEmits(io, "team-order-set");
      expect(teamOrderSet).toHaveLength(1);
      const order = (teamOrderSet[0] as any).teamOrder;
      expect(order).toHaveLength(3);

      const Room = mongoose.models.Room;
      const updated = await Room.findById(room._id);
      expect(updated.teamOrder).toHaveLength(3);
    });

    it("question-started has questionPhase=direct for bounce", async () => {
      await qmSocket.invoke("post-question", {
        text: "Bounce Q?",
        timerSeconds: 30,
        points: 10,
      });

      const started = getIOEmits(io, "question-started");
      expect(started).toHaveLength(1);
      const event = started[0] as any;
      expect(event.question.questionPhase).toBe("direct");
      expect(event.question.assignedTeamId).toBeTruthy();
      expect(event.scoringMode).toBe("bounce");
      expect(event.endsAt).toBeTruthy();
    });

    it("rejects if fewer than 2 active teams", async () => {
      const Team = mongoose.models.Team;
      await Team.deleteMany({ roomId: room._id, _id: { $ne: team1._id } });

      await qmSocket.invoke("post-question", {
        text: "Q?",
        timerSeconds: 30,
        points: 10,
      });

      const errors = getSocketEmits(qmSocket, "error");
      const bounceError = errors.find(
        (e: any) => e.message && e.message.includes("2 active teams")
      );
      expect(bounceError).toBeTruthy();
    });

    it("emits activity events for question start", async () => {
      await qmSocket.invoke("post-question", {
        text: "Bounce Q?",
        timerSeconds: 30,
        points: 10,
      });

      const activities = getIOEmits(io, "activity-event");
      const qStarted = activities.find((a: any) => a.type === "question_started");
      const teamAnswering = activities.find((a: any) => a.type === "team_answering");
      expect(qStarted).toBeTruthy();
      expect(teamAnswering).toBeTruthy();
    });
  });

  describe("submit-answer in bounce mode", () => {
    let question: any;

    beforeEach(async () => {
      // Pre-set team order to avoid randomness
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "direct",
        currentBounceTeamId: team1._id,
      });

      await createParticipation(cap1._id, room._id, "captain", { teamId: team1._id });
      await createParticipation(cap2._id, room._id, "captain", { teamId: team2._id });

      c1Socket.data.roomCode = room.code;
      c1Socket.data.roomId = room._id.toString();
      c2Socket.data.roomCode = room.code;
      c2Socket.data.roomId = room._id.toString();
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("assigned team captain submits direct answer", async () => {
      await c1Socket.invoke("submit-answer", { text: "Direct answer" });

      const submitted = getSocketEmits(c1Socket, "answer-submitted");
      expect(submitted).toHaveLength(1);

      const bounceSubmitted = getIOEmits(io, "bounce-answer-submitted");
      expect(bounceSubmitted).toHaveLength(1);
      const event = bounceSubmitted[0] as any;
      expect(event.answerType).toBe("direct");
      expect(event.teamName).toBe("Team A");
    });

    it("rejects answer from wrong team (not their turn)", async () => {
      await c2Socket.invoke("submit-answer", { text: "Not my turn" });

      const rejected = getSocketEmits(c2Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Not your turn");
    });

    it("rejects non-captain even for correct team", async () => {
      const member = await createUser({ displayName: "Member" });
      const Team = mongoose.models.Team;
      await Team.findByIdAndUpdate(team1._id, {
        $push: { memberIds: member._id },
      });

      const memSocket = createTestSocket(member._id.toString());
      await registerHandler(io, memSocket);
      memSocket.data.roomCode = room.code;
      memSocket.data.roomId = room._id.toString();

      await memSocket.invoke("submit-answer", { text: "member tries" });

      const rejected = getSocketEmits(memSocket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Only captain can submit");
    });

    it("adds team to attemptedTeamIds", async () => {
      await c1Socket.invoke("submit-answer", { text: "answer" });

      const Question = mongoose.models.Question;
      const q = await Question.findById(question._id);
      expect(q.attemptedTeamIds.map((id: any) => id.toString())).toContain(
        team1._id.toString()
      );
    });

    it("rejects reattempt from same team", async () => {
      await c1Socket.invoke("submit-answer", { text: "first attempt" });
      c1Socket.emit.mockClear();

      // Simulate: question bounced back to team1 somehow (shouldn't happen but test guard)
      const Question = mongoose.models.Question;
      await Question.findByIdAndUpdate(question._id, {
        currentBounceTeamId: team1._id,
      });

      await c1Socket.invoke("submit-answer", { text: "re-attempt" });

      const rejected = getSocketEmits(c1Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("No reattempts allowed");
    });
  });

  describe("mark-correct in bounce", () => {
    let question: any;
    let answer: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "active",
        points: 15,
        assignedTeamId: team1._id,
        questionPhase: "direct",
        currentBounceTeamId: team1._id,
        attemptedTeamIds: [team1._id],
      });

      answer = await createAnswer(question._id, room._id, cap1._id, {
        teamId: team1._id,
        text: "correct",
        answerType: "direct",
      });

      await createParticipation(cap1._id, room._id, "captain", { teamId: team1._id });
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("resolves question and awards points", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Question = mongoose.models.Question;
      const q = await Question.findById(question._id);
      expect(q.questionPhase).toBe("resolved");
      expect(q.status).toBe("closed");

      const Score = mongoose.models.Score;
      const score = await Score.findOne({ roomId: room._id, teamId: team1._id });
      expect(score.points).toBe(15);
    });

    it("advances round-robin index", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const Room = mongoose.models.Room;
      const r = await Room.findById(room._id);
      expect(r.currentTeamIndex).toBe(1);
    });

    it("emits answers-revealed when no pounces", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: answer._id.toString(),
      });

      const revealed = getIOEmits(io, "answers-revealed");
      expect(revealed).toHaveLength(1);
    });
  });

  describe("mark-wrong in bounce (advances to next team)", () => {
    let question: any;
    let answer: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "direct",
        currentBounceTeamId: team1._id,
        attemptedTeamIds: [team1._id],
      });

      answer = await createAnswer(question._id, room._id, cap1._id, {
        teamId: team1._id,
        text: "wrong",
        answerType: "direct",
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("bounces to next team on wrong answer", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const bounceAdvanced = getIOEmits(io, "bounce-advanced");
      expect(bounceAdvanced).toHaveLength(1);
      const adv = bounceAdvanced[0] as any;
      expect(adv.currentBounceTeamId).toBe(team2._id.toString());
      expect(adv.currentBounceTeamName).toBe("Team B");
    });

    it("emits answer_wrong activity event", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const activities = getIOEmits(io, "activity-event");
      const wrongEvent = activities.find((a: any) => a.type === "answer_wrong");
      expect(wrongEvent).toBeTruthy();
    });

    it("updates question phase to bounce", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const Question = mongoose.models.Question;
      const q = await Question.findById(question._id);
      expect(q.questionPhase).toBe("bounce");
      expect(q.currentBounceTeamId.toString()).toBe(team2._id.toString());
    });
  });

  describe("question exhausted (all teams wrong)", () => {
    let question: any;
    let answer: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "bounce",
        currentBounceTeamId: team2._id,
        attemptedTeamIds: [team1._id, team2._id],
      });

      answer = await createAnswer(question._id, room._id, cap2._id, {
        teamId: team2._id,
        text: "wrong from last team",
        answerType: "bounce",
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("resolves question when no more teams", async () => {
      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      const Question = mongoose.models.Question;
      const q = await Question.findById(question._id);
      expect(q.questionPhase).toBe("resolved");
      expect(q.status).toBe("closed");

      const exhausted = getIOEmits(io, "activity-event").filter(
        (a: any) => a.type === "question_exhausted"
      );
      expect(exhausted.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("pass-bounce", () => {
    let question: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "direct",
        currentBounceTeamId: team1._id,
      });

      c1Socket.data.roomCode = room.code;
      c1Socket.data.roomId = room._id.toString();
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await createParticipation(cap1._id, room._id, "captain", { teamId: team1._id });
    });

    it("passes turn to next team", async () => {
      await c1Socket.invoke("pass-bounce");

      const bounceAdvanced = getIOEmits(io, "bounce-advanced");
      expect(bounceAdvanced).toHaveLength(1);
      const adv = bounceAdvanced[0] as any;
      expect(adv.currentBounceTeamId).toBe(team2._id.toString());
    });

    it("emits team_passed activity", async () => {
      await c1Socket.invoke("pass-bounce");

      const activities = getIOEmits(io, "activity-event");
      const passed = activities.find((a: any) => a.type === "team_passed");
      expect(passed).toBeTruthy();
    });

    it("exhausts question when last team passes", async () => {
      // Set up: only team1 left, others already attempted
      const Question = mongoose.models.Question;
      await Question.findByIdAndUpdate(question._id, {
        attemptedTeamIds: [team2._id, team3._id],
      });

      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
      });

      await c1Socket.invoke("pass-bounce");

      const q = await Question.findById(question._id);
      expect(q.questionPhase).toBe("resolved");
      expect(q.status).toBe("closed");
    });
  });

  describe("bounce answer type detection", () => {
    it("records answerType=bounce when non-assigned team answers after bounce", async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });

      const question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "bounce",
        currentBounceTeamId: team2._id,
        attemptedTeamIds: [team1._id],
      });

      await createParticipation(cap2._id, room._id, "captain", { teamId: team2._id });

      c2Socket.data.roomCode = room.code;
      c2Socket.data.roomId = room._id.toString();

      await c2Socket.invoke("submit-answer", { text: "bounce answer" });

      const Answer = mongoose.models.Answer;
      const answer = await Answer.findOne({
        questionId: question._id,
        teamId: team2._id,
      });
      expect(answer.answerType).toBe("bounce");
    });
  });
});
