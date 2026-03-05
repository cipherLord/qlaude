"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import NotificationDropdown from "./NotificationDropdown";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="relative w-9 h-9">
        <svg viewBox="0 0 36 36" fill="none" className="w-9 h-9">
          {/* Outer glow ring */}
          <circle cx="18" cy="18" r="17" fill="none" stroke="url(#logoGlow)" strokeWidth="0.5" opacity="0.5">
            <animate attributeName="r" values="16;17.5;16" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" />
          </circle>

          {/* Main shape - rounded square */}
          <rect x="4" y="4" width="28" height="28" rx="9" fill="url(#logoBg)">
            <animate attributeName="rx" values="9;10;9" dur="6s" repeatCount="indefinite" />
          </rect>

          {/* Q letter - outer ring */}
          <circle cx="17" cy="16" r="7" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <animate attributeName="stroke-dasharray" values="44;44" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Q letter - tail */}
          <line x1="21" y1="20" x2="26" y2="25" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <animate attributeName="x2" values="25;27;25" dur="3s" repeatCount="indefinite" />
            <animate attributeName="y2" values="25;27;25" dur="3s" repeatCount="indefinite" />
          </line>

          {/* Orbiting particle */}
          <circle r="1.8" fill="#c084fc">
            <animateMotion dur="6s" repeatCount="indefinite" path="M18,5 A13,13 0 1,1 17.99,5" />
            <animate attributeName="r" values="1.5;2.2;1.5" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="1.8" fill="#c084fc" opacity="0.3">
            <animateMotion dur="6s" repeatCount="indefinite" path="M18,5 A13,13 0 1,1 17.99,5" />
            <animate attributeName="r" values="2;4;2" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Sparkle accents */}
          <circle cx="28" cy="8" r="1" fill="#818cf8">
            <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="r" values="0.5;1.2;0.5" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="8" cy="28" r="0.8" fill="#a78bfa">
            <animate attributeName="opacity" values="0;1;0" dur="3s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="r" values="0.4;1;0.4" dur="3s" begin="1s" repeatCount="indefinite" />
          </circle>

          <defs>
            <linearGradient id="logoBg" x1="4" y1="4" x2="32" y2="32">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <radialGradient id="logoGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      <span className="text-xl font-bold text-white tracking-tight">
        Q<span className="text-gradient">laude</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return null;

  return (
    <nav className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo />

          {user ? (
            <div className="flex items-center gap-4">
              {user.activeRoomId && (
                <Link
                  href={`/room/${user.activeRoomId}`}
                  className="flex items-center gap-2 text-xs bg-amber-500/15 text-amber-300 border border-amber-500/25 px-3 py-1.5 rounded-full hover:bg-amber-500/25 transition-all duration-200"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                  </span>
                  In a quiz
                </Link>
              )}

              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200"
              >
                Dashboard
              </Link>

              <NotificationDropdown />

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white ring-2 ring-indigo-500/20">
                      {user.displayName[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-xl border border-gray-800/60 rounded-2xl shadow-2xl py-1 z-50 animate-slide-down">
                    <div className="px-4 py-3 border-b border-gray-800/60">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.displayName}
                      </p>
                      {user.username && (
                        <p className="text-xs text-indigo-400 truncate">
                          @{user.username}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors duration-150"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary text-sm px-5 py-2"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
