"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";

interface QuizmateUser {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

interface PendingRequest {
  _id: string;
  requesterId: { displayName: string; email: string };
}

interface QuizmatesListProps {
  roomCode?: string;
}

export default function QuizmatesList({ roomCode }: QuizmatesListProps) {
  const [quizmates, setQuizmates] = useState<QuizmateUser[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [addEmail, setAddEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchQuizmates = useCallback(async () => {
    try {
      const res = await fetch("/api/quizmates");
      if (res.ok) {
        const data = await res.json();
        setQuizmates(data.quizmates || []);
        setPending(data.pendingRequests || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchQuizmates();
  }, [fetchQuizmates]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/quizmates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Request sent!");
      setAddEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleAccept = async (requestId: string) => {
    await fetch(`/api/quizmates/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    fetchQuizmates();
  };

  const handleInvite = async (userId: string) => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      });
      if (res.ok) {
        setMessage("Invite sent!");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 className="section-title">Quizmates</h3>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="email"
          value={addEmail}
          onChange={(e) => setAddEmail(e.target.value)}
          className="input-field flex-1 text-sm !py-1.5"
          placeholder="Add by email..."
          required
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3.5 py-1.5 rounded-xl transition-all duration-200"
        >
          Add
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-xs mb-2 flex items-center gap-1 animate-slide-up">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </p>
      )}
      {message && (
        <p className="text-emerald-400 text-xs mb-2 flex items-center gap-1 animate-slide-up">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {message}
        </p>
      )}

      {pending.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
            Pending Requests
          </p>
          {pending.map((req) => (
            <div
              key={req._id}
              className="flex items-center justify-between bg-gray-800/30 rounded-xl px-3 py-2.5 mb-1 hover:bg-gray-800/50 transition-colors duration-200"
            >
              <span className="text-sm text-gray-300">
                {req.requesterId.displayName}
              </span>
              <button
                onClick={() => handleAccept(req._id)}
                className="text-xs bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 px-2.5 py-1 rounded-lg transition-all duration-200 border border-emerald-500/20"
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {quizmates.length === 0 && pending.length === 0 ? (
        <div className="text-center py-6">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500 text-sm">
            No quizmates yet. Add friends by email!
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {quizmates.map((qm) => (
            <div
              key={qm._id}
              className="flex items-center justify-between bg-gray-800/30 rounded-xl px-3 py-2.5 hover:bg-gray-800/50 transition-colors duration-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/50 to-purple-500/50 flex items-center justify-center text-xs font-bold text-white">
                  {qm.displayName[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-300">
                  {qm.displayName}
                </span>
              </div>
              {roomCode && (
                <button
                  onClick={() => handleInvite(qm._id)}
                  className="text-xs bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 px-2.5 py-1 rounded-lg transition-all duration-200 border border-indigo-500/20"
                >
                  Invite
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
