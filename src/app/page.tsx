"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute -top-40 -left-40 w-[600px] h-[600px] opacity-30" viewBox="0 0 600 600">
        <circle cx="300" cy="300" r="250" fill="none" stroke="url(#grad1)" strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300" dur="60s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="300" r="200" fill="none" stroke="url(#grad2)" strokeWidth="1">
          <animateTransform attributeName="transform" type="rotate" from="360 300 300" to="0 300 300" dur="45s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="300" r="150" fill="none" stroke="url(#grad1)" strokeWidth="0.5" strokeDasharray="10 20">
          <animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300" dur="30s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="300" r="100" fill="none" stroke="url(#grad2)" strokeWidth="0.3" strokeDasharray="6 14">
          <animateTransform attributeName="transform" type="rotate" from="360 300 300" to="0 300 300" dur="20s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>

      <svg className="absolute -bottom-32 -right-32 w-[500px] h-[500px] opacity-20" viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="220" fill="none" stroke="url(#grad3)" strokeWidth="1.5">
          <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="-360 250 250" dur="50s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="250" r="170" fill="none" stroke="url(#grad4)" strokeWidth="1" strokeDasharray="8 16">
          <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="35s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="250" r="120" fill="none" stroke="url(#grad3)" strokeWidth="0.5" strokeDasharray="4 10">
          <animateTransform attributeName="transform" type="rotate" from="360 250 250" to="0 250 250" dur="25s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="grad4" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>

      {[
        { cx: "10%", cy: "25%", r: 4, delay: "0s", dur: "5s" },
        { cx: "90%", cy: "20%", r: 3, delay: "1s", dur: "6s" },
        { cx: "80%", cy: "70%", r: 3.5, delay: "0.5s", dur: "4.5s" },
        { cx: "20%", cy: "80%", r: 2.5, delay: "2s", dur: "5.5s" },
        { cx: "50%", cy: "15%", r: 2, delay: "1.5s", dur: "4s" },
        { cx: "35%", cy: "60%", r: 2, delay: "0.8s", dur: "5s" },
      ].map((dot, i) => (
        <svg key={i} className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
          <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill="#6366f1" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur={dot.dur} begin={dot.delay} repeatCount="indefinite" />
            <animate attributeName="r" values={`${dot.r};${dot.r + 1.5};${dot.r}`} dur={dot.dur} begin={dot.delay} repeatCount="indefinite" />
          </circle>
        </svg>
      ))}
    </div>
  );
}

function HeroIllustration() {
  return (
    <svg className="w-full max-w-md mx-auto mt-12" viewBox="0 0 400 260" fill="none">
      <rect x="60" y="30" width="280" height="170" rx="16" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1.5" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.95;0.8" dur="4s" repeatCount="indefinite" />
      </rect>

      <rect x="85" y="55" width="180" height="8" rx="4" fill="#6366f1" opacity="0.6">
        <animate attributeName="width" values="180;160;180" dur="3s" repeatCount="indefinite" />
      </rect>
      <rect x="85" y="72" width="120" height="8" rx="4" fill="#6366f1" opacity="0.3" />

      <circle cx="310" cy="65" r="18" fill="none" stroke="#4f46e5" strokeWidth="3" opacity="0.4" />
      <circle cx="310" cy="65" r="18" fill="none" stroke="#818cf8" strokeWidth="3" strokeDasharray="113" strokeLinecap="round">
        <animate attributeName="stroke-dashoffset" values="0;113" dur="6s" repeatCount="indefinite" />
      </circle>
      <text x="310" y="70" textAnchor="middle" fill="#c7d2fe" fontSize="12" fontFamily="monospace">
        <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
        30
      </text>

      <rect x="85" y="100" width="230" height="32" rx="8" fill="#312e81" stroke="#4338ca" strokeWidth="1" opacity="0.7" />
      <rect x="95" y="112" width="100" height="8" rx="4" fill="#a5b4fc" opacity="0.3">
        <animate attributeName="width" values="0;100" dur="2s" repeatCount="indefinite" />
      </rect>

      <rect x="85" y="145" width="80" height="30" rx="8" fill="#4f46e5">
        <animate attributeName="fill" values="#4f46e5;#6366f1;#4f46e5" dur="3s" repeatCount="indefinite" />
      </rect>
      <text x="125" y="164" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">Submit</text>

      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-8; 0,0" dur="3s" repeatCount="indefinite" />
        <rect x="10" y="80" width="40" height="24" rx="12" fill="#059669" opacity="0.9" />
        <text x="30" y="96" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">+15</text>
      </g>

      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-6; 0,0" dur="2.5s" repeatCount="indefinite" />
        <rect x="350" y="130" width="40" height="24" rx="12" fill="#4f46e5" opacity="0.9" />
        <text x="370" y="146" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">#1</text>
      </g>

      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,4; 0,0" dur="2s" repeatCount="indefinite" />
        <circle cx="220" cy="230" r="10" fill="#6366f1" />
        <circle cx="245" cy="230" r="10" fill="#8b5cf6" />
        <circle cx="270" cy="230" r="10" fill="#a855f7" />
        <circle cx="295" cy="230" r="8" fill="#312e81" stroke="#6366f1" strokeWidth="1.5" />
        <text x="295" y="234" textAnchor="middle" fill="#a5b4fc" fontSize="9">+5</text>
      </g>

      <line x1="200" y1="210" x2="220" y2="222" stroke="#6366f1" strokeWidth="1" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="200" y1="210" x2="270" y2="222" stroke="#a855f7" strokeWidth="1" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

function PulseGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#a5b4fc" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

function FeatureIcon({ type }: { type: "team" | "scoring" | "rooms" }) {
  if (type === "team") {
    return (
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <circle cx="14" cy="15" r="4" fill="#818cf8" opacity="0.8">
            <animate attributeName="r" values="4;4.5;4" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="26" cy="15" r="4" fill="#a78bfa" opacity="0.8">
            <animate attributeName="r" values="4;4.5;4" dur="3s" begin="0.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="20" cy="26" r="4" fill="#c4b5fd" opacity="0.8">
            <animate attributeName="r" values="4;4.5;4" dur="3s" begin="1s" repeatCount="indefinite" />
          </circle>
          <line x1="14" y1="15" x2="26" y2="15" stroke="#6366f1" strokeWidth="1" opacity="0.4" />
          <line x1="14" y1="15" x2="20" y2="26" stroke="#6366f1" strokeWidth="1" opacity="0.4" />
          <line x1="26" y1="15" x2="20" y2="26" stroke="#6366f1" strokeWidth="1" opacity="0.4" />
        </svg>
      </div>
    );
  }

  if (type === "scoring") {
    return (
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <path d="M12 28 L18 18 L24 22 L30 10" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <animate attributeName="stroke-dashoffset" from="60" to="0" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-dasharray" values="0,60;60,0" dur="2s" repeatCount="indefinite" />
          </path>
          <circle cx="30" cy="10" r="3" fill="#a855f7">
            <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
      <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
        <rect x="12" y="12" width="16" height="16" rx="3" fill="none" stroke="#818cf8" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="4" fill="#a78bfa" opacity="0.8">
          <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <line x1="20" y1="8" x2="20" y2="12" stroke="#6366f1" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </line>
        <line x1="20" y1="28" x2="20" y2="32" stroke="#6366f1" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
        </line>
        <line x1="8" y1="20" x2="12" y2="20" stroke="#6366f1" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
        </line>
        <line x1="28" y1="20" x2="32" y2="20" stroke="#6366f1" strokeWidth="1" opacity="0.5">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.9s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-[calc(100vh-64px)]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-gray-950 to-purple-900/20" />
        <PulseGrid />
        <FloatingOrbs />

        <div className="relative max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="text-indigo-300 text-sm font-medium">Live multiplayer quizzes</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight animate-in">
            <span className="text-white">Real-Time</span>{" "}
            <span className="text-gradient">
              Quiz Battles
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed animate-in-delay-1">
            Host live quizzes with friends, colleagues, or classmates. Create
            rooms, form teams, and compete in real-time with instant scoring
            and leaderboards.
          </p>

          {!loading && (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in-delay-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="btn-primary px-8 py-3.5 text-lg group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Go to Dashboard
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Link>
                  {user.activeRoomId && (
                    <Link
                      href={`/room/${user.activeRoomId}`}
                      className="text-amber-300 hover:text-amber-200 font-medium px-8 py-3.5 rounded-xl text-lg transition-all duration-200 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10"
                    >
                      Rejoin Quiz
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="btn-primary px-8 py-3.5 text-lg group"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started Free
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </Link>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-white font-medium px-8 py-3.5 rounded-xl text-lg transition-all duration-200 border border-gray-700 hover:border-gray-600 hover:bg-gray-800/30"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          )}

          <div className="animate-in-delay-3">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <section className="relative max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Everything you need for live quizzes
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            A complete toolkit for hosting interactive quiz sessions, from casual trivia nights to competitive team battles.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {([
            {
              title: "Individual or Teams",
              description:
                "Play solo or form teams with private chat rooms for discussion. Team captains submit answers on behalf of the group.",
              iconType: "team" as const,
            },
            {
              title: "Real-Time Scoring",
              description:
                "Answers are scored instantly across bounce and pounce modes. Live leaderboard updates after every question.",
              iconType: "scoring" as const,
            },
            {
              title: "Shareable Rooms",
              description:
                "Create a room, share the code, and start quizzing. Invite your quizmates directly with in-app notifications.",
              iconType: "rooms" as const,
            },
          ]).map((feature, i) => (
            <div
              key={feature.title}
              className="group glass-card p-7 card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="mb-5">
                  <FeatureIcon type={feature.iconType} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative max-w-4xl mx-auto px-4 py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-14 tracking-tight">
          How it works
        </h2>
        <div className="space-y-0">
          {[
            {
              step: "1",
              title: "Create a Room",
              description:
                "Choose individual or team mode, set the timer and points, and get a shareable room code.",
            },
            {
              step: "2",
              title: "Invite Participants",
              description:
                "Share the room code or invite quizmates directly. In team mode, players form teams with optional passwords.",
            },
            {
              step: "3",
              title: "Quiz Time",
              description:
                "The quizmaster posts questions one by one with a timer. Participants or team captains submit answers before time runs out.",
            },
            {
              step: "4",
              title: "Score & Celebrate",
              description:
                "The quizmaster reveals answers, marks correct ones, and points are awarded. Bounce points, pounce points, and penalties are tallied up!",
            },
          ].map((item, i, arr) => (
            <div key={item.step} className="relative flex gap-6 items-start pb-10">
              {i < arr.length - 1 && (
                <div className="absolute left-5 top-12 w-px h-[calc(100%-2rem)] bg-gradient-to-b from-indigo-500/40 to-transparent" />
              )}
              <div className="relative shrink-0 w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
                <span className="text-indigo-400 font-bold text-sm">{item.step}</span>
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping opacity-15" style={{ animationDuration: `${3 + i * 0.5}s` }} />
              </div>
              <div className="pt-1.5">
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-gray-400 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="relative overflow-hidden glass-card p-12 glow-indigo">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/30 to-purple-900/30" />
          <svg className="absolute top-0 right-0 w-64 h-64 opacity-10 pointer-events-none" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#818cf8" strokeWidth="1">
              <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="100" r="60" fill="none" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="5 10">
              <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="15s" repeatCount="indefinite" />
            </circle>
          </svg>
          <svg className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.06] pointer-events-none" viewBox="0 0 200 200">
            <polygon points="100,20 180,80 160,170 40,170 20,80" fill="none" stroke="#6366f1" strokeWidth="1">
              <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="40s" repeatCount="indefinite" />
            </polygon>
          </svg>

          <h2 className="relative text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to quiz?
          </h2>
          <p className="relative text-gray-300 mb-8 max-w-lg mx-auto">
            {user
              ? "Your dashboard is waiting. Jump back in and start a new quiz session."
              : "Create your free account and host your first quiz in minutes."}
          </p>
          <Link
            href={user ? "/dashboard" : "/register"}
            className="btn-primary relative inline-flex items-center gap-2 px-8 py-3.5 text-lg"
          >
            {user ? "Open Dashboard" : "Start Quizzing"}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-800/60 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-3">
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
            <rect x="2" y="2" width="16" height="16" rx="5" fill="#6366f1" />
            <circle cx="9.5" cy="9" r="3.5" fill="none" stroke="white" strokeWidth="1.5" />
            <line x1="12" y1="11.5" x2="15" y2="14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="text-gray-500 text-sm">
            Qlaude &mdash; Real-time quiz platform built with Next.js, Socket.IO, and MongoDB
          </p>
        </div>
      </footer>
    </div>
  );
}
