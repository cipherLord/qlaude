import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Room from "@/lib/models/Room";
import Question from "@/lib/models/Question";
import Answer from "@/lib/models/Answer";
import Score from "@/lib/models/Score";
import User from "@/lib/models/User";
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

    const room = await Room.findOne({ code }).lean();
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const isQuizmaster =
      room.quizmasterId.toString() === authUser.userId;

    const questions = await Question.find({ roomId: room._id })
      .sort({ order: 1 })
      .lean();

    const questionIds = questions.map((q) => q._id);
    const answers = await Answer.find({ questionId: { $in: questionIds } })
      .sort({ submittedAt: 1 })
      .populate("userId", "displayName")
      .populate("teamId", "name")
      .lean();

    const answersByQuestion = new Map<string, typeof answers>();
    for (const a of answers) {
      const qId = a.questionId.toString();
      if (!answersByQuestion.has(qId)) answersByQuestion.set(qId, []);
      answersByQuestion.get(qId)!.push(a);
    }

    const result = questions.map((q) => {
      const qAnswers = answersByQuestion.get(q._id.toString()) || [];

      const myAnswer = qAnswers.find(
        (a) => a.userId && (
          typeof a.userId === "object" && "_id" in a.userId
            ? (a.userId as { _id: { toString(): string } })._id.toString()
            : a.userId.toString()
        ) === authUser.userId
      );

      return {
        questionId: q._id,
        questionText: q.text,
        questionOrder: q.order,
        correctAnswer: q.correctAnswer || null,
        mediaUrl: (q as Record<string, unknown>).mediaUrl || null,
        mediaType: (q as Record<string, unknown>).mediaType || null,
        pointsAwarded: q.points || 10,
        myAnswer: myAnswer?.text ?? null,
        isCorrect: myAnswer?.isCorrect ?? null,
        answers: isQuizmaster
          ? qAnswers.map((a) => {
              const user = typeof a.userId === "object" && a.userId && "displayName" in a.userId
                ? a.userId as { _id: unknown; displayName: string }
                : null;
              const team = typeof a.teamId === "object" && a.teamId && "name" in a.teamId
                ? a.teamId as { _id: unknown; name: string }
                : null;
              return {
                id: a._id,
                text: a.text,
                isCorrect: a.isCorrect,
                displayName: user?.displayName || null,
                teamName: team?.name || null,
                submittedAt: a.submittedAt,
              };
            })
          : undefined,
      };
    });

    const scores = await Score.find({ roomId: room._id })
      .sort({ points: -1 })
      .limit(50)
      .lean();

    const leaderboard = await Promise.all(
      scores.map(async (s) => {
        if (s.userId) {
          const u = await User.findById(s.userId).select("displayName").lean();
          return { ...s, displayName: (u as { displayName?: string } | null)?.displayName };
        }
        if (s.teamId) {
          const t = await Team.findById(s.teamId).select("name").lean();
          return { ...s, teamName: (t as { name?: string } | null)?.name };
        }
        return s;
      })
    );

    return NextResponse.json({ questions: result, leaderboard });
  } catch (error) {
    console.error("Room questions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
