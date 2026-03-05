"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-gray-950 to-purple-900/20" />

      <svg className="absolute -top-32 -left-32 w-[500px] h-[500px] opacity-20" viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="200" fill="none" stroke="url(#authGrad1)" strokeWidth="1">
          <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="60s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="250" r="160" fill="none" stroke="url(#authGrad2)" strokeWidth="0.8" strokeDasharray="12 24">
          <animateTransform attributeName="transform" type="rotate" from="360 250 250" to="0 250 250" dur="45s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="250" r="120" fill="none" stroke="url(#authGrad1)" strokeWidth="0.5" strokeDasharray="8 16">
          <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="30s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="authGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="authGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>

      <svg className="absolute -bottom-24 -right-24 w-[400px] h-[400px] opacity-15" viewBox="0 0 400 400">
        <polygon points="200,40 360,150 320,340 80,340 40,150" fill="none" stroke="#6366f1" strokeWidth="0.8">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="80s" repeatCount="indefinite" />
        </polygon>
        <polygon points="200,80 320,160 290,300 110,300 80,160" fill="none" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="6 12">
          <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="60s" repeatCount="indefinite" />
        </polygon>
      </svg>

      {[
        { cx: "15%", cy: "20%", r: 3, dur: "4s", delay: "0s" },
        { cx: "85%", cy: "15%", r: 2, dur: "5s", delay: "1s" },
        { cx: "75%", cy: "80%", r: 2.5, dur: "4.5s", delay: "0.5s" },
        { cx: "10%", cy: "75%", r: 2, dur: "6s", delay: "2s" },
        { cx: "50%", cy: "10%", r: 1.5, dur: "3.5s", delay: "1.5s" },
      ].map((dot, i) => (
        <svg key={i} className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill="#6366f1" opacity="0.3">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur={dot.dur} begin={dot.delay} repeatCount="indefinite" />
            <animate attributeName="r" values={`${dot.r};${dot.r + 1};${dot.r}`} dur={dot.dur} begin={dot.delay} repeatCount="indefinite" />
          </circle>
        </svg>
      ))}
    </div>
  );
}

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const { login, register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await register(email, password, displayName, username);
      } else {
        await login(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 relative">
      <AuthBackground />

      <div className="w-full max-w-md relative animate-fade-in-up">
        <div className="glass-card p-8 glow-indigo">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mode === "login" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                )}
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-gray-400 mt-2">
              {mode === "login"
                ? "Sign in to join or host a quiz"
                : "Get started with Qlaude"}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-slide-up">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <>
                <div className="animate-in-delay-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field"
                    placeholder="Your name"
                    required
                    maxLength={50}
                  />
                </div>

                <div className="animate-in-delay-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    className="input-field"
                    placeholder="letters, numbers, underscores"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    3-30 characters. Letters, numbers, and underscores only.
                  </p>
                </div>
              </>
            )}

            <div className={mode === "register" ? "animate-in-delay-3" : "animate-in-delay-1"}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className={mode === "register" ? "" : "animate-in-delay-2"}>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              {mode === "register" && (
                <p className="text-xs text-gray-500 mt-1.5">
                  At least 8 characters with a number.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 px-4 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Please wait...
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-900/70 px-3 text-gray-500">
                {mode === "login" ? "New to Qlaude?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <p className="text-center">
            <Link
              href={mode === "login" ? "/register" : "/login"}
              className="text-indigo-400 hover:text-indigo-300 font-medium text-sm transition-colors duration-200"
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
