"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import QuizmatesList from "@/components/QuizmatesList";

interface Stats {
  totalQuizzes: number;
  totalAnswers: number;
  totalCorrect: number;
  totalPoints: number;
}

interface HistoryRecord {
  _id: string;
  role: string;
  answersGiven: number;
  correctAnswers: number;
  totalPoints: number;
  joinedAt: string;
  roomId: {
    _id: string;
    name: string;
    code: string;
    mode: string;
    status: string;
  };
  teamId?: { name: string };
}

function ProfileBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <svg className="absolute -top-10 right-0 w-[400px] h-[400px] opacity-[0.04]" viewBox="0 0 400 400">
        <circle cx="200" cy="200" r="180" fill="none" stroke="#6366f1" strokeWidth="1">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="100s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="140" fill="none" stroke="#a855f7" strokeWidth="0.6" strokeDasharray="12 20">
          <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="80s" repeatCount="indefinite" />
        </circle>
        <circle cx="200" cy="200" r="100" fill="none" stroke="#818cf8" strokeWidth="0.4" strokeDasharray="6 12">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="60s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function StatIcon({ type }: { type: string }) {
  const icons: Record<string, JSX.Element> = {
    quizzes: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    answers: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    correct: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    points: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  };
  return <div className="text-indigo-400">{icons[type]}</div>;
}

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(
    async (p: number) => {
      try {
        const res = await fetch(`/api/history?page=${p}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.records);
          setStats(data.stats);
          setTotalPages(data.totalPages);
          setPage(data.page);
        }
      } catch {
        // ignore
      }
    },
    []
  );

  const startEditing = () => {
    if (!user) return;
    setEditDisplayName(user.displayName);
    setEditBio(user.bio || "");
    setAvatarPreview(user.avatarUrl || null);
    setPendingAvatarFile(null);
    setSaveError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setPendingAvatarFile(null);
    setAvatarPreview(null);
    setSaveError("");
  };

  const MAX_AVATAR_SIZE = 500 * 1024; // 500KB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_SIZE) {
      setSaveError("Profile photo must be under 500KB");
      if (e.target) e.target.value = "";
      return;
    }
    setSaveError("");
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError("");
    try {
      let avatarUrl: string | undefined = undefined;

      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append("file", pendingAvatarFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          avatarUrl = uploadData.url;
        } else {
          const err = await uploadRes.json();
          setSaveError(err.error || "Failed to upload avatar");
          setSaving(false);
          return;
        }
      }

      const body: Record<string, unknown> = {};
      if (editDisplayName.trim() !== user?.displayName) body.displayName = editDisplayName.trim();
      if (editBio.trim() !== (user?.bio || "")) body.bio = editBio.trim() || null;
      if (avatarUrl !== undefined) body.avatarUrl = avatarUrl;

      if (Object.keys(body).length > 0) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          setSaveError(err.error || "Failed to save");
          setSaving(false);
          return;
        }
      }

      await refreshUser();
      setEditing(false);
    } catch {
      setSaveError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) fetchHistory(1);
  }, [user, loading, router, fetchHistory]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500/20 border-t-indigo-500" />
      </div>
    );
  }

  const statItems = stats
    ? [
        { label: "Quizzes Played", value: stats.totalQuizzes, icon: "quizzes" },
        { label: "Answers Given", value: stats.totalAnswers, icon: "answers" },
        { label: "Correct Answers", value: stats.totalCorrect, icon: "correct" },
        { label: "Total Points", value: stats.totalPoints, icon: "points" },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <ProfileBackground />

      <div className="glass-card p-6 mb-6 animate-in relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent" />
        <div className="relative flex items-center gap-5">
          {editing ? (
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="relative shrink-0 group"
              style={{ width: "72px", height: "72px" }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full rounded-2xl object-cover shadow-lg shadow-indigo-500/20"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-500/20">
                  {editDisplayName[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </button>
          ) : (
            <div className="shrink-0" style={{ width: "72px", height: "72px" }}>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full rounded-2xl object-cover shadow-lg shadow-indigo-500/20"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-500/20">
                  {user.displayName[0].toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-white text-lg font-bold w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  maxLength={50}
                  placeholder="Display name"
                />
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-gray-300 text-sm w-full resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  rows={2}
                  maxLength={200}
                  placeholder="Write a short bio..."
                />
                <p className="text-xs text-gray-600">{editBio.length}/200</p>
                {saveError && (
                  <p className="text-xs text-red-400">{saveError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-gray-400 hover:text-white text-sm px-3 py-1.5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {user.displayName}
                </h1>
                {user.username && (
                  <p className="text-indigo-400 text-sm font-medium">@{user.username}</p>
                )}
                {user.bio && (
                  <p className="text-gray-400 text-sm mt-1">{user.bio}</p>
                )}
                <p className="text-gray-500 text-sm mt-0.5">{user.email}</p>
              </>
            )}
          </div>
          {!editing && (
            <button
              onClick={startEditing}
              className="shrink-0 text-gray-500 hover:text-indigo-400 transition-colors duration-200"
              title="Edit profile"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statItems.map((stat, i) => (
            <div
              key={stat.label}
              className="stat-card animate-in"
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              <div className="flex justify-center mb-2">
                <StatIcon type={stat.icon} />
              </div>
              <p className="text-2xl font-bold text-gradient tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 animate-in-delay-2">
        <QuizmatesList />
      </div>

      <div className="glass-card p-6 animate-in-delay-3">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-white">
            Quiz History
          </h2>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-10">
            <svg className="w-16 h-16 mx-auto mb-3 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400 text-sm">
              No quiz history yet. Join a quiz to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((record) => (
              <div
                key={record._id}
                className="bg-gray-800/30 hover:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between transition-colors duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors duration-200 shrink-0">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <Link
                      href={`/room/${record.roomId?.code}`}
                      className="text-white font-medium hover:text-indigo-400 transition-colors duration-200 text-sm"
                    >
                      {record.roomId?.name || "Unknown Room"}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 capitalize">
                        {record.role}
                      </span>
                      {record.teamId && (
                        <span className="text-xs text-indigo-400/70">
                          {record.teamId.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">
                        {new Date(record.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {record.role === "quizmaster" ? (
                    <span className="text-xs bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full">
                      Hosted
                    </span>
                  ) : (
                    <>
                      <p className="text-indigo-400 font-bold text-sm tabular-nums">
                        {record.totalPoints} pts
                      </p>
                      <p className="text-xs text-gray-500 tabular-nums">
                        {record.correctAnswers}/{Math.max(record.answersGiven, record.correctAnswers)} correct
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => fetchHistory(page - 1)}
              disabled={page <= 1}
              className="px-4 py-1.5 bg-gray-800/60 text-gray-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-sm hover:bg-gray-800 transition-colors duration-200"
            >
              Previous
            </button>
            <span className="text-gray-500 text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchHistory(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-1.5 bg-gray-800/60 text-gray-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed text-sm hover:bg-gray-800 transition-colors duration-200"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
