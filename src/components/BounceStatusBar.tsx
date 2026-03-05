"use client";

import Timer from "@/components/Timer";

interface TeamOrderEntry {
  id: string;
  name: string;
}

interface BounceStatusBarProps {
  teamOrder: TeamOrderEntry[];
  currentBounceTeamId: string | null;
  assignedTeamId: string | null;
  attemptedTeamIds: string[];
  pouncedTeamIds: string[];
  questionPhase: string | null;
  bounceEndsAt: string | null;
  pounceEndsAt: string | null;
}

export default function BounceStatusBar({
  teamOrder,
  currentBounceTeamId,
  assignedTeamId,
  attemptedTeamIds,
  pouncedTeamIds,
  questionPhase,
  bounceEndsAt,
  pounceEndsAt,
}: BounceStatusBarProps) {
  const attempted = new Set(attemptedTeamIds);
  const pounced = new Set(pouncedTeamIds);

  return (
    <div className="glass-card p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            questionPhase === "pounce" ? "bg-purple-400 animate-pulse" :
            questionPhase === "resolved" ? "bg-gray-500" :
            "bg-amber-400 animate-pulse"
          }`} />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {questionPhase === "pounce" ? "Pounce Window" :
             questionPhase === "direct" ? "Direct Answer" :
             questionPhase === "bounce" ? "Bounce Chain" : "Resolved"}
          </span>
        </div>
        {questionPhase === "pounce" && pounceEndsAt && (
          <div className="flex items-center gap-1.5 text-purple-300 text-xs">
            <span>Pounce closes in</span>
            <Timer endsAt={pounceEndsAt} onExpired={() => {}} size="sm" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {teamOrder.map((team) => {
          const isCurrent = team.id === currentBounceTeamId;
          const isAssigned = team.id === assignedTeamId;
          const hasAttempted = attempted.has(team.id);
          const hasPounced = pounced.has(team.id);

          let bgClass = "bg-gray-800/40 border-gray-700/40 text-gray-500";
          let indicator = null;

          if (isCurrent && (questionPhase === "direct" || questionPhase === "bounce")) {
            bgClass = "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 ring-1 ring-indigo-500/30 animate-pulse";
          } else if (hasAttempted) {
            bgClass = "bg-gray-800/40 border-gray-600/30 text-gray-500";
            indicator = (
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3" />
              </svg>
            );
          }

          if (hasPounced) {
            bgClass = "bg-purple-500/10 border-purple-500/30 text-purple-400";
            indicator = (
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            );
          }

          return (
            <div
              key={team.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 ${bgClass}`}
            >
              {isAssigned && (
                <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
              <span className="truncate max-w-[80px]">{team.name}</span>
              {indicator}
              {isCurrent && bounceEndsAt && (questionPhase === "direct" || questionPhase === "bounce") && (
                <Timer endsAt={bounceEndsAt} onExpired={() => {}} size="sm" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
