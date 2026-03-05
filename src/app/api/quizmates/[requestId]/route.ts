import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Quizmate from "@/lib/models/Quizmate";
import Notification from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId } = await params;
    const body = await req.json();
    const { action } = body;

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    await dbConnect();

    const request = await Quizmate.findById(requestId);
    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.recipientId.toString() !== authUser.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Request already handled" },
        { status: 400 }
      );
    }

    request.status = action === "accept" ? "accepted" : "declined";
    request.respondedAt = new Date();
    await request.save();

    if (action === "accept") {
      await Notification.create({
        userId: request.requesterId,
        type: "quizmate_accepted",
        fromUserId: authUser.userId,
        data: {},
      });
    }

    return NextResponse.json({ success: true, status: request.status });
  } catch (error) {
    console.error("Handle quizmate request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
