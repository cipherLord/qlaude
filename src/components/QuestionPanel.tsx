"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { Socket } from "socket.io-client";

interface AnswerEntry {
  answerId: string;
  userId?: string;
  displayName?: string;
  teamId?: string;
  teamName?: string;
  text: string;
  submittedAt: string;
}

interface PounceAnswerForMarking {
  answerId: string;
  teamId: string;
  teamName: string;
  text: string;
}

interface QuestionPanelProps {
  socket: Socket;
  bounceAnswers: AnswerEntry[];
  pounceAnswers: AnswerEntry[];
  hasActiveQuestion: boolean;
  markedWrongIds: Set<string>;
  scoringMode?: "normal" | "bounce" | "pounce_bounce";
  questionPhase?: string | null;
  isPounceMarkingPhase?: boolean;
  pounceAnswersForMarking?: PounceAnswerForMarking[];
  waitingForBounceStart?: boolean;
  roomPouncePenalty?: number | null;
  roomPouncePoints?: number | null;
}

function formatAnswerText(text: string): string {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p: string, i: number) => `${String.fromCharCode(97 + i)}) ${p}`)
        .join("  ");
    }
  } catch {
    /* single-part answer */
  }
  return text;
}

export default function QuestionPanel({
  socket,
  bounceAnswers,
  pounceAnswers,
  hasActiveQuestion,
  markedWrongIds,
  scoringMode = "normal",
  questionPhase = null,
  isPounceMarkingPhase = false,
  pounceAnswersForMarking = [],
  waitingForBounceStart = false,
  roomPouncePenalty = null,
  roomPouncePoints = null,
}: QuestionPanelProps) {
  const [questionText, setQuestionText] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [points, setPoints] = useState(10);
  const [pouncePointsInput, setPouncePointsInput] = useState(roomPouncePoints ?? 10);
  const [pouncePenaltyInput, setPouncePenaltyInput] = useState("");
  const [parts, setParts] = useState(1);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([""]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localBounceMarks, setLocalBounceMarks] = useState<Map<string, boolean>>(new Map());
  const [localPounceMarks, setLocalPounceMarks] = useState<Map<string, boolean>>(new Map());
  const [submittedBounceIds, setSubmittedBounceIds] = useState<Set<string>>(new Set());
  const [submittedPounce, setSubmittedPounce] = useState(false);

  useEffect(() => {
    if (!hasActiveQuestion) {
      setLocalBounceMarks(new Map());
      setLocalPounceMarks(new Map());
      setSubmittedBounceIds(new Set());
      setSubmittedPounce(false);
    }
  }, [hasActiveQuestion]);

  useEffect(() => {
    if (!isPounceMarkingPhase) {
      setLocalPounceMarks(new Map());
      setSubmittedPounce(false);
    }
  }, [isPounceMarkingPhase]);

  useEffect(() => {
    if (submittedBounceIds.size === 0) return;
    setSubmittedBounceIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      Array.from(prev).forEach((id) => {
        if (markedWrongIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [markedWrongIds, submittedBounceIds.size]);

  const updateCorrectAnswer = (index: number, value: string) => {
    setCorrectAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handlePartsChange = (newParts: number) => {
    setParts(newParts);
    setCorrectAnswers((prev) => {
      if (newParts > prev.length) {
        return [...prev, ...Array(newParts - prev.length).fill("")];
      }
      return prev.slice(0, newParts);
    });
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePostQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    if (mediaFile) {
      setMediaUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", mediaFile);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          mediaUrl = data.url;
          mediaType = data.mediaType;
        }
      } catch {
        /* upload failed, post without media */
      } finally {
        setMediaUploading(false);
      }
    }

    const correctAnswer = parts > 1
      ? JSON.stringify(correctAnswers.map((c) => c.trim()))
      : correctAnswers[0]?.trim() || null;

    socket.emit("post-question", {
      text: questionText.trim(),
      timerSeconds,
      points,
      parts,
      correctAnswer: correctAnswer || null,
      mediaUrl,
      mediaType,
      ...(scoringMode === "pounce_bounce" ? {
        pouncePoints: pouncePointsInput,
        pouncePenalty: pouncePenaltyInput ? parseInt(pouncePenaltyInput) : null,
      } : {}),
    });

    setQuestionText("");
    setCorrectAnswers(Array(parts).fill(""));
    setPouncePointsInput(10);
    setPouncePenaltyInput("");
    clearMedia();
  };

  const markBounceLocally = (answerId: string, isCorrect: boolean) => {
    setLocalBounceMarks((prev) => new Map(prev).set(answerId, isCorrect));
  };

  const clearBounceMark = (answerId: string) => {
    setLocalBounceMarks((prev) => {
      const next = new Map(prev);
      next.delete(answerId);
      return next;
    });
  };

  const confirmBounceMark = (answerId: string) => {
    const mark = localBounceMarks.get(answerId);
    if (mark === undefined) return;
    setLocalBounceMarks((prev) => {
      const next = new Map(prev);
      next.delete(answerId);
      return next;
    });
    setSubmittedBounceIds((prev) => new Set(prev).add(answerId));
    if (mark) {
      socket.emit("mark-correct", { answerId });
    } else {
      socket.emit("mark-wrong", { answerId });
    }
  };

  const markPounceLocally = (answerId: string, isCorrect: boolean) => {
    setLocalPounceMarks((prev) => new Map(prev).set(answerId, isCorrect));
  };

  const clearPounceMark = (answerId: string) => {
    setLocalPounceMarks((prev) => {
      const next = new Map(prev);
      next.delete(answerId);
      return next;
    });
  };

  const allPounceMarked = pounceAnswersForMarking.length > 0 &&
    pounceAnswersForMarking.every((pa) => localPounceMarks.has(pa.answerId));

  const confirmAllPounceMarks = () => {
    setSubmittedPounce(true);
    for (const pa of pounceAnswersForMarking) {
      const isCorrect = localPounceMarks.get(pa.answerId);
      if (isCorrect !== undefined) {
        socket.emit("mark-pounce", { answerId: pa.answerId, isCorrect });
      }
    }
  };

  const bounceDisabled = isPounceMarkingPhase && pounceAnswersForMarking.length > 0;

  const pendingBounce = bounceAnswers.filter(
    (a) => !markedWrongIds.has(a.answerId) && !localBounceMarks.has(a.answerId) && !submittedBounceIds.has(a.answerId)
  );
  const locallyMarkedBounce = bounceAnswers.filter(
    (a) => localBounceMarks.has(a.answerId)
  );
  const submittedBounce = bounceAnswers.filter(
    (a) => submittedBounceIds.has(a.answerId) && !markedWrongIds.has(a.answerId)
  );
  const serverMarkedWrong = bounceAnswers.filter(
    (a) => markedWrongIds.has(a.answerId)
  );

  const pendingPounce = pounceAnswersForMarking.filter(
    (pa) => !localPounceMarks.has(pa.answerId)
  );
  const locallyMarkedPounce = pounceAnswersForMarking.filter(
    (pa) => localPounceMarks.has(pa.answerId)
  );

  return (
    <div className="space-y-4">
      {!hasActiveQuestion && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="section-title">Post a Question</h3>
          </div>
          <form onSubmit={handlePostQuestion} className="space-y-3">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="input-field resize-none"
              placeholder="Type your question..."
              rows={3}
              maxLength={1000}
              required
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Timer:</label>
                <select
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(parseInt(e.target.value))}
                  className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                >
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={20}>20s</option>
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                  <option value={120}>2min</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Points:</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-16 bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                  min={1}
                  max={100}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Parts:</label>
                <select
                  value={parts}
                  onChange={(e) => handlePartsChange(parseInt(e.target.value))}
                  className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {scoringMode === "pounce_bounce" && (
              <div className="flex flex-wrap items-center gap-3 bg-purple-500/5 border border-purple-500/15 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-purple-300">Pounce Pts:</label>
                  <input
                    type="number"
                    value={pouncePointsInput}
                    onChange={(e) => setPouncePointsInput(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-16 bg-gray-800/60 border border-purple-500/30 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
                    min={1}
                    max={100}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-red-300">Pounce Penalty:</label>
                  <input
                    type="number"
                    value={pouncePenaltyInput}
                    onChange={(e) => setPouncePenaltyInput(e.target.value)}
                    className="w-16 bg-gray-800/60 border border-red-500/30 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all duration-200 placeholder-gray-600"
                    placeholder={String(roomPouncePenalty ?? pouncePointsInput)}
                    min={1}
                    max={100}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Correct Answer{parts > 1 ? "s" : ""} (optional)
              </label>
              {parts > 1 ? (
                correctAnswers.map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-5 shrink-0">
                      {String.fromCharCode(97 + i)})
                    </span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => updateCorrectAnswer(i, e.target.value)}
                      className="flex-1 bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                      placeholder={`Correct answer for part ${String.fromCharCode(97 + i)}...`}
                    />
                  </div>
                ))
              ) : (
                <input
                  type="text"
                  value={correctAnswers[0]}
                  onChange={(e) => updateCorrectAnswer(0, e.target.value)}
                  className="w-full bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                  placeholder="Type the correct answer..."
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider">
                Attach Image or Video (optional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                  onChange={handleMediaChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-1.5 text-gray-400 text-sm hover:text-white hover:border-gray-600 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {mediaFile ? "Change file" : "Add media"}
                </button>
                {mediaFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 truncate max-w-[150px]">
                      {mediaFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearMedia}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {mediaPreview && mediaFile && (
                <div className="mt-2">
                  {mediaFile.type.startsWith("image/") ? (
                    <img src={mediaPreview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                  ) : (
                    <video src={mediaPreview} controls className="max-h-40 rounded-lg" />
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={mediaUploading}
              className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mediaUploading ? "Uploading media..." : "Post Question"}
            </button>
          </form>
        </div>
      )}

      {scoringMode !== "normal" && questionPhase === "pounce" && hasActiveQuestion && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
              </span>
              <span className="text-sm text-purple-300 font-medium">Pounce Window Open</span>
            </div>
            <button
              onClick={() => socket.emit("advance-phase")}
              className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            >
              Close Pounce
            </button>
          </div>
        </div>
      )}

      {pounceAnswers.length > 0 && !isPounceMarkingPhase && (
        <div className="glass-card p-4 border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="section-title text-purple-300">
              Pounce Answers ({pounceAnswers.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pounceAnswers.map((answer) => (
              <div
                key={answer.answerId}
                className="flex items-start gap-3 bg-purple-500/5 border border-purple-500/15 rounded-xl p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-400">
                    {answer.teamName || answer.displayName}
                  </p>
                  <p className="text-sm text-white mt-0.5">
                    {formatAnswerText(answer.text)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPounceMarkingPhase && pounceAnswersForMarking.length > 0 && (
        <div className="glass-card p-4 border-purple-500/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="section-title text-purple-300">Mark Pounce Answers</h3>
          </div>

          {!submittedPounce && pendingPounce.length > 0 && (
            <div className="space-y-2 mb-3">
              {pendingPounce.map((pa) => (
                <div key={pa.answerId} className="flex items-start gap-3 bg-purple-500/5 border border-purple-500/15 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-purple-400">{pa.teamName}</p>
                    <p className="text-sm text-white mt-0.5">{formatAnswerText(pa.text)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => markPounceLocally(pa.answerId, true)}
                      className="bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-500/20"
                    >
                      Correct
                    </button>
                    <button
                      onClick={() => markPounceLocally(pa.answerId, false)}
                      className="bg-red-600/15 hover:bg-red-600/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-red-500/20"
                    >
                      Wrong
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {locallyMarkedPounce.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {submittedPounce ? "Submitted" : "Marked"}
              </p>
              {locallyMarkedPounce.map((pa) => {
                const isCorrect = localPounceMarks.get(pa.answerId)!;
                return (
                  <div
                    key={pa.answerId}
                    className={`flex items-start gap-3 rounded-xl p-3 border transition-opacity ${
                      isCorrect
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    } ${submittedPounce ? "opacity-60" : ""}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
                    }`}>
                      {isCorrect ? (
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-purple-400">{pa.teamName}</p>
                      <p className="text-sm text-white mt-0.5">{formatAnswerText(pa.text)}</p>
                    </div>
                    {!submittedPounce && (
                      <button
                        onClick={() => clearPounceMark(pa.answerId)}
                        className="text-gray-400 hover:text-white text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 border border-gray-600/30 hover:border-gray-500/50 shrink-0"
                      >
                        Change
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!submittedPounce && allPounceMarked && (
            <button
              onClick={confirmAllPounceMarks}
              className="btn-primary w-full py-2 text-sm"
            >
              Confirm All Marks ({pounceAnswersForMarking.length})
            </button>
          )}
          {submittedPounce && (
            <p className="text-xs text-gray-500 text-center py-1">Waiting for server to process marks...</p>
          )}
        </div>
      )}

      {waitingForBounceStart && hasActiveQuestion && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </span>
              <span className="text-sm text-amber-300 font-medium">Pounce phase complete</span>
            </div>
            <button
              onClick={() => socket.emit("start-bounce")}
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            >
              Start Bounce
            </button>
          </div>
        </div>
      )}

      {bounceAnswers.length > 0 && (
        <div className={`glass-card p-4 transition-opacity ${bounceDisabled ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <h3 className="section-title">
              Bounce Answers ({bounceAnswers.length})
            </h3>
            {bounceDisabled && (
              <span className="text-xs text-purple-300 ml-auto">Mark all pounce answers first</span>
            )}
          </div>

          {pendingBounce.length > 0 && (
            <div className="space-y-2 mb-3">
              {pendingBounce.map((answer) => (
                <div
                  key={answer.answerId}
                  className="flex items-start gap-3 rounded-xl p-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">
                      {answer.teamName || answer.displayName}
                    </p>
                    <p className="text-sm mt-0.5 text-white">
                      {formatAnswerText(answer.text)}
                    </p>
                  </div>
                  {!bounceDisabled && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => markBounceLocally(answer.answerId, true)}
                        className="bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-500/20"
                      >
                        Correct
                      </button>
                      <button
                        onClick={() => markBounceLocally(answer.answerId, false)}
                        className="bg-red-600/15 hover:bg-red-600/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-red-500/20"
                      >
                        Wrong
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {locallyMarkedBounce.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Marked</p>
              {locallyMarkedBounce.map((answer) => {
                const isCorrect = localBounceMarks.get(answer.answerId)!;
                return (
                  <div
                    key={answer.answerId}
                    className={`flex items-start gap-3 rounded-xl p-3 border ${
                      isCorrect
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isCorrect ? "bg-emerald-500/20" : "bg-red-500/20"
                    }`}>
                      {isCorrect ? (
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">
                        {answer.teamName || answer.displayName}
                      </p>
                      <p className="text-sm mt-0.5 text-white">
                        {formatAnswerText(answer.text)}
                      </p>
                    </div>
                    {!bounceDisabled && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => clearBounceMark(answer.answerId)}
                          className="text-gray-400 hover:text-white text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-200 border border-gray-600/30 hover:border-gray-500/50"
                        >
                          Change
                        </button>
                        <button
                          onClick={() => confirmBounceMark(answer.answerId)}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-indigo-500/30"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {submittedBounce.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Submitted</p>
              {submittedBounce.map((answer) => (
                <div
                  key={answer.answerId}
                  className="flex items-start gap-3 rounded-xl p-3 bg-indigo-500/5 border border-indigo-500/15 opacity-60"
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">
                      {answer.teamName || answer.displayName}
                    </p>
                    <p className="text-sm mt-0.5 text-gray-400">
                      {formatAnswerText(answer.text)}
                    </p>
                  </div>
                  <span className="text-xs text-indigo-300 shrink-0">Processing...</span>
                </div>
              ))}
            </div>
          )}

          {serverMarkedWrong.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 uppercase tracking-wider">Previous</p>
              {serverMarkedWrong.map((answer) => (
                <div
                  key={answer.answerId}
                  className="flex items-start gap-3 rounded-xl p-3 bg-red-500/5 border border-red-500/15 opacity-60"
                >
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">
                      {answer.teamName || answer.displayName}
                    </p>
                    <p className="text-sm mt-0.5 text-gray-500 line-through">
                      {formatAnswerText(answer.text)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
