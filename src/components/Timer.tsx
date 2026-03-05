"use client";

import { useState, useEffect } from "react";

interface TimerProps {
  endsAt: string;
  onExpired?: () => void;
}

export default function Timer({ endsAt, onExpired }: TimerProps) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const endTime = new Date(endsAt).getTime();
    const startRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setTotal(startRemaining);

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTime - now) / 1000));
      setRemaining(left);
      if (left === 0) {
        onExpired?.();
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [endsAt, onExpired]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = total > 0 ? remaining / total : 0;
  const circumference = 2 * Math.PI * 22;
  const dashOffset = circumference * (1 - progress);

  const urgencyColor =
    remaining <= 5
      ? "#ef4444"
      : remaining <= 15
        ? "#f59e0b"
        : "#10b981";

  const urgencyGlow =
    remaining <= 5
      ? "drop-shadow(0 0 6px rgba(239,68,68,0.5))"
      : remaining <= 15
        ? "drop-shadow(0 0 4px rgba(245,158,11,0.3))"
        : "drop-shadow(0 0 4px rgba(16,185,129,0.3))";

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14" style={{ filter: urgencyGlow }}>
        <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-800"
          />
          <circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke={urgencyColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              remaining <= 5 ? "animate-pulse" : ""
            }`}
            style={{ color: urgencyColor }}
          >
            {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : seconds}
          </span>
        </div>
      </div>
    </div>
  );
}
