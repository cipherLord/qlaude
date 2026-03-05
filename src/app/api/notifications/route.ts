import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const notifications = await Notification.find({
      userId: authUser.userId,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("fromUserId", "displayName")
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: authUser.userId,
      read: false,
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationIds } = body;

    await dbConnect();

    if (notificationIds?.length) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, userId: authUser.userId },
        { read: true }
      );
    } else {
      await Notification.updateMany(
        { userId: authUser.userId, read: false },
        { read: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
