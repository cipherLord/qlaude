"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

export default function CreateRoomModal({ onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [maxTeams, setMaxTeams] = useState("");
  const [maxTeamSize, setMaxTeamSize] = useState("5");
  const [scoringMode, setScoringMode] = useState<"normal" | "bounce" | "pounce_bounce">("normal");
  const [pouncePenalty, setPouncePenalty] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState("120");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mode,
          maxTeams: maxTeams ? parseInt(maxTeams) : null,
          maxTeamSize: parseInt(maxTeamSize),
          scoringMode: mode === "team" ? scoringMode : "normal",
          pouncePenalty: scoringMode === "pounce_bounce" && pouncePenalty ? parseInt(pouncePenalty) : null,
          expiresInMinutes: parseInt(expiresInMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/room/${data.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="glass-card w-full max-w-md p-6 shadow-2xl glow-indigo animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Create Quiz Room</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors duration-200 w-8 h-8 rounded-lg hover:bg-gray-800/50 flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2 animate-slide-up">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Friday Trivia Night"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("individual")}
                className={`relative px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  mode === "individual"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/5"
                    : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Individual
                </div>
                <p className="text-xs opacity-60">Each for themselves</p>
              </button>
              <button
                type="button"
                onClick={() => setMode("team")}
                className={`relative px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  mode === "team"
                    ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/5"
                    : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Teams
                </div>
                <p className="text-xs opacity-60">Play with team chat</p>
              </button>
            </div>
          </div>

          {mode === "team" && (
            <>
              <div className="grid grid-cols-2 gap-3 animate-slide-up">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Max Teams
                  </label>
                  <input
                    type="number"
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(e.target.value)}
                    className="input-field"
                    placeholder="Unlimited"
                    min={2}
                    max={200}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Team Size
                  </label>
                  <input
                    type="number"
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(e.target.value)}
                    className="input-field"
                    min={2}
                    max={20}
                    required
                  />
                </div>
              </div>

              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Scoring Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScoringMode("normal")}
                    className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                      scoringMode === "normal"
                        ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300 shadow-lg shadow-indigo-500/5"
                        : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Normal</div>
                    <p className="text-[10px] opacity-60 leading-tight">All teams answer at once</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringMode("bounce")}
                    className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                      scoringMode === "bounce"
                        ? "bg-amber-600/15 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/5"
                        : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Bounce</div>
                    <p className="text-[10px] opacity-60 leading-tight">Round-robin, pass to next</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringMode("pounce_bounce")}
                    className={`px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left ${
                      scoringMode === "pounce_bounce"
                        ? "bg-purple-600/15 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/5"
                        : "bg-gray-800/40 border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Pounce + Bounce</div>
                    <p className="text-[10px] opacity-60 leading-tight">Risk pounce, then bounce</p>
                  </button>
                </div>
              </div>

              {scoringMode === "pounce_bounce" && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Pounce Penalty
                  </label>
                  <input
                    type="number"
                    value={pouncePenalty}
                    onChange={(e) => setPouncePenalty(e.target.value)}
                    className="input-field"
                    placeholder="Same as question points"
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Points deducted for wrong pounce. Leave blank to match question points.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Room Duration
            </label>
            <select
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(e.target.value)}
              className="input-field"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
              <option value="480">8 hours</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              "Create Room"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
