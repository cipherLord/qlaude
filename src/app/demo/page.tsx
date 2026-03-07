"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  mode: "individual" | "team";
  scoringMode: string;
}

interface StepInfo {
  id: string;
  label: string;
  actor: string;
}

type DemoState = "idle" | "running" | "paused" | "stepping" | "completed" | "error";

const SCENARIOS: ScenarioMeta[] = [
  {
    id: "individual-normal",
    name: "Individual + Normal",
    description: "Classic quiz: players answer individually, QM marks correct/wrong",
    mode: "individual",
    scoringMode: "normal",
  },
  {
    id: "individual-bounce",
    name: "Individual + Bounce",
    description: "Questions assigned to one player; wrong answers bounce to the next",
    mode: "individual",
    scoringMode: "bounce",
  },
  {
    id: "individual-pounce-bounce",
    name: "Individual + Pounce & Bounce",
    description: "Players can pounce before the bounce phase",
    mode: "individual",
    scoringMode: "pounce_bounce",
  },
  {
    id: "team-normal",
    name: "Team + Normal",
    description: "Teams compete: captains create teams, answer questions together",
    mode: "team",
    scoringMode: "normal",
  },
  {
    id: "team-bounce",
    name: "Team + Bounce",
    description: "Questions assigned to teams; wrong answers bounce to the next team",
    mode: "team",
    scoringMode: "bounce",
  },
  {
    id: "team-pounce-bounce",
    name: "Team + Pounce & Bounce",
    description: "Teams can pounce before the bounce phase; most complex scoring mode",
    mode: "team",
    scoringMode: "pounce_bounce",
  },
];

const ACTOR_COLORS: Record<string, string> = {
  qm: "bg-red-500",
  player1: "bg-blue-500",
  player2: "bg-green-500",
  cap1: "bg-blue-500",
  cap2: "bg-green-500",
  cap3: "bg-purple-500",
};

const ACTOR_LABELS: Record<string, string> = {
  qm: "QM",
  player1: "P1",
  player2: "P2",
  cap1: "C1",
  cap2: "C2",
  cap3: "C3",
};

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "step" | "error" | "success";
}

export default function DemoPage() {
  const [selectedScenario, setSelectedScenario] = useState<string>("individual-normal");
  const [speed, setSpeed] = useState(1);
  const [playMode, setPlayMode] = useState<"auto" | "step">("auto");
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepBusy, setStepBusy] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [roomCode, setRoomCode] = useState<string>("");
  const [elapsedMs, setElapsedMs] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const stepListRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev.slice(-200), { time, message, type }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    if (currentStepIndex >= 0 && stepListRef.current) {
      const stepEl = stepListRef.current.querySelector(`[data-step-index="${currentStepIndex}"]`);
      stepEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStepIndex]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    stopTimer();
  }, [stopTimer]);

  const startDemo = useCallback(() => {
    cleanup();
    setSteps([]);
    setCurrentStepIndex(-1);
    setCompletedSteps(new Set());
    setStepBusy(false);
    setLogs([]);
    setRoomCode("");
    setElapsedMs(0);
    setDemoState("running");

    addLog(`Starting scenario: ${SCENARIOS.find((s) => s.id === selectedScenario)?.name}`, "info");
    addLog(`Speed: ${speed}x | Mode: ${playMode}`, "info");

    const params = new URLSearchParams({
      scenario: selectedScenario,
      speed: String(speed),
      mode: playMode,
    });

    const es = new EventSource(`/api/demo?${params.toString()}`);
    eventSourceRef.current = es;
    startTimer();

    es.addEventListener("scenarioInfo", (e) => {
      const data = JSON.parse(e.data);
      setSteps(data.steps);
      addLog(`Loaded ${data.totalSteps} steps for "${data.name}"`, "info");
    });

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      const state = data.state as DemoState;
      setDemoState(state);
      if (state === "completed") {
        addLog("Demo completed successfully!", "success");
        stopTimer();
      }
    });

    es.addEventListener("stepStart", (e) => {
      const data = JSON.parse(e.data);
      setCurrentStepIndex(data.index);
      setStepBusy(true);
      addLog(`[Step ${data.index + 1}] ${data.label}`, "step");
    });

    es.addEventListener("stepComplete", (e) => {
      const data = JSON.parse(e.data);
      setStepBusy(false);
      setCompletedSteps((prev) => new Set([...prev, data.index]));
    });

    es.addEventListener("stepError", (e) => {
      const data = JSON.parse(e.data);
      setStepBusy(false);
      addLog(`Step error: ${data.error}`, "error");
    });

    es.addEventListener("roomCode", (e) => {
      const data = JSON.parse(e.data);
      setRoomCode(data.code);
      addLog(`Room created: ${data.code}`, "success");
    });

    es.addEventListener("log", (e) => {
      const data = JSON.parse(e.data);
      addLog(data.message, "info");
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        addLog(`Error: ${data.message}`, "error");
      } catch {
        addLog("Connection error", "error");
      }
      setDemoState("error");
    });

    es.addEventListener("done", () => {
      setDemoState((prev) => (prev === "running" || prev === "stepping" ? "completed" : prev));
      stopTimer();
      es.close();
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setDemoState((prev) => {
          if (prev === "running" || prev === "stepping" || prev === "paused") return "error";
          return prev;
        });
        stopTimer();
      }
    };
  }, [selectedScenario, speed, playMode, cleanup, addLog, startTimer, stopTimer]);

  const sendControl = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    try {
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
    } catch {
      addLog(`Failed to send ${action} command`, "error");
    }
  }, [addLog]);

  const stopDemo = useCallback(async () => {
    try {
      await fetch("/api/demo", { method: "DELETE" });
    } catch {
      // best-effort
    }
    cleanup();
    setDemoState("idle");
    addLog("Demo stopped", "info");
    stopTimer();
  }, [cleanup, addLog, stopTimer]);

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      if (demoState === "running" || demoState === "paused" || demoState === "stepping") {
        sendControl("setSpeed", { speed: newSpeed });
      }
    },
    [demoState, sendControl]
  );

  const isActive = demoState === "running" || demoState === "paused" || demoState === "stepping";

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const scenarioMeta = SCENARIOS.find((s) => s.id === selectedScenario);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Demo Control Panel</h1>
          <p className="text-gray-400">
            Configure and run interactive demos of the quiz platform
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Config + Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Scenario Picker */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Scenario</h2>
              <div className="space-y-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => !isActive && setSelectedScenario(s.id)}
                    disabled={isActive}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedScenario === s.id
                        ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    } ${isActive ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.mode === "individual"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {s.mode}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 font-medium">
                        {s.scoringMode}
                      </span>
                    </div>
                    <div className="font-medium text-sm text-white">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Control */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Speed</h2>
              <div className="space-y-3">
                <input
                  type="range"
                  min="0.25"
                  max="5"
                  step="0.25"
                  value={speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.25x</span>
                  <span className="text-indigo-400 font-semibold text-sm">{speed}x</span>
                  <span>5x</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[0.5, 1, 1.5, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        speed === s
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Play Mode */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Play Mode</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => !isActive && setPlayMode("auto")}
                  disabled={isActive}
                  className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                    playMode === "auto"
                      ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  } ${isActive ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="text-lg mb-1">&#9654;</div>
                  <div className="text-sm font-medium text-white">Auto</div>
                  <div className="text-xs text-gray-400">Runs continuously</div>
                </button>
                <button
                  onClick={() => !isActive && setPlayMode("step")}
                  disabled={isActive}
                  className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                    playMode === "step"
                      ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                      : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  } ${isActive ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="text-lg mb-1">&#9197;</div>
                  <div className="text-sm font-medium text-white">Step</div>
                  <div className="text-xs text-gray-400">Manual advance</div>
                </button>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">Controls</h2>
              <div className="flex gap-2 flex-wrap">
                {!isActive ? (
                  <button
                    onClick={startDemo}
                    className="flex-1 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors text-sm"
                  >
                    Start Demo
                  </button>
                ) : (
                  <>
                    {demoState === "running" && playMode === "auto" && (
                      <button
                        onClick={() => sendControl("pause")}
                        className="flex-1 py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors text-sm"
                      >
                        Pause
                      </button>
                    )}
                    {(demoState === "paused" || demoState === "stepping" || (demoState === "running" && playMode === "step")) && (
                      <button
                        onClick={() => sendControl("resume")}
                        className="flex-1 py-2.5 px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors text-sm"
                      >
                        Resume
                      </button>
                    )}
                    {(demoState === "paused" || demoState === "stepping" || (demoState === "running" && playMode === "step")) && (
                      <button
                        onClick={() => sendControl("step")}
                        disabled={stepBusy}
                        className={`flex-1 py-2.5 px-3 rounded-lg text-white font-medium transition-colors text-sm ${
                          stepBusy
                            ? "bg-blue-600/40 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-500"
                        }`}
                      >
                        {stepBusy ? "Running..." : "Next Step"}
                      </button>
                    )}
                    {demoState === "running" && playMode === "auto" && (
                      <button
                        onClick={() => sendControl("step")}
                        className="py-2.5 px-3 rounded-lg bg-blue-600/60 hover:bg-blue-500 text-white font-medium transition-colors text-sm"
                        title="Switch to step-by-step mode"
                      >
                        Step
                      </button>
                    )}
                    <button
                      onClick={stopDemo}
                      className="py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors text-sm"
                    >
                      Stop
                    </button>
                  </>
                )}
              </div>

              {demoState === "completed" && (
                <button
                  onClick={startDemo}
                  className="w-full mt-3 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors text-sm"
                >
                  Restart Demo
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Status + Steps + Log */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Bar */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      demoState === "idle"
                        ? "bg-gray-500"
                        : demoState === "running"
                        ? "bg-green-500 animate-pulse"
                        : demoState === "paused" || demoState === "stepping"
                        ? "bg-amber-500 animate-pulse"
                        : demoState === "completed"
                        ? "bg-blue-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium text-white capitalize">{demoState}</span>
                  {scenarioMeta && (
                    <span className="text-sm text-gray-400">
                      &mdash; {scenarioMeta.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {roomCode && (
                    <span>
                      Room: <span className="text-indigo-400 font-mono font-semibold">{roomCode}</span>
                    </span>
                  )}
                  {isActive && (
                    <span>
                      Step {currentStepIndex + 1}/{steps.length}
                    </span>
                  )}
                  <span className="font-mono">{formatTime(elapsedMs)}</span>
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded">{speed}x</span>
                </div>
              </div>

              {steps.length > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${steps.length > 0 ? ((completedSteps.size / steps.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step List */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Steps
                {steps.length > 0 && (
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    ({completedSteps.size}/{steps.length})
                  </span>
                )}
              </h2>
              <div
                ref={stepListRef}
                className="space-y-1 max-h-[400px] overflow-y-auto pr-2"
              >
                {steps.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    Start a demo to see the step list
                  </p>
                ) : (
                  steps.map((step, i) => {
                    const isCompleted = completedSteps.has(i);
                    const isCurrent = i === currentStepIndex;
                    const isPending = !isCompleted && !isCurrent;

                    return (
                      <div
                        key={step.id}
                        data-step-index={i}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          isCurrent
                            ? "bg-indigo-500/15 border border-indigo-500/30"
                            : isCompleted
                            ? "bg-gray-800/30"
                            : "bg-transparent"
                        }`}
                      >
                        <div className="flex-shrink-0 w-6 text-center">
                          {isCompleted ? (
                            <span className="text-green-400 text-sm">&#10003;</span>
                          ) : isCurrent ? (
                            <span className="text-indigo-400 text-sm animate-pulse">&#9679;</span>
                          ) : (
                            <span className="text-gray-600 text-xs">{i + 1}</span>
                          )}
                        </div>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            ACTOR_COLORS[step.actor] || "bg-gray-500"
                          } text-white`}
                        >
                          {ACTOR_LABELS[step.actor] || step.actor}
                        </span>
                        <span
                          className={`text-sm ${
                            isPending ? "text-gray-500" : isCompleted ? "text-gray-400" : "text-white font-medium"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Log */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Live Log</h2>
                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="bg-gray-950 rounded-lg p-3 max-h-[300px] overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">Waiting for demo to start...</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-2 py-0.5">
                      <span className="text-gray-600 flex-shrink-0">{log.time}</span>
                      <span
                        className={
                          log.type === "error"
                            ? "text-red-400"
                            : log.type === "success"
                            ? "text-green-400"
                            : log.type === "step"
                            ? "text-indigo-400"
                            : "text-gray-400"
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
