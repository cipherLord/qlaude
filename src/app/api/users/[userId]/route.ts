import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import Participation from "@/lib/models/Participation";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    await dbConnect();

    const user = await User.findById(userId)
      .select("displayName username avatarUrl bio createdAt")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stats = await Participation.aggregate([
      { $match: { userId: user._id, role: { $ne: "quizmaster" } } },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          totalAnswers: { $sum: "$answersGiven" },
          totalCorrect: { $sum: "$correctAnswers" },
          totalPoints: { $sum: "$totalPoints" },
        },
      },
    ]);

    return NextResponse.json({
      user: {
        id: user._id,
        username: (user as Record<string, unknown>).username || null,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: (user as Record<string, unknown>).bio || null,
        createdAt: user.createdAt,
      },
      stats: stats[0] || {
        totalQuizzes: 0,
        totalAnswers: 0,
        totalCorrect: 0,
        totalPoints: 0,
      },
    });
  } catch (error) {
    console.error("User profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
