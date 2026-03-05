import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
  createUser,
  createRoom,
  createTeam,
  createQuestion,
  createAnswer,
  createScore,
  ensureTestModels,
} from "../helpers/fixtures";

let mongoServer: MongoMemoryServer;

let uuidCounter = 0;
jest.mock("uuid", () => ({
  v4: () => {
    uuidCounter++;
    const hex = uuidCounter.toString(16).padStart(8, "0");
    return `${hex}-0000-0000-0000-000000000000`;
  },
}));

jest.mock("@/lib/auth", () => ({
  getAuthUser: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(mongoose),
}));

import { getAuthUser } from "@/lib/auth";
const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
  process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-key-for-testing";
  await mongoose.connect(uri);
  ensureTestModels();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  jest.restoreAllMocks();
  mockGetAuthUser.mockReset();
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("POST /api/rooms", () => {
  let qmUser: any;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });
  });

  async function callPostRooms(body: Record<string, unknown>) {
    const { POST } = await import("@/app/api/rooms/route");
    const request = new Request("http://localhost/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return POST(request as any);
  }

  it("creates individual normal room", async () => {
    const res = await callPostRooms({
      name: "Test Room",
      mode: "individual",
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.room.mode).toBe("individual");
    expect(data.room.scoringMode).toBe("normal");
    expect(data.room.code).toBeTruthy();
  });

  it("creates team normal room", async () => {
    const res = await callPostRooms({
      name: "Team Room",
      mode: "team",
      scoringMode: "normal",
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.room.mode).toBe("team");
    expect(data.room.scoringMode).toBe("normal");
  });

  it("creates team bounce room", async () => {
    const res = await callPostRooms({
      name: "Bounce Room",
      mode: "team",
      scoringMode: "bounce",
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.room.scoringMode).toBe("bounce");
  });

  it("creates team pounce_bounce room with penalty", async () => {
    const res = await callPostRooms({
      name: "Pounce Room",
      mode: "team",
      scoringMode: "pounce_bounce",
      pouncePenalty: 5,
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.room.scoringMode).toBe("pounce_bounce");
    expect(data.room.pouncePenalty).toBe(5);
  });

  it("forces normal scoring for individual mode", async () => {
    const res = await callPostRooms({
      name: "Individual Bounce Attempt",
      mode: "individual",
      scoringMode: "bounce",
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.room.scoringMode).toBe("normal");
  });

  it("ignores pouncePenalty for non-pounce scoring", async () => {
    const res = await callPostRooms({
      name: "Bounce with Penalty",
      mode: "team",
      scoringMode: "bounce",
      pouncePenalty: 5,
    });

    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.room.pouncePenalty).toBeNull();
  });

  it("rejects missing name", async () => {
    const res = await callPostRooms({ mode: "individual" });
    expect(res.status).toBe(400);
  });

  it("rejects missing mode", async () => {
    const res = await callPostRooms({ name: "No Mode" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid mode", async () => {
    const res = await callPostRooms({ name: "Bad Mode", mode: "battle" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid expiration", async () => {
    const res = await callPostRooms({
      name: "Bad Expiry",
      mode: "individual",
      expiresInMinutes: 5,
    });
    expect(res.status).toBe(400);
  });

  it("rejects unauthorized user", async () => {
    mockGetAuthUser.mockResolvedValue(null);

    const res = await callPostRooms({
      name: "Unauth Room",
      mode: "individual",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/rooms", () => {
  let qmUser: any;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });
  });

  async function callGetRooms() {
    const { GET } = await import("@/app/api/rooms/route");
    return GET();
  }

  it("returns rooms owned by the quizmaster", async () => {
    await createRoom(qmUser._id, { name: "Room 1" });
    await createRoom(qmUser._id, { name: "Room 2" });

    const otherUser = await createUser({ displayName: "Other" });
    await createRoom(otherUser._id, { name: "Other Room" });

    const res = await callGetRooms();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rooms).toHaveLength(2);
    expect(data.rooms.every((r: any) => r.quizmasterId.toString() === qmUser._id.toString())).toBe(true);
  });

  it("returns empty array when no rooms exist", async () => {
    const res = await callGetRooms();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rooms).toHaveLength(0);
  });

  it("rejects unauthorized user", async () => {
    mockGetAuthUser.mockResolvedValue(null);
    const res = await callGetRooms();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/rooms/[code]", () => {
  let qmUser: any, player1: any;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    player1 = await createUser({ displayName: "Alice" });
  });

  async function callGetRoom(code: string) {
    const routeModule = await import("@/app/api/rooms/[code]/route");
    const request = new Request(`http://localhost/api/rooms/${code}`);
    return routeModule.GET(request as any, {
      params: Promise.resolve({ code }),
    });
  }

  it("returns room details with teams for team mode", async () => {
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });

    const room = await createRoom(qmUser._id, { mode: "team" });
    await createTeam(room._id, player1._id, [player1._id], { name: "Alpha" });

    const res = await callGetRoom(room.code);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.room.mode).toBe("team");
    expect(data.teams).toHaveLength(1);
  });

  it("returns 403 for banned user", async () => {
    const room = await createRoom(qmUser._id, {
      bannedUserIds: [player1._id],
    });

    mockGetAuthUser.mockResolvedValue({
      userId: player1._id.toString(),
      email: player1.email,
    });

    const res = await callGetRoom(room.code);
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent room", async () => {
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });

    const res = await callGetRoom("NONEXIST");
    expect(res.status).toBe(404);
  });

  it("identifies quizmaster correctly", async () => {
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });

    const room = await createRoom(qmUser._id);
    const res = await callGetRoom(room.code);
    const data = await res.json();
    expect(data.room.isQuizmaster).toBe(true);
  });

  it("non-QM sees isQuizmaster=false", async () => {
    const room = await createRoom(qmUser._id);

    mockGetAuthUser.mockResolvedValue({
      userId: player1._id.toString(),
      email: player1.email,
    });

    const res = await callGetRoom(room.code);
    const data = await res.json();
    expect(data.room.isQuizmaster).toBe(false);
  });
});

describe("GET /api/rooms/[code]/questions", () => {
  let qmUser: any, player1: any;

  beforeEach(async () => {
    qmUser = await createUser({ displayName: "QM" });
    player1 = await createUser({ displayName: "Alice" });
  });

  async function callGetQuestions(code: string) {
    const routeModule = await import("@/app/api/rooms/[code]/questions/route");
    const request = new Request(`http://localhost/api/rooms/${code}/questions`);
    return routeModule.GET(request as any, {
      params: Promise.resolve({ code }),
    });
  }

  it("QM sees all answers for each question", async () => {
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });

    const room = await createRoom(qmUser._id);
    const q = await createQuestion(room._id, {
      status: "closed",
      correctAnswer: "4",
    });
    await createAnswer(q._id, room._id, player1._id, {
      text: "4",
      isCorrect: true,
    });

    const res = await callGetQuestions(room.code);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].answers).toBeDefined();
    expect(data.questions[0].answers).toHaveLength(1);
  });

  it("player does not see other answers", async () => {
    const room = await createRoom(qmUser._id);
    const q = await createQuestion(room._id, {
      status: "closed",
      correctAnswer: "4",
    });
    await createAnswer(q._id, room._id, player1._id, {
      text: "4",
      isCorrect: true,
    });

    const player2 = await createUser({ displayName: "Bob" });
    await createAnswer(q._id, room._id, player2._id, {
      text: "5",
      isCorrect: false,
    });

    mockGetAuthUser.mockResolvedValue({
      userId: player1._id.toString(),
      email: player1.email,
    });

    const res = await callGetQuestions(room.code);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.questions[0].answers).toBeUndefined();
    expect(data.questions[0].myAnswer).toBe("4");
    expect(data.questions[0].isCorrect).toBe(true);
  });

  it("includes leaderboard", async () => {
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });

    const room = await createRoom(qmUser._id);
    await createScore(room._id, { userId: player1._id, points: 20 });

    const res = await callGetQuestions(room.code);
    const data = await res.json();

    expect(data.leaderboard).toBeDefined();
    expect(data.leaderboard.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 404 for non-existent room", async () => {
    mockGetAuthUser.mockResolvedValue({
      userId: qmUser._id.toString(),
      email: qmUser.email,
    });

    const res = await callGetQuestions("NONEXIST");
    expect(res.status).toBe(404);
  });
});
