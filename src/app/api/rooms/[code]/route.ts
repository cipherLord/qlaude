import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/lib/models/Room";
import Team from "@/lib/models/Team";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    await dbConnect();

    const room = await Room.findOne({ code })
      .populate("quizmasterId", "displayName email")
      .lean();

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isBanned = room.bannedUserIds?.some(
      (id: { toString: () => string }) => id.toString() === authUser.userId
    );
    if (isBanned) {
      return NextResponse.json(
        { error: "You have been removed from this room" },
        { status: 403 }
      );
    }

    let teams: unknown[] = [];
    if (room.mode === "team") {
      teams = await Team.find({ roomId: room._id, status: "active" })
        .populate("captainId", "displayName")
        .select("-passwordHash")
        .lean();
    }

    const isQuizmaster =
      (room.quizmasterId as unknown as { _id: { toString: () => string } })._id.toString() ===
      authUser.userId;

    return NextResponse.json({
      room: {
        id: room._id,
        code: room.code,
        name: room.name,
        mode: room.mode,
        scoringMode: (room as Record<string, unknown>).scoringMode ?? "normal",
        pouncePoints: (room as Record<string, unknown>).pouncePoints ?? null,
        pouncePenalty: (room as Record<string, unknown>).pouncePenalty ?? null,
        totalQuestions: (room as Record<string, unknown>).totalQuestions ?? 0,
        status: room.status,
        maxTeams: room.maxTeams,
        maxTeamSize: room.maxTeamSize,
        expiresAt: room.expiresAt,
        quizmaster: room.quizmasterId,
        isQuizmaster,
      },
      teams,
    });
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
