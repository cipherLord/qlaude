"use client";

import { useState, useEffect, FormEvent } from "react";
import { Socket } from "socket.io-client";

interface AnswerPanelProps {
  socket: Socket;
  hasSubmitted: boolean;
  isCaptain: boolean;
  isTeamMode: boolean;
  parts?: number;
}

export default function AnswerPanel({
  socket,
  hasSubmitted,
  isCaptain,
  isTeamMode,
  parts = 1,
}: AnswerPanelProps) {
  const [answerTexts, setAnswerTexts] = useState<string[]>(
    () => Array(parts).fill("")
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAnswerTexts(Array(parts).fill(""));
    setSubmitting(false);
  }, [parts]);

  useEffect(() => {
    const handleRejected = () => setSubmitting(false);
    socket.on("answer-rejected", handleRejected);
    return () => { socket.off("answer-rejected", handleRejected); };
  }, [socket]);

  const canAnswer = isTeamMode ? isCaptain : true;
  const hasContent = parts > 1
    ? answerTexts.some((t) => t.trim())
    : answerTexts[0]?.trim();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!hasContent || hasSubmitted || submitting || !canAnswer) return;

    setSubmitting(true);
    const text = parts > 1
      ? JSON.stringify(answerTexts.map((t) => t.trim()))
      : answerTexts[0].trim();
    socket.emit("submit-answer", { text });
  };

  const updatePart = (index: number, value: string) => {
    setAnswerTexts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  if (hasSubmitted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center glow-emerald animate-scale-in">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-emerald-400 text-lg font-semibold mb-1">
          Answer Submitted
        </div>
        <p className="text-gray-400 text-sm">
          Waiting for the timer to expire and the quizmaster to review...
        </p>
      </div>
    );
  }

  if (!canAnswer) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 text-center">
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-gray-400 text-sm">
          Only the team captain can submit answers. Discuss with your team!
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-800/20 border border-gray-700/40 rounded-xl p-4"
    >
      <h3 className="section-title mb-3">Your Answer</h3>
      {parts > 1 ? (
        <div className="space-y-2 mb-3">
          {answerTexts.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6 shrink-0 font-mono">
                {String.fromCharCode(97 + i)})
              </span>
              <input
                type="text"
                value={val}
                onChange={(e) => updatePart(i, e.target.value)}
                className="input-field flex-1 text-sm"
                placeholder={`Part ${String.fromCharCode(97 + i)}...`}
                maxLength={500}
                autoFocus={i === 0}
                disabled={submitting}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <input
            type="text"
            value={answerTexts[0]}
            onChange={(e) => updatePart(0, e.target.value)}
            className="input-field flex-1"
            placeholder="Type your answer..."
            maxLength={500}
            required
            autoFocus
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </form>
  );
}
