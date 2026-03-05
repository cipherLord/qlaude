import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Quizmate from "@/lib/models/Quizmate";
import User from "@/lib/models/User";
import Notification from "@/lib/models/Notification";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const uid = authUser.userId;

    const accepted = await Quizmate.find({
      status: "accepted",
      $or: [{ requesterId: uid }, { recipientId: uid }],
    }).lean();

    const friendIds = accepted.map((q) =>
      q.requesterId.toString() === uid
        ? q.recipientId
        : q.requesterId
    );

    const friends = await User.find({ _id: { $in: friendIds } })
      .select("displayName email avatarUrl")
      .lean();

    const pending = await Quizmate.find({
      recipientId: uid,
      status: "pending",
    })
      .populate("requesterId", "displayName email")
      .lean();

    return NextResponse.json({
      quizmates: friends,
      pendingRequests: pending,
    });
  } catch (error) {
    console.error("Quizmates list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const recipient = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!recipient) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (recipient._id.toString() === authUser.userId) {
      return NextResponse.json(
        { error: "Cannot add yourself" },
        { status: 400 }
      );
    }

    const existing = await Quizmate.findOne({
      $or: [
        { requesterId: authUser.userId, recipientId: recipient._id },
        { requesterId: recipient._id, recipientId: authUser.userId },
      ],
    });

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json(
          { error: "Already quizmates" },
          { status: 400 }
        );
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "Request already pending" },
          { status: 400 }
        );
      }
    }

    const request = await Quizmate.create({
      requesterId: new mongoose.Types.ObjectId(authUser.userId),
      recipientId: recipient._id,
    });

    await Notification.create({
      userId: recipient._id,
      type: "quizmate_request",
      fromUserId: authUser.userId,
      data: { requestId: request._id },
    });

    return NextResponse.json({ success: true, requestId: request._id });
  } catch (error) {
    console.error("Send quizmate request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
