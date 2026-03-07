"use client";

import { useState, useRef, useEffect } from "react";

interface ScoreEntry {
  _id: string;
  userId?: string;
  teamId?: string;
  displayName?: string;
  teamName?: string;
  points: number;
  correctCount: number;
}

interface LeaderboardProps {
  scores: ScoreEntry[];
  mode: "individual" | "team";
  currentUserId?: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative w-7 h-7 flex items-center justify-center">
        <svg viewBox="0 0 28 28" className="w-7 h-7">
          <circle cx="14" cy="14" r="12" fill="#fbbf24" opacity="0.15" />
          <circle cx="14" cy="14" r="12" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.4">
            <animate attributeName="r" values="12;13;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="14" y="18" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">1</text>
        </svg>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <svg viewBox="0 0 28 28" className="w-7 h-7">
          <circle cx="14" cy="14" r="12" fill="#d1d5db" opacity="0.1" />
          <text x="14" y="18" textAnchor="middle" fill="#d1d5db" fontSize="12" fontWeight="bold">2</text>
        </svg>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <svg viewBox="0 0 28 28" className="w-7 h-7">
          <circle cx="14" cy="14" r="12" fill="#d97706" opacity="0.1" />
          <text x="14" y="18" textAnchor="middle" fill="#d97706" fontSize="12" fontWeight="bold">3</text>
        </svg>
      </div>
    );
  }
  return (
    <span className="w-7 text-center text-gray-500 text-sm tabular-nums font-medium">
      {rank}
    </span>
  );
}

function LeaderboardEntry({
  entry,
  rank,
  mode,
  isCurrentUser,
}: {
  entry: ScoreEntry;
  rank: number;
  mode: "individual" | "team";
  isCurrentUser: boolean;
}) {
  const name = mode === "team" ? entry.teamName : entry.displayName;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500 ease-in-out ${
        isCurrentUser
          ? "bg-indigo-500/10 border border-indigo-500/20 glow-indigo"
          : "hover:bg-gray-800/50"
      }`}
    >
      <RankBadge rank={rank} />
      <span className="flex-1 text-white text-sm truncate font-medium">
        {name || "Unknown"}
        {isCurrentUser && (
          <span className="text-indigo-400 text-xs ml-1.5">(you)</span>
        )}
      </span>
      <div className="text-right">
        <span className={`font-bold text-sm tabular-nums ${entry.points < 0 ? "text-red-400" : entry.points === 0 ? "text-gray-500" : "text-indigo-400"}`}>
          {entry.points}
        </span>
        <span className="text-gray-600 text-xs ml-1">pts</span>
      </div>
    </div>
  );
}

export default function Leaderboard({
  scores,
  mode,
  currentUserId,
}: LeaderboardProps) {
  const [expanded, setExpanded] = useState(false);
  const prevOrderRef = useRef<string[]>([]);
  const [animateIds, setAnimateIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentOrder = scores.map((s) => s._id);
    const prevOrder = prevOrderRef.current;

    if (prevOrder.length > 0 && currentOrder.length > 0) {
      const changed = new Set<string>();
      for (let i = 0; i < currentOrder.length; i++) {
        if (prevOrder[i] !== currentOrder[i]) {
          changed.add(currentOrder[i]);
          if (prevOrder[i]) changed.add(prevOrder[i]);
        }
      }
      if (changed.size > 0) {
        setAnimateIds(changed);
        const timer = setTimeout(() => setAnimateIds(new Set()), 800);
        return () => clearTimeout(timer);
      }
    }

    prevOrderRef.current = currentOrder;
  }, [scores]);

  const visibleScores = expanded ? scores : scores.slice(0, 3);
  const hasMore = scores.length > 3;

  if (scores.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h3 className="section-title">Leaderboard</h3>
        </div>
        <p className="text-gray-500 text-sm text-center py-4">
          Waiting for players to join...
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        <h3 className="section-title">Leaderboard</h3>
        <span className="text-xs text-gray-600 ml-auto">{scores.length} {mode === "team" ? "teams" : "players"}</span>
      </div>
      <div className="space-y-1">
        {visibleScores.map((entry, index) => {
          const isCurrentUser = entry.userId === currentUserId;
          const isAnimating = animateIds.has(entry._id);

          return (
            <div
              key={entry._id}
              className={`transition-all duration-500 ease-in-out ${isAnimating ? "scale-[1.02] brightness-125" : ""}`}
            >
              <LeaderboardEntry
                entry={entry}
                rank={index + 1}
                mode={mode}
                isCurrentUser={isCurrentUser}
              />
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors duration-200 flex items-center justify-center gap-1.5 rounded-lg hover:bg-gray-800/30"
        >
          {expanded ? (
            <>
              <svg className="w-3.5 h-3.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              See more ({scores.length - 3} more)
            </>
          )}
        </button>
      )}
    </div>
  );
}
