import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createUser,
  createRoom,
  createTeam,
  createQuestion,
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

describe("Room Lifecycle", () => {
  let qmUser: any, player1: any, player2: any;
  let io: TestIO;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    player1 = await createUser({ displayName: "Alice" });
    player2 = await createUser({ displayName: "Bob" });

    io = createTestIO();
  });

  describe("join-room edge cases", () => {
    it("rejects expired room", async () => {
      const room = await createRoom(qmUser._id, {
        expiresAt: new Date(Date.now() - 1000),
      });
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("join-room", { roomCode: room.code });

      const errors = getSocketEmits(socket, "error");
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).message).toContain("expired");
    });

    it("rejects banned user", async () => {
      const room = await createRoom(qmUser._id, {
        bannedUserIds: [player1._id],
      });
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("join-room", { roomCode: room.code });

      const errors = getSocketEmits(socket, "error");
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).message).toContain("removed");
    });

    it("rejects non-QM from closed room", async () => {
      const room = await createRoom(qmUser._id, { status: "closed" });
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("join-room", { roomCode: room.code });

      const errors = getSocketEmits(socket, "error");
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).message).toContain("closed");
    });

    it("allows QM to join closed room", async () => {
      const room = await createRoom(qmUser._id, { status: "closed" });
      const qmSocket = createTestSocket(qmUser._id.toString());
      await registerHandler(io, qmSocket);

      await qmSocket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(qmSocket, "room-state");
      expect(states).toHaveLength(1);
      expect((states[0] as any).room.isQuizmaster).toBe(true);
    });

    it("emits already-in-room if user is in another room", async () => {
      const room1 = await createRoom(qmUser._id);
      const room2 = await createRoom(qmUser._id);

      const User = mongoose.models.User;
      await User.findByIdAndUpdate(player1._id, { activeRoomId: room1._id });

      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("join-room", { roomCode: room2.code });

      const already = getSocketEmits(socket, "already-in-room");
      expect(already).toHaveLength(1);
      expect((already[0] as any).currentRoomId.toString()).toBe(room1._id.toString());
    });

    it("allows re-joining current room", async () => {
      const room = await createRoom(qmUser._id);

      const User = mongoose.models.User;
      await User.findByIdAndUpdate(player1._id, { activeRoomId: room._id });

      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("join-room", { roomCode: room.code });

      const states = getSocketEmits(socket, "room-state");
      expect(states).toHaveLength(1);
    });

    it("returns error for non-existent room", async () => {
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);

      await socket.invoke("join-room", { roomCode: "NONEXIST" });

      const errors = getSocketEmits(socket, "error");
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).message).toContain("not found");
    });
  });

  describe("leave-room", () => {
    it("clears user activeRoomId", async () => {
      const room = await createRoom(qmUser._id);
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);
      await socket.invoke("join-room", { roomCode: room.code });

      await socket.invoke("leave-room");

      const User = mongoose.models.User;
      const user = await User.findById(player1._id);
      expect(user.activeRoomId).toBeNull();
    });

    it("sets participation leftAt", async () => {
      const room = await createRoom(qmUser._id);
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);
      await socket.invoke("join-room", { roomCode: room.code });

      await socket.invoke("leave-room");

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: player1._id,
        roomId: room._id,
      });
      expect(p.leftAt).toBeTruthy();
    });

    it("emits participant-left to room", async () => {
      const room = await createRoom(qmUser._id);
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);
      await socket.invoke("join-room", { roomCode: room.code });

      await socket.invoke("leave-room");

      const toMock = socket.to.mock.results;
      const lastTo = toMock[toMock.length - 1]?.value?.emit;
      if (lastTo) {
        expect(lastTo).toHaveBeenCalledWith(
          "participant-left",
          expect.objectContaining({ userId: player1._id.toString() })
        );
      }
    });
  });

  describe("close-room", () => {
    it("closes room and emits room-closed", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });

      await createQuestion(room._id, { status: "active" });

      const qmSocket = createTestSocket(qmUser._id.toString());
      io.addSocketForFetch(qmSocket);
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      const ack = jest.fn();
      await qmSocket.invoke("close-room", {}, ack);

      const Room = mongoose.models.Room;
      const updated = await Room.findById(room._id);
      expect(updated.status).toBe("closed");

      const roomClosed = getIOEmits(io, "room-closed");
      expect(roomClosed.length).toBeGreaterThanOrEqual(1);

      expect(ack).toHaveBeenCalledWith({ ok: true });
    });

    it("closes active questions on close", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });
      await createQuestion(room._id, { status: "active", order: 1 });
      await createQuestion(room._id, { status: "active", order: 2 });

      const qmSocket = createTestSocket(qmUser._id.toString());
      io.addSocketForFetch(qmSocket);
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("close-room", {});

      const Question = mongoose.models.Question;
      const activeQs = await Question.find({ roomId: room._id, status: "active" });
      expect(activeQs).toHaveLength(0);
    });

    it("clears all users activeRoomId", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });
      const User = mongoose.models.User;
      await User.findByIdAndUpdate(player1._id, { activeRoomId: room._id });
      await User.findByIdAndUpdate(player2._id, { activeRoomId: room._id });

      const qmSocket = createTestSocket(qmUser._id.toString());
      io.addSocketForFetch(qmSocket);
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("close-room", {});

      const p1 = await User.findById(player1._id);
      const p2 = await User.findById(player2._id);
      expect(p1.activeRoomId).toBeNull();
      expect(p2.activeRoomId).toBeNull();
    });

    it("non-QM cannot close room", async () => {
      const room = await createRoom(qmUser._id, { status: "active" });

      const pSocket = createTestSocket(player1._id.toString());
      await registerHandler(io, pSocket);
      pSocket.data.roomCode = room.code;
      pSocket.data.roomId = room._id.toString();

      const ack = jest.fn();
      await pSocket.invoke("close-room", {}, ack);

      const Room = mongoose.models.Room;
      const r = await Room.findById(room._id);
      expect(r.status).toBe("active");

      const errors = getSocketEmits(pSocket, "error");
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("disqualify-team", () => {
    it("disqualifies team and bans members", async () => {
      const room = await createRoom(qmUser._id, {
        mode: "team",
        status: "active",
      });
      const team = await createTeam(room._id, player1._id, [player1._id, player2._id], {
        name: "Alpha",
      });
      await createScore(room._id, { teamId: team._id, points: 30 });

      const qmSocket = createTestSocket(qmUser._id.toString());
      const p1Socket = createTestSocket(player1._id.toString());
      io.addSocketForFetch(qmSocket);
      io.addSocketForFetch(p1Socket);
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("disqualify-team", {
        teamId: team._id.toString(),
        reason: "Cheating",
      });

      const Team = mongoose.models.Team;
      const t = await Team.findById(team._id);
      expect(t.status).toBe("disqualified");
      expect(t.disqualifyReason).toBe("Cheating");

      const Room = mongoose.models.Room;
      const r = await Room.findById(room._id);
      expect(r.bannedUserIds.map((id: any) => id.toString())).toContain(
        player1._id.toString()
      );
      expect(r.bannedUserIds.map((id: any) => id.toString())).toContain(
        player2._id.toString()
      );

      const Score = mongoose.models.Score;
      const score = await Score.findOne({ roomId: room._id, teamId: team._id });
      expect(score).toBeNull();
    });

    it("emits team-disqualified to team members", async () => {
      const room = await createRoom(qmUser._id, {
        mode: "team",
        status: "active",
      });
      const team = await createTeam(room._id, player1._id, [player1._id]);

      const qmSocket = createTestSocket(qmUser._id.toString());
      const p1Socket = createTestSocket(player1._id.toString());
      p1Socket.data.userId = player1._id.toString();
      io.addSocketForFetch(qmSocket);
      io.addSocketForFetch(p1Socket);
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("disqualify-team", {
        teamId: team._id.toString(),
      });

      const disqualified = getSocketEmits(p1Socket, "team-disqualified");
      expect(disqualified).toHaveLength(1);
    });
  });

  describe("disqualify-participant", () => {
    it("bans individual participant and removes score", async () => {
      const room = await createRoom(qmUser._id, {
        mode: "individual",
        status: "active",
      });
      await createScore(room._id, { userId: player1._id, points: 50 });

      const qmSocket = createTestSocket(qmUser._id.toString());
      const p1Socket = createTestSocket(player1._id.toString());
      p1Socket.data.userId = player1._id.toString();
      io.addSocketForFetch(qmSocket);
      io.addSocketForFetch(p1Socket);
      await registerHandler(io, qmSocket);
      qmSocket.data.roomCode = room.code;
      qmSocket.data.roomId = room._id.toString();

      await qmSocket.invoke("disqualify-participant", {
        participantId: player1._id.toString(),
        reason: "Rule violation",
      });

      const Room = mongoose.models.Room;
      const r = await Room.findById(room._id);
      expect(r.bannedUserIds.map((id: any) => id.toString())).toContain(
        player1._id.toString()
      );

      const Score = mongoose.models.Score;
      const score = await Score.findOne({ roomId: room._id, userId: player1._id });
      expect(score).toBeNull();

      const disqualified = getSocketEmits(p1Socket, "participant-disqualified");
      expect(disqualified).toHaveLength(1);
    });
  });

  describe("disconnect", () => {
    it("clears user activeRoomId and sets leftAt", async () => {
      const room = await createRoom(qmUser._id);
      const socket = createTestSocket(player1._id.toString());
      await registerHandler(io, socket);
      await socket.invoke("join-room", { roomCode: room.code });

      await socket.invoke("disconnect");

      const User = mongoose.models.User;
      const user = await User.findById(player1._id);
      expect(user.activeRoomId).toBeNull();

      const Participation = mongoose.models.Participation;
      const p = await Participation.findOne({
        userId: player1._id,
        roomId: room._id,
      });
      expect(p.leftAt).toBeTruthy();
    });
  });
});
