"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import CreateRoomModal from "@/components/CreateRoomModal";
import Link from "next/link";

interface RoomSummary {
  _id: string;
  code: string;
  name: string;
  mode: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

function DashboardBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <svg className="absolute top-20 right-10 w-[300px] h-[300px] opacity-[0.06]" viewBox="0 0 300 300">
        <rect x="50" y="50" width="200" height="200" rx="30" fill="none" stroke="#6366f1" strokeWidth="1">
          <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="90s" repeatCount="indefinite" />
        </rect>
        <rect x="80" y="80" width="140" height="140" rx="20" fill="none" stroke="#a855f7" strokeWidth="0.8" strokeDasharray="10 15">
          <animateTransform attributeName="transform" type="rotate" from="360 150 150" to="0 150 150" dur="70s" repeatCount="indefinite" />
        </rect>
      </svg>
      <svg className="absolute bottom-10 left-10 w-[250px] h-[250px] opacity-[0.05]" viewBox="0 0 250 250">
        <circle cx="125" cy="125" r="100" fill="none" stroke="#6366f1" strokeWidth="1">
          <animateTransform attributeName="transform" type="rotate" from="0 125 125" to="360 125 125" dur="60s" repeatCount="indefinite" />
        </circle>
        <circle cx="125" cy="125" r="70" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="8 12">
          <animateTransform attributeName="transform" type="rotate" from="360 125 125" to="0 125 125" dur="45s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function EmptyRoomsIllustration() {
  return (
    <svg className="w-32 h-32 mx-auto mb-4 opacity-60" viewBox="0 0 120 120" fill="none">
      <rect x="20" y="30" width="80" height="60" rx="12" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1">
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" />
      </rect>
      <circle cx="60" cy="55" r="12" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4">
        <animateTransform attributeName="transform" type="rotate" from="0 60 55" to="360 60 55" dur="10s" repeatCount="indefinite" />
      </circle>
      <line x1="56" y1="51" x2="64" y2="59" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="51" x2="56" y2="59" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </line>
      <rect x="40" y="72" width="40" height="6" rx="3" fill="#312e81" opacity="0.6" />
    </svg>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
    );
  }
  if (status === "waiting") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
      </span>
    );
  }
  if (status === "closed") {
    return <span className="inline-flex rounded-full h-2 w-2 bg-red-400/60" />;
  }
  return <span className="inline-flex rounded-full h-2 w-2 bg-gray-500" />;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) fetchRooms();
  }, [user, loading, router, fetchRooms]);

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    setJoinError("");

    try {
      const res = await fetch(`/api/rooms/${joinCode.trim().toUpperCase()}`);
      if (!res.ok) {
        const data = await res.json();
        setJoinError(data.error || "Room not found");
        return;
      }
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    } catch {
      setJoinError("Failed to join room");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500/20 border-t-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      <DashboardBackground />

      {user.activeRoomId && (
        <div className="glass-card p-4 mb-6 flex items-center justify-between border-amber-500/20 bg-amber-500/5 animate-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-200 font-medium text-sm">
                You&apos;re in an active quiz
              </p>
              <p className="text-amber-300/50 text-xs">
                Leave before joining another room
              </p>
            </div>
          </div>
          <Link
            href={`/room/${user.activeRoomId}`}
            className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-amber-500/20"
          >
            Return to Room
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 animate-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back, <span className="text-indigo-400">{user.displayName}</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-6 py-2.5 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Room
        </button>
      </div>

      <div className="glass-card p-6 mb-8 animate-in-delay-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">
            Join a Quiz Room
          </h2>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setJoinError("");
            }}
            className="input-field flex-1 uppercase tracking-widest font-mono"
            placeholder="Enter room code"
            maxLength={8}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
          />
          <button
            onClick={handleJoinRoom}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          >
            Join
          </button>
        </div>
        {joinError && (
          <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5 animate-slide-up">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
            {joinError}
          </p>
        )}
      </div>

      <div className="animate-in-delay-2">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Your Rooms</h2>
          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded-full">
            {rooms.length}
          </span>
        </div>
        {rooms.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <EmptyRoomsIllustration />
            <p className="text-gray-400 text-sm">
              No rooms yet. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room, i) => (
              <Link
                key={room._id}
                href={`/room/${room.code}`}
                className="glass-card p-4 card-hover block group"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors duration-200">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {room.mode === "team" ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-indigo-300 transition-colors duration-200">{room.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs bg-gray-800/80 text-gray-400 px-2 py-0.5 rounded-md font-mono tracking-wider">
                          {room.code}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">
                          {room.mode}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={room.status} />
                          <span
                            className={`text-xs capitalize ${
                              room.status === "active"
                                ? "text-emerald-400"
                                : room.status === "waiting"
                                  ? "text-amber-400"
                                  : room.status === "closed"
                                    ? "text-red-400/60"
                                    : "text-gray-500"
                            }`}
                          >
                            {room.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all duration-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateRoomModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
