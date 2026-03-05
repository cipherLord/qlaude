"use client";

interface ScoringRulesPanelProps {
  scoringMode: "bounce" | "pounce_bounce";
  pouncePenalty: number | null;
  questionPoints: number;
}

export default function ScoringRulesPanel({
  scoringMode,
  pouncePenalty,
  questionPoints,
}: ScoringRulesPanelProps) {
  const penalty = pouncePenalty ?? questionPoints;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="section-title">
          {scoringMode === "bounce" ? "Bounce Mode" : "Pounce + Bounce Mode"}
        </h3>
      </div>
      <ul className="space-y-1.5 text-xs text-gray-400">
        <li className="flex items-start gap-1.5">
          <span className="text-gray-600 mt-0.5">&#8226;</span>
          <span>Questions follow round-robin order</span>
        </li>
        {scoringMode === "pounce_bounce" && (
          <>
            <li className="flex items-start gap-1.5">
              <span className="text-purple-400 mt-0.5">&#8226;</span>
              <span>
                <span className="text-purple-300 font-medium">Pounce</span>: Answer before your turn -- risky!
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-400 mt-0.5">&#8226;</span>
              <span>Pounce correct: <span className="text-emerald-300 font-medium">+{questionPoints} pts</span></span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-red-400 mt-0.5">&#8226;</span>
              <span>Pounce wrong: <span className="text-red-300 font-medium">-{penalty} pts</span></span>
            </li>
          </>
        )}
        <li className="flex items-start gap-1.5">
          <span className="text-emerald-400 mt-0.5">&#8226;</span>
          <span>Bounce correct: <span className="text-emerald-300 font-medium">+{questionPoints} pts</span></span>
        </li>
        <li className="flex items-start gap-1.5">
          <span className="text-gray-600 mt-0.5">&#8226;</span>
          <span>Bounce wrong: <span className="text-gray-300">No penalty</span></span>
        </li>
        {scoringMode === "pounce_bounce" && (
          <li className="flex items-start gap-1.5">
            <span className="text-gray-600 mt-0.5">&#8226;</span>
            <span>Pounced teams are skipped in bounce</span>
          </li>
        )}
        <li className="flex items-start gap-1.5">
          <span className="text-gray-600 mt-0.5">&#8226;</span>
          <span>No reattempts allowed</span>
        </li>
      </ul>
    </div>
  );
}
