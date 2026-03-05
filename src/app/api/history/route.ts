import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Participation from "@/lib/models/Participation";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    const skip = (page - 1) * limit;

    await dbConnect();

    const [records, total] = await Promise.all([
      Participation.find({ userId: authUser.userId })
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("roomId", "name code mode status")
        .populate("teamId", "name")
        .lean(),
      Participation.countDocuments({ userId: authUser.userId }),
    ]);

    const stats = await Participation.aggregate([
      { $match: { userId: authUser.userId, role: { $ne: "quizmaster" } } },
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
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats[0] || {
        totalQuizzes: 0,
        totalAnswers: 0,
        totalCorrect: 0,
        totalPoints: 0,
      },
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
