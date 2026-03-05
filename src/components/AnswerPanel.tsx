"use client";

import { useState, useEffect, FormEvent } from "react";
import { Socket } from "socket.io-client";

interface AnswerPanelProps {
  socket: Socket;
  hasSubmitted: boolean;
  isCaptain: boolean;
  isTeamMode: boolean;
  parts?: number;
  scoringMode?: "normal" | "bounce" | "pounce_bounce";
  questionPhase?: string | null;
  currentBounceTeamId?: string | null;
  assignedTeamId?: string | null;
  myTeamId?: string | null;
  myUserId?: string | null;
  pouncePenalty?: number | null;
  questionPoints?: number;
  timerExpired?: boolean;
}

export default function AnswerPanel({
  socket,
  hasSubmitted,
  isCaptain,
  isTeamMode,
  parts = 1,
  scoringMode = "normal",
  questionPhase = null,
  currentBounceTeamId = null,
  assignedTeamId = null,
  myTeamId = null,
  myUserId = null,
  pouncePenalty = null,
  questionPoints = 10,
  timerExpired = false,
}: AnswerPanelProps) {
  const [answerTexts, setAnswerTexts] = useState<string[]>(() => Array(parts).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [showPounceInput, setShowPounceInput] = useState(false);

  useEffect(() => {
    setAnswerTexts(Array(parts).fill(""));
    setSubmitting(false);
    setShowPounceInput(false);
  }, [parts]);

  useEffect(() => {
    const handleRejected = () => setSubmitting(false);
    socket.on("answer-rejected", handleRejected);
    return () => { socket.off("answer-rejected", handleRejected); };
  }, [socket]);

  const canAnswer = isTeamMode ? isCaptain : true;
  const isBounce = scoringMode === "bounce" || scoringMode === "pounce_bounce";
  const myEntityId = isTeamMode ? myTeamId : myUserId;
  const isMyTurn = isBounce && myEntityId && currentBounceTeamId === myEntityId;
  const isAssignedTeam = isBounce && myEntityId && assignedTeamId === myEntityId;
  const canPounce = scoringMode === "pounce_bounce" && questionPhase === "pounce" && !isAssignedTeam && canAnswer;

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

  const handlePounce = (e: FormEvent) => {
    e.preventDefault();
    if (!hasContent || hasSubmitted || submitting || !canAnswer) return;
    setSubmitting(true);
    const text = parts > 1
      ? JSON.stringify(answerTexts.map((t) => t.trim()))
      : answerTexts[0].trim();
    socket.emit("submit-pounce", { text });
  };

  const handlePass = () => {
    socket.emit("pass-bounce");
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
        <div className="text-emerald-400 text-lg font-semibold mb-1">Answer Submitted</div>
        <p className="text-gray-400 text-sm">Waiting for the quizmaster to review...</p>
      </div>
    );
  }

  if (timerExpired && scoringMode === "normal") {
    return null;
  }

  if (!canAnswer) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 text-center">
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-gray-400 text-sm">Only the team captain can submit answers. Discuss with your team!</p>
      </div>
    );
  }

  // ---- BOUNCE / POUNCE MODE ----
  if (isBounce) {
    // Pounce window: show pounce option for non-assigned teams
    if (questionPhase === "pounce" && canPounce) {
      if (!showPounceInput) {
        return (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
            <p className="text-purple-300 text-sm mb-2">Pounce window is open!</p>
            <p className="text-gray-500 text-xs mb-3">
              Risk it? Wrong pounce = <span className="text-red-400 font-medium">-{pouncePenalty ?? questionPoints} pts</span>
            </p>
            <button
              onClick={() => setShowPounceInput(true)}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            >
              Pounce!
            </button>
          </div>
        );
      }

      return (
        <form onSubmit={handlePounce} className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-sm font-medium text-purple-300">Pounce Answer</h3>
          </div>
          <p className="text-xs text-red-400/80 mb-2">Wrong = -{pouncePenalty ?? questionPoints} pts</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={answerTexts[0]}
              onChange={(e) => updatePart(0, e.target.value)}
              className="input-field flex-1"
              placeholder="Your pounce answer..."
              maxLength={500}
              autoFocus
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !hasContent}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "..." : "Submit Pounce"}
            </button>
          </div>
        </form>
      );
    }

    // Pounce window: assigned team sees a waiting message
    if (questionPhase === "pounce" && isAssignedTeam) {
      return (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
          <p className="text-blue-300 text-sm">Pounce window is open. You will answer after it closes.</p>
        </div>
      );
    }

    // Pounce window: non-assigned team that can't pounce (not captain)
    if (questionPhase === "pounce") {
      return (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 text-center">
          <p className="text-purple-300 text-sm">Pounce window is open...</p>
        </div>
      );
    }

    // Direct/Bounce: it's my turn
    if ((questionPhase === "direct" || questionPhase === "bounce") && isMyTurn) {
      return (
        <form onSubmit={handleSubmit} className="bg-gray-800/20 border border-indigo-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
            </span>
            <h3 className="text-sm font-medium text-indigo-300">
              {questionPhase === "direct" ? "Your turn to answer" : "Bounced to you!"}
            </h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={answerTexts[0]}
              onChange={(e) => updatePart(0, e.target.value)}
              className="input-field flex-1"
              placeholder="Type your answer..."
              maxLength={500}
              autoFocus
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !hasContent}
              className="btn-primary px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={handlePass}
              className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 px-4 py-2.5 rounded-xl text-sm transition-all border border-gray-600/30"
            >
              Pass
            </button>
          </div>
        </form>
      );
    }

    // Not my turn
    return (
      <div className="bg-gray-800/20 border border-gray-700/40 rounded-xl p-4 text-center">
        <p className="text-gray-500 text-sm">Waiting for other teams...</p>
      </div>
    );
  }

  // ---- NORMAL MODE ----
  return (
    <form onSubmit={handleSubmit} className="bg-gray-800/20 border border-gray-700/40 rounded-xl p-4">
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
