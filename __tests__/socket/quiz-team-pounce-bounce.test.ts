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

describe("Team + Pounce-Bounce Mode", () => {
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
      scoringMode: "pounce_bounce",
      pouncePenalty: 5,
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

  describe("post-question with pounce phase", () => {
    beforeEach(async () => {
      await qmSocket.invoke("join-room", { roomCode: room.code });
    });

    it("starts with questionPhase=pounce", async () => {
      await qmSocket.invoke("post-question", {
        text: "Pounce Q?",
        timerSeconds: 60,
        points: 10,
      });

      const started = getIOEmits(io, "question-started");
      expect(started).toHaveLength(1);
      const event = started[0] as any;
      expect(event.question.questionPhase).toBe("pounce");
      expect(event.scoringMode).toBe("pounce_bounce");
      expect(event.pounceEndsAt).toBeTruthy();
      expect(event.endsAt).toBeNull();
    });

    it("emits pounce_open activity event", async () => {
      await qmSocket.invoke("post-question", {
        text: "Q?",
        timerSeconds: 30,
        points: 10,
      });

      const activities = getIOEmits(io, "activity-event");
      const pounceOpen = activities.find((a: any) => a.type === "pounce_open");
      expect(pounceOpen).toBeTruthy();
    });
  });

  describe("submit-pounce", () => {
    let question: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
        scoringMode: "pounce_bounce",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "pounce",
        currentBounceTeamId: team1._id,
      });

      await createParticipation(cap1._id, room._id, "captain", { teamId: team1._id });
      await createParticipation(cap2._id, room._id, "captain", { teamId: team2._id });
      await createParticipation(cap3._id, room._id, "captain", { teamId: team3._id });

      c1Socket.data.roomCode = room.code;
      c1Socket.data.roomId = room._id.toString();
      c2Socket.data.roomCode = room.code;
      c2Socket.data.roomId = room._id.toString();
      c3Socket.data.roomCode = room.code;
      c3Socket.data.roomId = room._id.toString();
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("non-assigned team can pounce", async () => {
      await c2Socket.invoke("submit-pounce", { text: "Pounce answer B" });

      const submitted = getSocketEmits(c2Socket, "answer-submitted");
      expect(submitted).toHaveLength(1);

      const Answer = mongoose.models.Answer;
      const answer = await Answer.findOne({
        questionId: question._id,
        teamId: team2._id,
      });
      expect(answer.answerType).toBe("pounce");
      expect(answer.text).toBe("Pounce answer B");
    });

    it("QM receives pounce-received", async () => {
      await c2Socket.invoke("submit-pounce", { text: "pounce!" });

      const received = getSocketEmits(qmSocket, "pounce-received");
      expect(received).toHaveLength(1);
      const r = received[0] as any;
      expect(r.teamName).toBe("Team B");
      expect(r.text).toBe("pounce!");
    });

    it("emits team_pounced activity and pounce-status-update", async () => {
      await c2Socket.invoke("submit-pounce", { text: "pounce!" });

      const activities = getIOEmits(io, "activity-event");
      const pounced = activities.find((a: any) => a.type === "team_pounced");
      expect(pounced).toBeTruthy();

      const statusUpdate = getIOEmits(io, "pounce-status-update");
      expect(statusUpdate).toHaveLength(1);
      expect((statusUpdate[0] as any).pouncedTeamIds).toContain(team2._id.toString());
    });

    it("adds team to pouncedTeamIds", async () => {
      await c2Socket.invoke("submit-pounce", { text: "pounce!" });

      const Question = mongoose.models.Question;
      const q = await Question.findById(question._id);
      expect(q.pouncedTeamIds.map((id: any) => id.toString())).toContain(
        team2._id.toString()
      );
    });

    it("rejects assigned team from pouncing", async () => {
      await c1Socket.invoke("submit-pounce", { text: "assigned pounce" });

      const rejected = getSocketEmits(c1Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Assigned team cannot pounce");
    });

    it("rejects double pounce from same team", async () => {
      await c2Socket.invoke("submit-pounce", { text: "first pounce" });
      c2Socket.emit.mockClear();

      await c2Socket.invoke("submit-pounce", { text: "second pounce" });

      const rejected = getSocketEmits(c2Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Already pounced");
    });

    it("rejects non-captain pounce", async () => {
      const member = await createUser({ displayName: "Mem" });
      const Team = mongoose.models.Team;
      await Team.findByIdAndUpdate(team2._id, {
        $push: { memberIds: member._id },
      });

      const memSocket = createTestSocket(member._id.toString());
      await registerHandler(io, memSocket);
      memSocket.data.roomCode = room.code;
      memSocket.data.roomId = room._id.toString();

      await memSocket.invoke("submit-pounce", { text: "member pounce" });

      const rejected = getSocketEmits(memSocket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Only captain can pounce");
    });

    it("rejects pounce when phase is not pounce", async () => {
      const Question = mongoose.models.Question;
      await Question.findByIdAndUpdate(question._id, {
        questionPhase: "direct",
      });

      await c2Socket.invoke("submit-pounce", { text: "late pounce" });

      const rejected = getSocketEmits(c2Socket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Pounce window closed");
    });

    it("rejects pounce for non-pounce scoring mode", async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, { scoringMode: "bounce" });

      const altSocket = createTestSocket(cap2._id.toString());
      await registerHandler(io, altSocket);
      altSocket.data.roomCode = room.code;
      altSocket.data.roomId = room._id.toString();

      await altSocket.invoke("submit-pounce", { text: "no pounce" });

      const rejected = getSocketEmits(altSocket, "answer-rejected");
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as any).reason).toBe("Pounce not available");
    });

    it("multiple teams can pounce", async () => {
      await c2Socket.invoke("submit-pounce", { text: "B pounce" });
      await c3Socket.invoke("submit-pounce", { text: "C pounce" });

      const Answer = mongoose.models.Answer;
      const pounces = await Answer.find({
        questionId: question._id,
        answerType: "pounce",
      });
      expect(pounces).toHaveLength(2);
    });
  });

  describe("advance-phase (QM ends pounce early)", () => {
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
        timerSeconds: 30,
        assignedTeamId: team1._id,
        questionPhase: "pounce",
        currentBounceTeamId: team1._id,
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("transitions from pounce to direct phase", async () => {
      await qmSocket.invoke("advance-phase");

      const phaseChanged = getIOEmits(io, "phase-changed");
      expect(phaseChanged).toHaveLength(1);
      const event = phaseChanged[0] as any;
      expect(event.questionPhase).toBe("direct");
      expect(event.endsAt).toBeTruthy();
    });

    it("emits pounce_closed activity", async () => {
      await qmSocket.invoke("advance-phase");

      const activities = getIOEmits(io, "activity-event");
      const closed = activities.find((a: any) => a.type === "pounce_closed");
      expect(closed).toBeTruthy();
    });

    it("non-QM cannot advance phase", async () => {
      c2Socket.data.roomCode = room.code;
      c2Socket.data.roomId = room._id.toString();

      await c2Socket.invoke("advance-phase");

      const phaseChanged = getIOEmits(io, "phase-changed");
      expect(phaseChanged).toHaveLength(0);
    });

    it("does nothing if phase is not pounce", async () => {
      const Question = mongoose.models.Question;
      await Question.findByIdAndUpdate(question._id, {
        questionPhase: "direct",
      });

      await qmSocket.invoke("advance-phase");

      const phaseChanged = getIOEmits(io, "phase-changed");
      expect(phaseChanged).toHaveLength(0);
    });
  });

  describe("bounce after pounce (pounced teams skipped)", () => {
    it("pounced team is skipped in bounce order", async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      // team1 is assigned, team2 pounced, question in direct phase
      const question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "direct",
        currentBounceTeamId: team1._id,
        attemptedTeamIds: [team1._id],
        pouncedTeamIds: [team2._id],
      });

      const answer = await createAnswer(question._id, room._id, cap1._id, {
        teamId: team1._id,
        text: "wrong",
        answerType: "direct",
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("mark-wrong", {
        answerId: answer._id.toString(),
      });

      // Should skip team2 (pounced) and go to team3
      const bounceAdvanced = getIOEmits(io, "bounce-advanced");
      expect(bounceAdvanced).toHaveLength(1);
      expect((bounceAdvanced[0] as any).currentBounceTeamId).toBe(
        team3._id.toString()
      );
    });
  });

  describe("mark-correct with pounces triggers marking phase", () => {
    let question: any;
    let directAnswer: any;
    let pounceAnswer: any;

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
        pouncedTeamIds: [team2._id],
      });

      directAnswer = await createAnswer(question._id, room._id, cap1._id, {
        teamId: team1._id,
        text: "correct direct",
        answerType: "direct",
      });

      pounceAnswer = await createAnswer(question._id, room._id, cap2._id, {
        teamId: team2._id,
        text: "pounce answer",
        answerType: "pounce",
      });

      await createParticipation(cap1._id, room._id, "captain", { teamId: team1._id });
      await createParticipation(cap2._id, room._id, "captain", { teamId: team2._id });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("triggers pounce-marking-phase after correct bounce answer", async () => {
      await qmSocket.invoke("mark-correct", {
        answerId: directAnswer._id.toString(),
      });

      const pounceMarking = getIOEmits(io, "pounce-marking-phase");
      expect(pounceMarking).toHaveLength(1);
      const event = pounceMarking[0] as any;
      expect(event.pounceAnswers).toHaveLength(1);
      expect(event.pounceAnswers[0].teamName).toBe("Team B");
    });
  });

  describe("mark-pounce", () => {
    let question: any;
    let pounceAnswer: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "closed",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "resolved",
        pouncedTeamIds: [team2._id],
      });

      pounceAnswer = await createAnswer(question._id, room._id, cap2._id, {
        teamId: team2._id,
        text: "pounce answer",
        answerType: "pounce",
      });

      await createParticipation(cap2._id, room._id, "captain", { teamId: team2._id });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("correct pounce awards +points", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: true,
      });

      const Score = mongoose.models.Score;
      const score = await Score.findOne({ roomId: room._id, teamId: team2._id });
      expect(score.points).toBe(10);
      expect(score.correctCount).toBe(1);
    });

    it("correct pounce updates participation", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: true,
      });

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: cap2._id,
        roomId: room._id,
      });
      expect(p.correctAnswers).toBe(1);
      expect(p.totalPoints).toBe(10);
    });

    it("wrong pounce deducts penalty (custom pouncePenalty)", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: false,
      });

      const Score = mongoose.models.Score;
      const score = await Score.findOne({ roomId: room._id, teamId: team2._id });
      expect(score.points).toBe(-5); // room.pouncePenalty = 5
    });

    it("wrong pounce uses question.points if no custom penalty", async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, { pouncePenalty: null });

      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: false,
      });

      const Score = mongoose.models.Score;
      const score = await Score.findOne({ roomId: room._id, teamId: team2._id });
      expect(score.points).toBe(-10); // falls back to question.points
    });

    it("emits pounce_correct activity on correct", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: true,
      });

      const activities = getIOEmits(io, "activity-event");
      const correct = activities.find((a: any) => a.type === "pounce_correct");
      expect(correct).toBeTruthy();
      expect((correct as any).points).toBe(10);
    });

    it("emits pounce_wrong activity on wrong", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: false,
      });

      const activities = getIOEmits(io, "activity-event");
      const wrong = activities.find((a: any) => a.type === "pounce_wrong");
      expect(wrong).toBeTruthy();
      expect((wrong as any).points).toBe(-5);
    });

    it("emits pounce-marked event", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer._id.toString(),
        isCorrect: true,
      });

      const marked = getIOEmits(io, "pounce-marked");
      expect(marked).toHaveLength(1);
      const m = marked[0] as any;
      expect(m.isCorrect).toBe(true);
      expect(m.teamName).toBe("Team B");
    });

    it("rejects non-pounce answer", async () => {
      const directAnswer = await createAnswer(question._id, room._id, cap1._id, {
        teamId: team1._id,
        text: "direct",
        answerType: "direct",
      });

      await qmSocket.invoke("mark-pounce", {
        answerId: directAnswer._id.toString(),
        isCorrect: true,
      });

      const errors = getSocketEmits(qmSocket, "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect((errors[0] as any).message).toContain("Invalid pounce answer");
    });
  });

  describe("all pounces marked", () => {
    let question: any;
    let pounceAnswer1: any;
    let pounceAnswer2: any;

    beforeEach(async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id, team3._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      question = await createQuestion(room._id, {
        status: "closed",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "resolved",
        pouncedTeamIds: [team2._id, team3._id],
      });

      pounceAnswer1 = await createAnswer(question._id, room._id, cap2._id, {
        teamId: team2._id,
        text: "pounce B",
        answerType: "pounce",
      });

      pounceAnswer2 = await createAnswer(question._id, room._id, cap3._id, {
        teamId: team3._id,
        text: "pounce C",
        answerType: "pounce",
      });

      await createParticipation(cap2._id, room._id, "captain", { teamId: team2._id });
      await createParticipation(cap3._id, room._id, "captain", { teamId: team3._id });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();
    });

    it("emits all-pounces-marked after last pounce is marked", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer1._id.toString(),
        isCorrect: true,
      });

      let allMarked = getIOEmits(io, "all-pounces-marked");
      expect(allMarked).toHaveLength(0);

      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer2._id.toString(),
        isCorrect: false,
      });

      allMarked = getIOEmits(io, "all-pounces-marked");
      expect(allMarked).toHaveLength(1);
    });

    it("emits answers-revealed after all pounces marked", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer1._id.toString(),
        isCorrect: true,
      });
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer2._id.toString(),
        isCorrect: false,
      });

      const revealed = getIOEmits(io, "answers-revealed");
      expect(revealed).toHaveLength(1);
    });

    it("emits leaderboard-update after all pounces marked", async () => {
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer1._id.toString(),
        isCorrect: true,
      });
      await qmSocket.invoke("mark-pounce", {
        answerId: pounceAnswer2._id.toString(),
        isCorrect: false,
      });

      const lb = getIOEmits(io, "leaderboard-update");
      expect(lb.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("question exhausted with pounces", () => {
    it("triggers pounce marking phase before revealing", async () => {
      const Room = mongoose.models.Room;
      await Room.findByIdAndUpdate(room._id, {
        teamOrder: [team1._id, team2._id],
        currentTeamIndex: 0,
        status: "active",
      });
      room = await Room.findById(room._id);

      const question = await createQuestion(room._id, {
        status: "active",
        points: 10,
        assignedTeamId: team1._id,
        questionPhase: "bounce",
        currentBounceTeamId: team2._id,
        attemptedTeamIds: [team1._id, team2._id],
        pouncedTeamIds: [team3._id],
      });

      // Pounce answer from team3 exists
      await createAnswer(question._id, room._id, cap3._id, {
        teamId: team3._id,
        text: "pounce C",
        answerType: "pounce",
      });

      const lastAnswer = await createAnswer(question._id, room._id, cap2._id, {
        teamId: team2._id,
        text: "wrong from B",
        answerType: "bounce",
      });

      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("mark-wrong", {
        answerId: lastAnswer._id.toString(),
      });

      const pounceMarking = getIOEmits(io, "pounce-marking-phase");
      expect(pounceMarking).toHaveLength(1);

      // Should not emit answers-revealed yet
      const revealed = getIOEmits(io, "answers-revealed");
      expect(revealed).toHaveLength(0);
    });
  });
});
