"use client";

import { useState, FormEvent } from "react";

interface TeamInfo {
  _id: string;
  name: string;
  code: string;
  hasPassword: boolean;
  memberCount: number;
  captainId: { _id: string; displayName: string } | string;
}

interface TeamSelectorProps {
  roomCode: string;
  teams: TeamInfo[];
  onTeamJoined: (team: { id: string; name: string; isCaptain: boolean }) => void;
}

export default function TeamSelector({
  roomCode,
  teams,
  onTeamJoined,
}: TeamSelectorProps) {
  const [tab, setTab] = useState<"join" | "create">("join");
  const [teamName, setTeamName] = useState("");
  const [teamPassword, setTeamPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          teamName,
          password: teamPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onTeamJoined({ id: data.team.id, name: data.team.name, isCaptain: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          teamCode: joinCode,
          teamPassword: joinPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onTeamJoined({
        id: data.team.id,
        name: data.team.name,
        isCaptain: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in-up">
      <div className="glass-card p-6 glow-indigo">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-3 shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">
            Join a Team
          </h2>
        </div>

        <div className="flex mb-5 bg-gray-800/60 rounded-xl p-1">
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              tab === "join"
                ? "bg-gray-700/80 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Join Existing
          </button>
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              tab === "create"
                ? "bg-gray-700/80 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Create Team
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl mb-4 text-sm flex items-center gap-2 animate-slide-up">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        {tab === "create" ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input-field"
              placeholder="Team name"
              required
              maxLength={50}
            />
            <input
              type="password"
              value={teamPassword}
              onChange={(e) => setTeamPassword(e.target.value)}
              className="input-field"
              placeholder="Team password (optional)"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Creating..." : "Create Team (as Captain)"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-field uppercase tracking-widest font-mono"
              placeholder="Team code"
              required
            />
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              className="input-field"
              placeholder="Team password (if required)"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Joining..." : "Join Team (as Member)"}
            </button>
          </form>
        )}

        {teams.length > 0 && tab === "join" && (
          <div className="mt-5 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              Available Teams
            </p>
            {teams.map((team) => (
              <div
                key={team._id}
                className="flex items-center justify-between bg-gray-800/30 rounded-xl px-3 py-2.5 hover:bg-gray-800/50 transition-colors duration-200"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {team.name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                    {team.hasPassword && " \u00b7 Password required"}
                  </p>
                </div>
                <span className="text-gray-400 font-mono text-xs bg-gray-800/60 px-2 py-0.5 rounded">
                  {team.code}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
