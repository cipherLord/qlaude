import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/lib/models/Room";
import Notification from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await req.json();
    const { userIds } = body;

    if (!userIds?.length) {
      return NextResponse.json(
        { error: "No users to invite" },
        { status: 400 }
      );
    }

    await dbConnect();

    const room = await Room.findOne({ code });
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const notifications = userIds.map((uid: string) => ({
      userId: uid,
      type: "room_invite" as const,
      fromUserId: authUser.userId,
      data: { roomCode: room.code, roomName: room.name },
    }));

    await Notification.insertMany(notifications);

    return NextResponse.json({ success: true, invitedCount: userIds.length });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
