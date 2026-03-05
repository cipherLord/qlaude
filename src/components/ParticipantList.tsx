"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

interface TeamEntry {
  id: string;
  name: string;
  captainId: string;
  captainName: string;
  members: { id: string; displayName: string }[];
}

interface PlayerEntry {
  id: string;
  displayName: string;
  role: string;
}

interface ParticipantListProps {
  socket: Socket;
  mode: "individual" | "team";
}

export default function ParticipantList({ socket, mode }: ParticipantListProps) {
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [participants, setParticipants] = useState<PlayerEntry[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const refresh = useCallback(() => {
    socket.emit("get-participants");
  }, [socket]);

  useEffect(() => {
    refresh();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleList = (data: any) => {
      if (data.mode === "team") {
        setTeams(data.teams || []);
      } else {
        setParticipants(data.participants || []);
      }
    };

    const handleChange = () => {
      setTimeout(refresh, 500);
    };

    socket.on("participants-list", handleList);
    socket.on("participant-joined", handleChange);
    socket.on("participant-left", handleChange);
    socket.on("team-removed", handleChange);
    socket.on("leaderboard-update", handleChange);

    return () => {
      socket.off("participants-list", handleList);
      socket.off("participant-joined", handleChange);
      socket.off("participant-left", handleChange);
      socket.off("team-removed", handleChange);
      socket.off("leaderboard-update", handleChange);
    };
  }, [socket, refresh]);

  const handleRemoveTeam = (teamId: string) => {
    if (confirmRemove === teamId) {
      socket.emit("disqualify-team", { teamId, reason: "Removed by quizmaster" });
      setConfirmRemove(null);
    } else {
      setConfirmRemove(teamId);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  };

  const handleRemovePlayer = (participantId: string) => {
    if (confirmRemove === participantId) {
      socket.emit("disqualify-participant", { participantId, reason: "Removed by quizmaster" });
      setConfirmRemove(null);
    } else {
      setConfirmRemove(participantId);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  };

  if (mode === "team") {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="section-title">Teams ({teams.length})</h3>
          </div>
          <button
            onClick={refresh}
            className="text-gray-500 hover:text-gray-300 transition-colors duration-200 w-7 h-7 rounded-lg hover:bg-gray-800/50 flex items-center justify-center"
            title="Refresh"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {teams.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-3">No teams yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-gray-800/30 rounded-xl p-3 hover:bg-gray-800/50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white text-sm font-medium truncate">
                      {team.name}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeam(team.id)}
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${
                      confirmRemove === team.id
                        ? "bg-red-600 text-white"
                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10"
                    }`}
                  >
                    {confirmRemove === team.id ? "Confirm?" : "Remove"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {team.members.map((m) => (
                    <span
                      key={m.id}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        m.id === team.captainId
                          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                          : "bg-gray-700/40 text-gray-400"
                      }`}
                    >
                      {m.displayName}
                      {m.id === team.captainId && " \u2605"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="section-title">Players ({participants.length})</h3>
        </div>
        <button
          onClick={refresh}
          className="text-gray-500 hover:text-gray-300 transition-colors duration-200 w-7 h-7 rounded-lg hover:bg-gray-800/50 flex items-center justify-center"
          title="Refresh"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {participants.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-3">No players yet</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-gray-800/30 rounded-xl px-3 py-2.5 hover:bg-gray-800/50 transition-colors duration-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/50 to-purple-500/50 flex items-center justify-center text-[10px] font-bold text-white">
                  {p.displayName[0].toUpperCase()}
                </div>
                <span className="text-white text-sm">{p.displayName}</span>
              </div>
              <button
                onClick={() => handleRemovePlayer(p.id)}
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 ${
                  confirmRemove === p.id
                    ? "bg-red-600 text-white"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10"
                }`}
              >
                {confirmRemove === p.id ? "Confirm?" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
