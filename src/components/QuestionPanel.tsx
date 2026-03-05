"use client";

import { useState, useRef, FormEvent } from "react";
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
  incomingAnswers: AnswerEntry[];
  hasActiveQuestion: boolean;
  markedWrongIds: Set<string>;
  scoringMode?: "normal" | "bounce" | "pounce_bounce";
  questionPhase?: string | null;
  isPounceMarkingPhase?: boolean;
  pounceAnswersForMarking?: PounceAnswerForMarking[];
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
  incomingAnswers,
  hasActiveQuestion,
  markedWrongIds,
  scoringMode = "normal",
  questionPhase = null,
  isPounceMarkingPhase = false,
  pounceAnswersForMarking = [],
}: QuestionPanelProps) {
  const [questionText, setQuestionText] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [points, setPoints] = useState(10);
  const [parts, setParts] = useState(1);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([""]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    });

    setQuestionText("");
    setCorrectAnswers(Array(parts).fill(""));
    clearMedia();
  };

  const handleMarkCorrect = (answerId: string) => {
    socket.emit("mark-correct", { answerId });
  };

  const handleMarkWrong = (answerId: string) => {
    socket.emit("mark-wrong", { answerId });
  };

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
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            >
              Close Pounce &amp; Start Bounce
            </button>
          </div>
        </div>
      )}

      {incomingAnswers.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
            </span>
            <h3 className="section-title">
              Incoming Answers ({incomingAnswers.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {incomingAnswers.map((answer) => {
              const isWrong = markedWrongIds.has(answer.answerId);
              const isPounce = (answer as AnswerEntry & { answerType?: string }).answerType === "pounce" ||
                (!('answerType' in answer) && false);
              return (
                <div
                  key={answer.answerId}
                  className={`flex items-start gap-3 rounded-xl p-3 transition-colors duration-200 ${
                    isWrong
                      ? "bg-red-500/5 border border-red-500/15 opacity-60"
                      : isPounce
                      ? "bg-purple-500/5 border border-purple-500/15"
                      : "bg-gray-800/30 hover:bg-gray-800/50"
                  }`}
                >
                  {isWrong && (
                    <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-gray-500">
                        {answer.teamName || answer.displayName}
                      </p>
                      {isPounce && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                          Pounce
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${isWrong ? "text-gray-500 line-through" : "text-white"}`}>
                      {formatAnswerText(answer.text)}
                    </p>
                  </div>
                  {!isWrong && !isPounce && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMarkCorrect(answer.answerId)}
                        className="bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-500/20"
                      >
                        Correct
                      </button>
                      <button
                        onClick={() => handleMarkWrong(answer.answerId)}
                        className="bg-red-600/15 hover:bg-red-600/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-red-500/20"
                      >
                        Wrong
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
          <div className="space-y-2">
            {pounceAnswersForMarking.map((pa) => (
              <div key={pa.answerId} className="flex items-start gap-3 bg-purple-500/5 border border-purple-500/15 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-400">{pa.teamName}</p>
                  <p className="text-sm text-white mt-0.5">{formatAnswerText(pa.text)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => socket.emit("mark-pounce", { answerId: pa.answerId, isCorrect: true })}
                    className="bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-500/20"
                  >
                    Correct
                  </button>
                  <button
                    onClick={() => socket.emit("mark-pounce", { answerId: pa.answerId, isCorrect: false })}
                    className="bg-red-600/15 hover:bg-red-600/30 text-red-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border border-red-500/20"
                  >
                    Wrong
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
