"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import Timer from "@/components/Timer";
import Leaderboard from "@/components/Leaderboard";
import QuestionPanel from "@/components/QuestionPanel";
import AnswerPanel from "@/components/AnswerPanel";
import ParticipantList from "@/components/ParticipantList";
import TeamChat from "@/components/TeamChat";
import TeamSelector from "@/components/TeamSelector";
import BounceStatusBar from "@/components/BounceStatusBar";
import QuestionActivityLog from "@/components/QuestionActivityLog";
import WinnerModal from "@/components/WinnerModal";
import RoomChat from "@/components/RoomChat";
import ScoringRulesPanel from "@/components/ScoringRulesPanel";

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

interface RoomState {
  id: string;
  code: string;
  name: string;
  mode: "individual" | "team";
  status: string;
  isQuizmaster: boolean;
  scoringMode?: "normal" | "bounce" | "pounce_bounce";
  pouncePoints?: number | null;
  pouncePenalty?: number | null;
  totalQuestions?: number;
  isTiebreaker?: boolean;
  teamOrder?: { id: string; name: string }[] | null;
  currentTeamIndex?: number;
}

interface QuestionState {
  id: string;
  text: string;
  order: number;
  timerSeconds: number;
  status: string;
  points?: number;
  parts?: number;
  pouncePoints?: number | null;
  pouncePenalty?: number | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  assignedTeamId?: string | null;
  questionPhase?: string | null;
  currentBounceTeamId?: string | null;
  attemptedTeamIds?: string[];
  pouncedTeamIds?: string[];
}

export interface ActivityEntry {
  type: string;
  teamName?: string;
  teamId?: string;
  answerText?: string;
  answerType?: string;
  points?: number;
  timestamp: number;
}

interface PounceAnswerForMarking {
  answerId: string;
  teamId: string;
  teamName: string;
  text: string;
}

interface AnswerEntry {
  answerId: string;
  userId?: string;
  displayName?: string;
  teamId?: string;
  teamName?: string;
  text: string;
  submittedAt: string;
}

interface QALogEntry {
  questionId: string;
  questionOrder: number;
  questionText: string;
  answerText: string | null;
  answerTeam: string | null;
  status: "correct" | "unanswered";
  correctAnswer: string | null;
}

interface ClosedQuestionEntry {
  questionId: string;
  questionText: string;
  questionOrder: number;
  correctAnswer: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  pointsAwarded: number;
  myAnswer: string | null;
  isCorrect: boolean | null;
  answers?: {
    id: string;
    text: string;
    isCorrect: boolean | null;
    displayName: string | null;
    teamName: string | null;
    submittedAt: string;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScoreEntry = any;

interface TeamInfo {
  _id: string;
  name: string;
  code: string;
  hasPassword: boolean;
  memberCount: number;
  captainId: { _id: string; displayName: string } | string;
}

function WaitingIllustration({ isQuizmaster, roomClosed }: { isQuizmaster: boolean; roomClosed: boolean }) {
  if (roomClosed) {
    return (
      <div className="flex flex-col items-center py-6">
        <svg className="w-24 h-24 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-gray-400 text-sm font-medium">This quiz has been closed</p>
        <p className="text-gray-600 text-xs mt-1">
          {isQuizmaster
            ? "You can review the questions and answers below."
            : "Check out the questions and results below."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6">
      <svg className="w-28 h-28 mb-4" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r="40" fill="none" stroke="#4338ca" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="38;42;38" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="60" r="30" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="8 6">
          <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="12s" repeatCount="indefinite" />
        </circle>
        {isQuizmaster ? (
          <>
            <rect x="46" y="50" width="28" height="20" rx="4" fill="#312e81" stroke="#4338ca" strokeWidth="1">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
            </rect>
            <circle cx="60" cy="46" r="3" fill="#818cf8">
              <animate attributeName="cy" values="46;43;46" dur="2s" repeatCount="indefinite" />
            </circle>
          </>
        ) : (
          <>
            <circle cx="52" cy="56" r="4" fill="#818cf8" opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="60" cy="56" r="4" fill="#a78bfa" opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" begin="0.3s" repeatCount="indefinite" />
            </circle>
            <circle cx="68" cy="56" r="4" fill="#c4b5fd" opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" begin="0.6s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
      <p className="text-gray-400 text-sm">
        {isQuizmaster
          ? "Post a question to start the quiz!"
          : "Waiting for the quizmaster to post a question..."}
      </p>
    </div>
  );
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const code = params.code as string;

  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionState | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [pounceAnswers, setPounceAnswers] = useState<AnswerEntry[]>([]);
  const [bounceAnswers, setBounceAnswers] = useState<AnswerEntry[]>([]);
  const [qaLog, setQaLog] = useState<QALogEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [closedQuestions, setClosedQuestions] = useState<ClosedQuestionEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [markedWrongIds, setMarkedWrongIds] = useState<Set<string>>(new Set());
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [error, setError] = useState("");

  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; isCaptain: boolean } | null>(null);
  const [needsTeam, setNeedsTeam] = useState(false);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [bounceEndsAt, setBounceEndsAt] = useState<string | null>(null);
  const [pounceEndsAt, setPounceEndsAt] = useState<string | null>(null);
  const [isPounceMarkingPhase, setIsPounceMarkingPhase] = useState(false);
  const [pounceAnswersForMarking, setPounceAnswersForMarking] = useState<PounceAnswerForMarking[]>([]);
  const [waitingForBounceStart, setWaitingForBounceStart] = useState(false);
  const [pounceResult, setPounceResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quizFinished, setQuizFinished] = useState<{ winner: { id: string; name: string; score: number }; leaderboard: any[]; isTie: boolean } | null>(null);
  const [tiebreakerInfo, setTiebreakerInfo] = useState<{ tiedEntities: { id: string; name: string; score: number }[]; message: string } | null>(null);

  const myEntityIdRef = useRef<string | null>(null);
  useEffect(() => {
    myEntityIdRef.current = myTeam?.id || user?.id || null;
  }, [myTeam, user]);

  const fetchRoomInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Room not found");
        return null;
      }
      const data = await res.json();
      if (data.room.mode === "team" && data.teams) {
        setTeams(data.teams);
      }
      return data;
    } catch {
      setError("Failed to load room");
      return null;
    }
  }, [code]);

  const connectSocket = useCallback(async () => {
    if (socketRef.current?.connected || isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      const tokenRes = await fetch("/api/auth/token");
      if (!tokenRes.ok) return;
      const { token } = await tokenRes.json();

      if (socketRef.current?.connected) return;

      const socket = io({
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
      });

      socket.on("connect", () => {
        setConnected(true);
        if (socket.recovered) return;
        socket.emit("join-room", { roomCode: code });
      });
      socket.on("disconnect", () => setConnected(false));

      socket.on("room-state", (data) => {
        setRoomState(data.room);
        if (data.room?.status === "closed") {
          setRoomClosed(true);
        }
        if (data.activeQuestion) {
          setActiveQuestion(data.activeQuestion);
        }
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      });

      socket.on("question-started", (data) => {
        setActiveQuestion(data.question);
        setEndsAt(data.endsAt || null);
        setBounceEndsAt(data.endsAt || null);
        setPounceEndsAt(data.pounceEndsAt || null);
        setTimerExpired(false);
        setHasSubmitted(false);
        setPounceAnswers([]);
        setBounceAnswers([]);
        setMarkedWrongIds(new Set());
        setActivityLog([]);
        setIsPounceMarkingPhase(false);
        setPounceAnswersForMarking([]);
        setWaitingForBounceStart(false);
        setPounceResult(null);
      });

      socket.on("team-order-set", (data) => {
        setRoomState((prev) => prev ? { ...prev, teamOrder: data.teamOrder } : prev);
      });

      socket.on("phase-changed", (data) => {
        setActiveQuestion((prev) => prev ? { ...prev, questionPhase: data.questionPhase, currentBounceTeamId: data.currentBounceTeamId } : prev);
        setBounceEndsAt(data.endsAt || null);
        setPounceEndsAt(null);
        setWaitingForBounceStart(false);
        setIsPounceMarkingPhase(false);
        setPounceAnswersForMarking([]);
      });

      socket.on("bounce-advanced", (data) => {
        setActiveQuestion((prev) => prev ? { ...prev, currentBounceTeamId: data.currentBounceTeamId, questionPhase: "bounce" } : prev);
        setBounceEndsAt(data.endsAt || null);
      });

      socket.on("bounce-answer-submitted", (data) => {
        setBounceEndsAt(null);
        setBounceAnswers((prev) => {
          if (prev.some((a) => a.answerId === data.answerId)) return prev;
          return [...prev, { answerId: data.answerId, teamId: data.teamId, teamName: data.teamName, text: data.text, submittedAt: new Date().toISOString() }];
        });
      });

      socket.on("pounce-received", (data) => {
        setPounceAnswers((prev) => {
          if (prev.some((a) => a.answerId === data.answerId)) return prev;
          return [...prev, { answerId: data.answerId, teamId: data.teamId, teamName: data.teamName, text: data.text, submittedAt: new Date().toISOString() }];
        });
      });

      socket.on("pounce-status-update", (data) => {
        setActiveQuestion((prev) => prev ? { ...prev, pouncedTeamIds: data.pouncedTeamIds } : prev);
      });

      socket.on("activity-event", (data) => {
        setActivityLog((prev) => [...prev, { ...data, timestamp: Date.now() }]);
      });

      socket.on("pounce-marking-phase", (data) => {
        setIsPounceMarkingPhase(true);
        setPounceAnswersForMarking(data.pounceAnswers || []);
        setActiveQuestion((prev) => prev ? { ...prev, questionPhase: "pounce_marking" } : prev);
        setPounceEndsAt(null);
      });

      socket.on("pounce-marked", (data: { answerId: string; teamId: string; isCorrect: boolean; points: number }) => {
        if (myEntityIdRef.current && data.teamId === myEntityIdRef.current) {
          setPounceResult({ isCorrect: data.isCorrect, points: data.points });
        }
      });

      socket.on("all-pounces-marked", () => {
        setIsPounceMarkingPhase(false);
        setPounceAnswersForMarking([]);
        setWaitingForBounceStart(true);
      });

      socket.on("pounce-closed-waiting", () => {
        setWaitingForBounceStart(true);
        setActiveQuestion((prev) => prev ? { ...prev, questionPhase: "waiting_for_bounce" } : prev);
        setPounceEndsAt(null);
      });

      socket.on("question-resolved", () => {
        setActiveQuestion(null);
        setBounceEndsAt(null);
        setPounceEndsAt(null);
        setBounceAnswers([]);
        setPounceAnswers([]);
        setMarkedWrongIds(new Set());
        setIsPounceMarkingPhase(false);
        setPounceAnswersForMarking([]);
        setWaitingForBounceStart(false);
      });

      socket.on("answer-received", (data: AnswerEntry) => {
        setBounceAnswers((prev) => {
          if (prev.some((a) => a.answerId === data.answerId)) return prev;
          return [...prev, data];
        });
      });

      socket.on("answer-submitted", () => {
        setHasSubmitted(true);
      });

      socket.on("answer-rejected", (data: { reason: string }) => {
        setError(`Answer rejected: ${data.reason}`);
        setTimeout(() => setError(""), 3000);
      });

      socket.on("answer-marked-wrong", (data: { answerId: string }) => {
        setMarkedWrongIds((prev) => new Set(prev).add(data.answerId));
      });

      socket.on("timer-expired", () => {
        setTimerExpired(true);
      });

      socket.on("answers-revealed", (data) => {
        setActiveQuestion(null);
        setEndsAt(null);
        setBounceAnswers([]);
        setPounceAnswers([]);
        setMarkedWrongIds(new Set());
        setBounceEndsAt(null);
        setPounceEndsAt(null);
        setIsPounceMarkingPhase(false);
        setPounceAnswersForMarking([]);
        setWaitingForBounceStart(false);

        const correctAnswer = data.answers?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (a: any) => a.isCorrect === true
        );
        const newEntry = {
          questionId: data.questionId,
          questionOrder: data.questionOrder,
          questionText: data.questionText,
          answerText: correctAnswer?.text || null,
          answerTeam: correctAnswer?.teamName || correctAnswer?.displayName || null,
          status: (correctAnswer ? "correct" : "unanswered") as "correct" | "unanswered",
          correctAnswer: data.correctAnswer || null,
        };
        setQaLog((prev) => {
          const existingIdx = prev.findIndex((e) => e.questionId === data.questionId);
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = newEntry;
            return updated;
          }
          return [...prev, newEntry];
        });
      });

      socket.on("leaderboard-update", (data) => {
        setLeaderboard(data.leaderboard);
      });

      socket.on("quiz-finished", (data) => {
        setQuizFinished(data);
      });

      socket.on("tiebreaker-start", (data) => {
        setTiebreakerInfo(data);
      });

      socket.on("room-closed", () => {
        setRoomClosed(true);
        setActiveQuestion(null);
        setEndsAt(null);
      });

      socket.on("team-removed", () => {
        socket.emit("get-participants");
      });

      socket.on("already-in-room", (data) => {
        setError(`You are already in another room`);
        if (data.currentRoomId) {
          setTimeout(() => router.push(`/room/${data.currentRoomId}`), 2000);
        }
      });

      socket.on("team-disqualified", (data) => {
        setError(`Your team has been disqualified: ${data.reason}`);
        setTimeout(() => router.push("/dashboard"), 3000);
      });

      socket.on("participant-disqualified", (data) => {
        setError(`You have been removed: ${data.reason}`);
        setTimeout(() => router.push("/dashboard"), 3000);
      });

      socket.on("error", (data) => {
        setError(data.message);
        setTimeout(() => setError(""), 5000);
      });

      socket.connect();
      socketRef.current = socket;

      socket.emit("join-room", { roomCode: code });
    } finally {
      isConnectingRef.current = false;
    }
  }, [code, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    fetchRoomInfo().then((data) => {
      if (!data) return;

      if (data.room.status === "closed") {
        setRoomClosed(true);
        setRoomState({
          id: data.room.id,
          code: data.room.code,
          name: data.room.name,
          mode: data.room.mode,
          status: data.room.status,
          isQuizmaster: data.room.isQuizmaster,
        });
        return;
      }

      if (data.room.mode === "team" && !data.room.isQuizmaster) {
        const userInTeam = data.teams?.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (t: any) => t.memberIds?.some((m: any) => {
            const mId = typeof m === "object" ? m._id : m;
            return mId?.toString() === user.id;
          })
        );

        if (!userInTeam) {
          setNeedsTeam(true);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const team = data.teams?.find((t: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          t.memberIds?.some((m: any) => {
            const mId = typeof m === "object" ? m._id : m;
            return mId?.toString() === user.id;
          })
        );
        if (team) {
          const captainId =
            typeof team.captainId === "object"
              ? team.captainId._id
              : team.captainId;
          setMyTeam({
            id: team._id,
            name: team.name,
            isCaptain: captainId?.toString() === user.id,
          });
        }
      }

      connectSocket();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-room");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [authLoading, user, fetchRoomInfo, connectSocket]);

  useEffect(() => {
    if (!roomClosed || !roomState) return;
    let cancelled = false;
    setLoadingHistory(true);
    fetch(`/api/rooms/${code}/questions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.questions) return;
        setClosedQuestions(data.questions);
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => { cancelled = true; };
  }, [roomClosed, roomState, code]);

  const handleTeamJoined = (team: { id: string; name: string; isCaptain: boolean }) => {
    setMyTeam(team);
    setNeedsTeam(false);
    connectSocket();
  };

  const handleLeaveRoom = () => {
    socketRef.current?.emit("leave-room");
    socketRef.current?.disconnect();
    router.push("/dashboard");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500/20 border-t-indigo-500" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (needsTeam) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <TeamSelector
          roomCode={code}
          teams={teams}
          onTeamJoined={handleTeamJoined}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {roomClosed && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 px-4 py-3 mb-4 text-sm flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2 text-amber-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This room has been closed. Your history is preserved below.</span>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="shrink-0 ml-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {error && (
        <div className="glass-card border-red-500/20 bg-red-500/5 px-4 py-3 mb-4 text-sm text-red-400 flex items-center gap-2 animate-slide-up">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {roomState?.name || "Loading..."}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs bg-gray-800/80 text-gray-400 px-2.5 py-0.5 rounded-md font-mono tracking-widest">
              {code}
            </span>
            <div className="flex items-center gap-1.5">
              {roomClosed ? (
                <>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  <span className="text-xs text-amber-400">Closed</span>
                </>
              ) : (
                <>
                  <span className={`relative flex h-2 w-2 ${connected ? "" : "opacity-50"}`}>
                    {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
                  </span>
                  <span className={`text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
                    {connected ? "Connected" : "Reconnecting..."}
                  </span>
                </>
              )}
            </div>
            {roomState?.mode === "team" && myTeam && (
              <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {myTeam.name}
                {myTeam.isCaptain && " (Captain)"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {roomState?.isQuizmaster && !roomClosed && (
            showCloseConfirm ? (
              <div className="flex items-center gap-2 animate-slide-up">
                <span className="text-xs text-gray-400">Close room?</span>
                <button
                  onClick={() => {
                    const sock = socketRef.current;
                    console.log("[close-room] emitting, socket connected:", sock?.connected, "id:", sock?.id, "roomCode:", code);
                    if (!sock?.connected) {
                      setError("Socket not connected. Refresh the page and try again.");
                      setShowCloseConfirm(false);
                      return;
                    }
                    sock.timeout(10000).emit(
                      "close-room",
                      { roomCode: code },
                      (err: Error | null, response: { ok: boolean; error?: string } | undefined) => {
                        console.log("[close-room] ack:", err, response);
                        if (err) {
                          setError("Close room timed out. Try again.");
                        } else if (response && !response.ok) {
                          setError(response.error || "Failed to close room");
                        } else if (response?.ok) {
                          setRoomClosed(true);
                          setActiveQuestion(null);
                          setEndsAt(null);
                        }
                      }
                    );
                    setShowCloseConfirm(false);
                  }}
                  className="text-red-400 hover:text-red-300 text-xs font-medium border border-red-500/30 hover:border-red-500/50 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  Yes, close
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="text-gray-400 hover:text-gray-300 text-xs font-medium border border-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="text-red-400 hover:text-red-300 text-sm font-medium transition-all duration-200 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-xl hover:bg-red-500/5"
              >
                Close Room
              </button>
            )
          )}
          <button
            onClick={handleLeaveRoom}
            className="text-gray-500 hover:text-red-400 text-sm transition-colors duration-200"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {activeQuestion && roomState?.scoringMode && roomState.scoringMode !== "normal" && roomState.teamOrder && (
            <BounceStatusBar
              teamOrder={roomState.teamOrder}
              currentBounceTeamId={activeQuestion.currentBounceTeamId || null}
              assignedTeamId={activeQuestion.assignedTeamId || null}
              attemptedTeamIds={activeQuestion.attemptedTeamIds || []}
              pouncedTeamIds={activeQuestion.pouncedTeamIds || []}
              questionPhase={activeQuestion.questionPhase || null}
              bounceEndsAt={bounceEndsAt}
              pounceEndsAt={pounceEndsAt}
              bouncePoints={activeQuestion.points ?? 10}
              pouncePoints={activeQuestion.pouncePoints ?? activeQuestion.points ?? 10}
              pouncePenalty={activeQuestion.pouncePenalty ?? roomState?.pouncePenalty ?? (activeQuestion.pouncePoints ?? activeQuestion.points ?? 10)}
              scoringMode={roomState.scoringMode}
            />
          )}

          {activeQuestion && (
            <div className="glass-card p-6 animate-scale-in">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="section-title">
                      Question {activeQuestion.order}
                    </span>
                    {activeQuestion.points && activeQuestion.points !== 10 && (
                      <span className="badge bg-amber-500/15 text-amber-300 border border-amber-500/20">
                        {activeQuestion.points} pts
                      </span>
                    )}
                    {activeQuestion.parts && activeQuestion.parts > 1 && (
                      <span className="badge bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                        {activeQuestion.parts} parts
                      </span>
                    )}
                    {activeQuestion.questionPhase && (
                      <span className={`badge border text-xs ${
                        activeQuestion.questionPhase === "pounce" ? "bg-purple-500/15 text-purple-300 border-purple-500/20" :
                        activeQuestion.questionPhase === "pounce_marking" ? "bg-purple-500/15 text-purple-300 border-purple-500/20" :
                        activeQuestion.questionPhase === "waiting_for_bounce" ? "bg-amber-500/15 text-amber-300 border-amber-500/20" :
                        activeQuestion.questionPhase === "direct" ? "bg-blue-500/15 text-blue-300 border-blue-500/20" :
                        activeQuestion.questionPhase === "bounce" ? "bg-amber-500/15 text-amber-300 border-amber-500/20" :
                        "bg-gray-500/15 text-gray-300 border-gray-500/20"
                      }`}>
                        {activeQuestion.questionPhase === "pounce" ? "Pounce Window" :
                         activeQuestion.questionPhase === "pounce_marking" ? "Marking Pounces" :
                         activeQuestion.questionPhase === "waiting_for_bounce" ? "Waiting for Bounce" :
                         activeQuestion.questionPhase === "direct" ? "Direct Answer" :
                         activeQuestion.questionPhase === "bounce" ? "Bounce" : "Resolved"}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    {activeQuestion.text}
                  </h2>
                  {activeQuestion.mediaUrl && activeQuestion.mediaType === "image" && (
                    <div className="mt-3">
                      <img
                        src={activeQuestion.mediaUrl}
                        alt="Question media"
                        className="max-w-full max-h-80 rounded-xl object-contain"
                      />
                    </div>
                  )}
                  {activeQuestion.mediaUrl && activeQuestion.mediaType === "video" && (
                    <div className="mt-3">
                      <video
                        src={activeQuestion.mediaUrl}
                        controls
                        className="max-w-full max-h-80 rounded-xl"
                      />
                    </div>
                  )}
                </div>
                {roomState?.scoringMode === "normal" && endsAt && !timerExpired && (
                  <Timer endsAt={endsAt} onExpired={() => setTimerExpired(true)} />
                )}
                {roomState?.scoringMode === "normal" && timerExpired && (
                  <span className="text-red-400 font-semibold text-sm animate-pulse flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Time&apos;s up!
                  </span>
                )}
              </div>

              {!roomState?.isQuizmaster && (
                <AnswerPanel
                  socket={socketRef.current!}
                  hasSubmitted={hasSubmitted}
                  isCaptain={myTeam?.isCaptain ?? true}
                  isTeamMode={roomState?.mode === "team"}
                  parts={activeQuestion?.parts}
                  scoringMode={roomState?.scoringMode || "normal"}
                  questionPhase={activeQuestion?.questionPhase || null}
                  currentBounceTeamId={activeQuestion?.currentBounceTeamId || null}
                  assignedTeamId={activeQuestion?.assignedTeamId || null}
                  myTeamId={myTeam?.id || null}
                  myUserId={user?.id || null}
                  pouncePoints={activeQuestion?.pouncePoints ?? activeQuestion?.points ?? 10}
                  pouncePenalty={activeQuestion?.pouncePenalty ?? roomState?.pouncePenalty ?? null}
                  questionPoints={activeQuestion?.points ?? 10}
                  timerExpired={timerExpired}
                  pounceResult={pounceResult}
                />
              )}
            </div>
          )}

          {roomState?.isQuizmaster && socketRef.current && !roomClosed && (
            <QuestionPanel
              socket={socketRef.current}
              bounceAnswers={bounceAnswers}
              pounceAnswers={pounceAnswers}
              hasActiveQuestion={!!activeQuestion && !timerExpired}
              markedWrongIds={markedWrongIds}
              scoringMode={roomState?.scoringMode || "normal"}
              questionPhase={activeQuestion?.questionPhase || null}
              isPounceMarkingPhase={isPounceMarkingPhase}
              pounceAnswersForMarking={pounceAnswersForMarking}
              waitingForBounceStart={waitingForBounceStart}
              roomPouncePenalty={roomState?.pouncePenalty ?? null}
              roomPouncePoints={roomState?.pouncePoints ?? null}
            />
          )}

          {roomState?.scoringMode && roomState.scoringMode !== "normal" && activityLog.length > 0 && (
            <QuestionActivityLog entries={activityLog} />
          )}

          {qaLog.length > 0 && (
            <div className="glass-card p-4 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="section-title">Question &amp; Answer Log</h3>
                <span className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full ml-auto">
                  {qaLog.length} question{qaLog.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {qaLog.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2.5 rounded-xl border transition-colors duration-200 ${
                      entry.status === "correct"
                        ? "bg-emerald-500/5 border-emerald-500/15"
                        : "bg-gray-800/30 border-gray-700/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded font-mono border border-indigo-500/20">
                        Q{entry.questionOrder}
                      </span>
                      <span className="text-sm text-white font-medium truncate">{entry.questionText}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-0.5">
                      {entry.status === "correct" ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-emerald-300">
                            {formatAnswerText(entry.answerText!)}
                          </span>
                          {entry.answerTeam && (
                            <span className="text-xs text-gray-500">by {entry.answerTeam}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="text-sm text-gray-500 italic">Unanswered</span>
                          {entry.correctAnswer && (
                            <span className="text-xs text-gray-600">
                              (Answer: {formatAnswerText(entry.correctAnswer)})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!activeQuestion && qaLog.length === 0 && (
            <div className="glass-card p-6">
              <WaitingIllustration isQuizmaster={roomState?.isQuizmaster ?? false} roomClosed={roomClosed} />
            </div>
          )}

          {roomClosed && closedQuestions.length > 0 && (
            <div className="glass-card p-6 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-semibold text-white">Previous Questions</h3>
                <span className="text-xs bg-gray-700/50 text-gray-400 px-2 py-0.5 rounded-full ml-auto">
                  {closedQuestions.length} question{closedQuestions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-4">
                {closedQuestions.map((q) => (
                  <div
                    key={q.questionId}
                    className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30 hover:border-gray-700/50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-md font-mono border border-indigo-500/20">
                          Q{q.questionOrder}
                        </span>
                        <span className="text-xs text-gray-500">{q.pointsAwarded} pts</span>
                      </div>
                      {!roomState?.isQuizmaster && q.isCorrect === true && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Correct
                        </span>
                      )}
                      {!roomState?.isQuizmaster && q.isCorrect === false && (
                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Incorrect
                        </span>
                      )}
                    </div>

                    <h4 className="text-white font-medium mb-2">{q.questionText}</h4>

                    {q.mediaUrl && q.mediaType === "image" && (
                      <img
                        src={q.mediaUrl}
                        alt="Question media"
                        className="max-w-full max-h-60 rounded-lg object-contain mb-3"
                      />
                    )}
                    {q.mediaUrl && q.mediaType === "video" && (
                      <video
                        src={q.mediaUrl}
                        controls
                        className="max-w-full max-h-60 rounded-lg mb-3"
                      />
                    )}

                    {!roomState?.isQuizmaster && q.myAnswer && (
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xs text-gray-500 shrink-0 mt-0.5">Your answer:</span>
                        <span className={`text-sm ${q.isCorrect ? "text-emerald-400" : q.isCorrect === false ? "text-red-400" : "text-gray-300"}`}>
                          {formatAnswerText(q.myAnswer)}
                        </span>
                      </div>
                    )}
                    {!roomState?.isQuizmaster && !q.myAnswer && (
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xs text-gray-500">You did not answer this question</span>
                      </div>
                    )}

                    {q.correctAnswer && (
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xs text-gray-500 shrink-0 mt-0.5">Correct answer:</span>
                        <span className="text-sm text-emerald-300 font-medium">{formatAnswerText(q.correctAnswer)}</span>
                      </div>
                    )}

                    {roomState?.isQuizmaster && q.answers && q.answers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700/30">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Submitted Answers ({q.answers.length})
                        </p>
                        <div className="space-y-1.5">
                          {q.answers.map((a) => (
                            <div
                              key={a.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${
                                a.isCorrect === true
                                  ? "bg-emerald-500/10 border border-emerald-500/15"
                                  : a.isCorrect === false
                                  ? "bg-red-500/5 border border-red-500/10"
                                  : "bg-gray-800/30"
                              }`}
                            >
                              {a.isCorrect === true && (
                                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {a.isCorrect === false && (
                                <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span className="text-gray-500 text-xs shrink-0">
                                {a.teamName || a.displayName || "Anonymous"}
                              </span>
                              <span className={`${a.isCorrect === false ? "text-gray-500" : "text-gray-300"}`}>{formatAnswerText(a.text)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {roomState?.isQuizmaster && (!q.answers || q.answers.length === 0) && (
                      <p className="text-xs text-gray-600 mt-2">No answers were submitted</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {roomClosed && loadingHistory && (
            <div className="glass-card p-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500/20 border-t-indigo-500" />
              <span className="ml-3 text-gray-400 text-sm">Loading question history...</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Leaderboard
            scores={leaderboard}
            mode={roomState?.mode || "individual"}
            currentUserId={user?.id}
          />

          {roomState?.scoringMode && roomState.scoringMode !== "normal" && (
            <ScoringRulesPanel
              scoringMode={roomState.scoringMode}
              pouncePenalty={activeQuestion?.pouncePenalty ?? roomState?.pouncePenalty ?? null}
              pouncePoints={activeQuestion?.pouncePoints ?? activeQuestion?.points ?? 10}
              questionPoints={activeQuestion?.points ?? 10}
            />
          )}

          {roomState?.isQuizmaster && socketRef.current && !roomClosed && (
            <ParticipantList
              socket={socketRef.current}
              mode={roomState.mode}
            />
          )}

          {roomState?.mode === "team" && myTeam && socketRef.current && (
            <TeamChat
              socket={socketRef.current}
              teamId={myTeam.id}
              currentUserId={user?.id || ""}
            />
          )}

          {socketRef.current && roomState && !roomClosed && (
            <RoomChat
              socket={socketRef.current}
              isQuizmaster={!!roomState.isQuizmaster}
              currentUserId={user?.id || ""}
            />
          )}

          <div className="glass-card p-4">
            <h3 className="section-title mb-2">Share Room</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-800/60 px-3 py-2.5 rounded-xl text-indigo-300 font-mono text-lg text-center tracking-widest">
                {code}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/room/${code}`
                  );
                }}
                className="bg-gray-800/60 hover:bg-gray-700/60 text-gray-300 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:text-white"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {quizFinished && (
        <WinnerModal
          winner={quizFinished.winner}
          leaderboard={quizFinished.leaderboard}
          isTie={quizFinished.isTie}
          onClose={() => setQuizFinished(null)}
        />
      )}

      {tiebreakerInfo && !quizFinished && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Sudden Death!</h2>
            <p className="text-gray-400 text-sm mb-4">{tiebreakerInfo.message}</p>
            <div className="space-y-2 mb-4">
              {tiebreakerInfo.tiedEntities.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/40 rounded-lg">
                  <span className="text-sm text-gray-300">{e.name}</span>
                  <span className="text-sm text-gray-400 font-mono">{e.score} pts</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTiebreakerInfo(null)}
              className="btn-primary w-full py-2"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
