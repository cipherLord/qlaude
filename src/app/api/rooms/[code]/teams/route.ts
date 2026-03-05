import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/db";
import Room from "@/lib/models/Room";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import { getAuthUser } from "@/lib/auth";

function generateTeamCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code: roomCode } = await params;
    const body = await req.json();
    const { teamName, password, action, teamCode, teamPassword } = body;

    await dbConnect();

    const room = await Room.findOne({ code: roomCode });
    if (!room || room.mode !== "team") {
      return NextResponse.json(
        { error: "Team room not found" },
        { status: 404 }
      );
    }

    if (room.status !== "waiting") {
      return NextResponse.json(
        { error: "Cannot modify teams after quiz has started" },
        { status: 400 }
      );
    }

    if (action === "create") {
      if (!teamName) {
        return NextResponse.json(
          { error: "Team name is required" },
          { status: 400 }
        );
      }

      const user = await User.findById(authUser.userId);
      if (user?.activeCaptainTeamId) {
        return NextResponse.json(
          { error: "You are already captain of another team" },
          { status: 400 }
        );
      }

      if (room.maxTeams) {
        const teamCount = await Team.countDocuments({
          roomId: room._id,
          status: "active",
        });
        if (teamCount >= room.maxTeams) {
          return NextResponse.json(
            { error: "Maximum number of teams reached" },
            { status: 400 }
          );
        }
      }

      let tCode = generateTeamCode();
      let attempts = 0;
      while (await Team.findOne({ roomId: room._id, code: tCode })) {
        tCode = generateTeamCode();
        if (++attempts > 10) {
          return NextResponse.json(
            { error: "Failed to generate team code" },
            { status: 500 }
          );
        }
      }

      const passwordHash = password
        ? await bcrypt.hash(password, 10)
        : null;

      const team = await Team.create({
        roomId: room._id,
        name: teamName.trim(),
        code: tCode,
        passwordHash,
        captainId: authUser.userId,
        memberIds: [authUser.userId],
      });

      await User.findByIdAndUpdate(authUser.userId, {
        activeCaptainTeamId: team._id,
      });

      return NextResponse.json({
        team: {
          id: team._id,
          name: team.name,
          code: team.code,
          hasPassword: !!passwordHash,
          captainId: team.captainId,
          memberCount: 1,
        },
      });
    }

    if (action === "join") {
      if (!teamCode) {
        return NextResponse.json(
          { error: "Team code is required" },
          { status: 400 }
        );
      }

      const team = await Team.findOne({
        roomId: room._id,
        code: teamCode.toUpperCase(),
        status: "active",
      });

      if (!team) {
        return NextResponse.json(
          { error: "Team not found" },
          { status: 404 }
        );
      }

      if (team.passwordHash) {
        if (!teamPassword) {
          return NextResponse.json(
            { error: "Team password is required" },
            { status: 400 }
          );
        }
        const valid = await bcrypt.compare(teamPassword, team.passwordHash);
        if (!valid) {
          return NextResponse.json(
            { error: "Incorrect team password" },
            { status: 401 }
          );
        }
      }

      if (team.memberIds.length >= room.maxTeamSize) {
        return NextResponse.json(
          { error: "Team is full" },
          { status: 400 }
        );
      }

      const alreadyMember = team.memberIds.some(
        (id: { toString: () => string }) => id.toString() === authUser.userId
      );
      if (alreadyMember) {
        return NextResponse.json(
          { error: "You are already in this team" },
          { status: 400 }
        );
      }

      team.memberIds.push(authUser.userId as unknown as import("mongoose").Types.ObjectId);
      await team.save();

      return NextResponse.json({
        team: {
          id: team._id,
          name: team.name,
          code: team.code,
          captainId: team.captainId,
          memberCount: team.memberIds.length,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Team action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code: roomCode } = await params;
    await dbConnect();

    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const teams = await Team.find({ roomId: room._id, status: "active" })
      .populate("captainId", "displayName")
      .populate("memberIds", "displayName")
      .select("-passwordHash")
      .lean();

    const teamsWithMeta = teams.map((t) => ({
      ...t,
      hasPassword: !!t.passwordHash,
      memberCount: t.memberIds?.length || 0,
    }));

    return NextResponse.json({ teams: teamsWithMeta });
  } catch (error) {
    console.error("List teams error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
