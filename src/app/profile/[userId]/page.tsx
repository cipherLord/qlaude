"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string | null;
  createdAt: string;
}

interface Stats {
  totalQuizzes: number;
  totalAnswers: number;
  totalCorrect: number;
  totalPoints: number;
}

function ProfileBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <svg className="absolute top-0 right-0 w-[350px] h-[350px] opacity-[0.04]" viewBox="0 0 350 350">
        <circle cx="175" cy="175" r="150" fill="none" stroke="#6366f1" strokeWidth="1">
          <animateTransform attributeName="transform" type="rotate" from="0 175 175" to="360 175 175" dur="80s" repeatCount="indefinite" />
        </circle>
        <circle cx="175" cy="175" r="110" fill="none" stroke="#a855f7" strokeWidth="0.6" strokeDasharray="10 18">
          <animateTransform attributeName="transform" type="rotate" from="360 175 175" to="0 175 175" dur="60s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setStats(data.stats);
      } else {
        setError("User not found");
      }
    }
    fetchProfile();
  }, [userId]);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500/20 border-t-indigo-500" />
      </div>
    );
  }

  const statItems = stats
    ? [
        { label: "Quizzes", value: stats.totalQuizzes },
        { label: "Answers Given", value: stats.totalAnswers },
        { label: "Correct Answers", value: stats.totalCorrect },
        { label: "Total Points", value: stats.totalPoints },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <ProfileBackground />

      <div className="glass-card p-6 mb-6 animate-in relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent" />
        <div className="relative flex items-center gap-5">
          <div className="shrink-0" style={{ width: "72px", height: "72px" }}>
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full rounded-2xl object-cover shadow-lg shadow-indigo-500/20"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-500/20">
                {profile.displayName[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {profile.displayName}
            </h1>
            {profile.username && (
              <p className="text-indigo-400 text-sm font-medium">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-gray-400 text-sm mt-1">{profile.bio}</p>
            )}
            <p className="text-gray-500 text-sm mt-0.5">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((stat, i) => (
            <div
              key={stat.label}
              className="stat-card animate-in"
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              <p className="text-2xl font-bold text-gradient tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
