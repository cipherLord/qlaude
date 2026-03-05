"use client";

interface HistoryEntry {
  questionId: string;
  questionText: string;
  questionOrder: number;
  myAnswer: string | null;
  isCorrect: boolean | null;
  correctAnswer: string | null;
  pointsAwarded: number;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
}

interface QuestionHistoryProps {
  history: HistoryEntry[];
  isQuizmaster: boolean;
}

function formatAnswer(text: string | null): string {
  if (!text) return "No answer";
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p: string, i: number) => `${String.fromCharCode(97 + i)}) ${p || "\u2014"}`)
        .join("  ");
    }
  } catch {
    /* single-part answer */
  }
  return text;
}

export default function QuestionHistory({
  history,
  isQuizmaster,
}: QuestionHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="section-title">Question History</h3>
      </div>
      <div className="space-y-2 max-h-[28rem] overflow-y-auto">
        {history.map((entry) => (
          <div
            key={entry.questionId}
            className="bg-gray-800/30 rounded-xl p-3 space-y-1.5 hover:bg-gray-800/50 transition-colors duration-200"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-700/50 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                Q{entry.questionOrder}
              </span>
              <span className="text-sm text-white font-medium truncate">
                {entry.questionText}
              </span>
            </div>
            {entry.mediaUrl && entry.mediaType === "image" && (
              <img src={entry.mediaUrl} alt="" className="max-h-24 rounded-lg object-contain mt-1" />
            )}
            {entry.mediaUrl && entry.mediaType === "video" && (
              <video src={entry.mediaUrl} controls className="max-h-24 rounded-lg mt-1" />
            )}

            {!isQuizmaster && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 shrink-0 mt-0.5">You:</span>
                <span
                  className={`text-xs ${
                    entry.isCorrect === true
                      ? "text-emerald-400"
                      : entry.isCorrect === false
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {formatAnswer(entry.myAnswer)}
                  {entry.isCorrect === true && (
                    <svg className="w-3 h-3 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {entry.isCorrect === false && (
                    <svg className="w-3 h-3 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              </div>
            )}

            {entry.correctAnswer && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 shrink-0 mt-0.5">Answer:</span>
                <span className="text-xs text-emerald-300">
                  {formatAnswer(entry.correctAnswer)}
                </span>
              </div>
            )}

            <div className="text-xs text-gray-600 tabular-nums">
              {entry.pointsAwarded > 0 ? (
                <span className="text-indigo-400/70">{entry.pointsAwarded} pts awarded</span>
              ) : (
                "No points awarded"
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
