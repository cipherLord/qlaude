import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/db";
import Room from "@/lib/models/Room";
import { getAuthUser } from "@/lib/auth";

function generateRoomCode(): string {
  return uuidv4().slice(0, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, mode, maxTeams, maxTeamSize, expiresInMinutes, scoringMode, pouncePoints, pouncePenalty, totalQuestions } = body;

    if (!name || !mode) {
      return NextResponse.json(
        { error: "Room name and mode are required" },
        { status: 400 }
      );
    }

    if (!["individual", "team"].includes(mode)) {
      return NextResponse.json(
        { error: "Mode must be 'individual' or 'team'" },
        { status: 400 }
      );
    }

    const validScoringModes = ["normal", "bounce", "pounce_bounce"];
    const resolvedScoringMode = scoringMode && validScoringModes.includes(scoringMode)
      ? scoringMode
      : "normal";

    const resolvedPouncePoints = resolvedScoringMode === "pounce_bounce" && pouncePoints && Number(pouncePoints) > 0
      ? Math.min(100, Number(pouncePoints))
      : null;

    const resolvedPouncePenalty = resolvedScoringMode === "pounce_bounce" && pouncePenalty && Number(pouncePenalty) > 0
      ? Number(pouncePenalty)
      : null;

    const resolvedTotalQuestions = totalQuestions && Number(totalQuestions) > 0
      ? Math.min(500, Number(totalQuestions))
      : 0;

    const expMinutes = expiresInMinutes ?? 0;
    if (expMinutes !== 0 && (expMinutes < 10 || expMinutes > 1440)) {
      return NextResponse.json(
        { error: "Expiration must be 0 (no limit) or between 10 and 1440 minutes" },
        { status: 400 }
      );
    }

    const expiresAt = expMinutes === 0
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + expMinutes * 60 * 1000);

    await dbConnect();

    let code = generateRoomCode();
    let attempts = 0;
    while (await Room.findOne({ code })) {
      code = generateRoomCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: "Failed to generate unique room code" },
          { status: 500 }
        );
      }
    }

    const room = await Room.create({
      code,
      name: name.trim(),
      quizmasterId: authUser.userId,
      mode,
      scoringMode: resolvedScoringMode,
      pouncePoints: resolvedPouncePoints,
      pouncePenalty: resolvedPouncePenalty,
      totalQuestions: resolvedTotalQuestions,
      maxTeams: mode === "team" ? maxTeams || null : null,
      maxTeamSize: mode === "team" ? maxTeamSize || 5 : 1,
      expiresAt,
    });

    return NextResponse.json({
      room: {
        id: room._id,
        code: room.code,
        name: room.name,
        mode: room.mode,
        scoringMode: room.scoringMode,
        pouncePoints: room.pouncePoints,
        pouncePenalty: room.pouncePenalty,
        totalQuestions: room.totalQuestions,
        status: room.status,
        maxTeams: room.maxTeams,
        maxTeamSize: room.maxTeamSize,
        expiresAt: room.expiresAt,
      },
    });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const rooms = await Room.find({
      quizmasterId: authUser.userId,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ rooms });
  } catch (error) {
    console.error("List rooms error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
