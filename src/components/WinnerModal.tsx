"use client";

interface LeaderboardEntry {
  teamId?: string;
  userId?: string;
  teamName?: string;
  displayName?: string;
  points: number;
  correctCount: number;
}

interface WinnerModalProps {
  winner: { id: string; name: string; score: number };
  leaderboard: LeaderboardEntry[];
  isTie: boolean;
  onClose: () => void;
}

export default function WinnerModal({ winner, leaderboard, isTie, onClose }: WinnerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6 shadow-2xl animate-scale-in text-center">
        <div className="mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {isTie ? "It's a Tie!" : "We Have a Winner!"}
          </h2>
          <p className="text-amber-300 text-lg font-semibold">{winner.name}</p>
          <p className="text-gray-400 text-sm mt-1">{winner.score} points</p>
        </div>

        <div className="bg-gray-800/40 rounded-xl p-4 mb-5 max-h-60 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Final Standings</p>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, idx) => {
              const entryName = entry.teamName ?? entry.displayName ?? "Unknown";
              const isWinner = (entry.teamId ?? entry.userId) === winner.id;
              return (
                <div
                  key={entry.teamId ?? entry.userId ?? idx}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    isWinner ? "bg-amber-500/10 border border-amber-500/20" : "bg-gray-800/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-5 ${
                      idx === 0 ? "text-amber-400" : idx === 1 ? "text-gray-300" : idx === 2 ? "text-orange-400" : "text-gray-500"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`text-sm ${isWinner ? "text-amber-300 font-medium" : "text-gray-300"}`}>
                      {entryName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400 font-mono">{entry.points}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full py-2.5"
        >
          Close
        </button>
      </div>
    </div>
  );
}
