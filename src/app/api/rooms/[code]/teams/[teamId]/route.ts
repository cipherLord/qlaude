import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/lib/models/Room";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; teamId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code: roomCode, teamId } = await params;
    await dbConnect();

    const room = await Room.findOne({ code: roomCode });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const team = await Team.findById(teamId);
    if (!team || team.roomId.toString() !== room._id.toString()) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isQuizmaster = room.quizmasterId.toString() === authUser.userId;
    const isCaptain = team.captainId.toString() === authUser.userId;

    if (isQuizmaster) {
      team.status = "disqualified";
      team.disqualifiedAt = new Date();
      team.disqualifyReason = "Removed by quizmaster";
      await team.save();

      await Room.findByIdAndUpdate(room._id, {
        $addToSet: { bannedUserIds: { $each: team.memberIds } },
      });
      await User.updateMany(
        { _id: { $in: team.memberIds } },
        { activeRoomId: null, activeCaptainTeamId: null }
      );

      return NextResponse.json({ success: true, action: "disqualified" });
    }

    if (isCaptain) {
      if (room.status !== "waiting") {
        return NextResponse.json(
          { error: "Cannot delete team after quiz has started" },
          { status: 400 }
        );
      }

      await User.findByIdAndUpdate(authUser.userId, {
        activeCaptainTeamId: null,
      });
      await Team.findByIdAndDelete(teamId);

      return NextResponse.json({ success: true, action: "deleted" });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch (error) {
    console.error("Delete team error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
