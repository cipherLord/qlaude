import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import { generateUser, registerUserViaAPI, type TestUser } from "../helpers/auth";
import { getScenarioById, type DemoPages } from "./scenarios";
import { getRoleBorderCSS, getColor, getLabel } from "./tiling";
import {
  injectHighlight,
  removeHighlight,
  showStepBanner,
  removeAllOverlays,
} from "./highlights";

interface RunnerConfig {
  scenarioId: string;
  speed: number;
  mode: "auto" | "step";
  baseURL: string;
}

interface IPCMessage {
  type: "start" | "pause" | "resume" | "step" | "stop" | "setSpeed";
  speed?: number;
}

function emit(type: string, data: Record<string, unknown> = {}) {
  const msg = JSON.stringify({ type, ...data });
  process.stdout.write(msg + "\n");
}

let paused = false;
let stepping = false;
let stopped = false;
let currentSpeed = 1;
let resumeResolve: (() => void) | null = null;
// Counts "step" signals received while the runner is busy (not waiting).
// When the runner reaches the checkpoint, it drains one token instead of blocking.
let pendingStepTokens = 0;

function getStepDelay(): number {
  const base = 2000;
  return Math.round(base / currentSpeed);
}

async function checkpoint(): Promise<void> {
  if (stopped) throw new Error("STOPPED");

  // In auto mode with no pause request, just continue
  if (!paused && !stepping) return;

  // If a "step" signal arrived while we were busy, consume it and proceed
  if (stepping && pendingStepTokens > 0) {
    pendingStepTokens--;
    emit("status", { state: "stepping" });
    return;
  }

  emit("status", { state: "paused" });
  return new Promise<void>((resolve) => {
    resumeResolve = () => {
      resumeResolve = null;
      resolve();
    };
  });
}

function handleMessage(msg: IPCMessage) {
  switch (msg.type) {
    case "pause":
      paused = true;
      stepping = false;
      pendingStepTokens = 0;
      if (!resumeResolve) emit("status", { state: "paused" });
      break;
    case "resume":
      paused = false;
      stepping = false;
      pendingStepTokens = 0;
      if (resumeResolve) {
        resumeResolve();
      }
      emit("status", { state: "running" });
      break;
    case "step":
      paused = false;
      stepping = true;
      if (resumeResolve) {
        // Runner is waiting -- wake it up immediately
        resumeResolve();
      } else {
        // Runner is busy executing a step -- queue a token so it
        // doesn't block when it reaches the next checkpoint
        pendingStepTokens++;
      }
      emit("status", { state: "stepping" });
      break;
    case "stop":
      stopped = true;
      paused = false;
      stepping = false;
      pendingStepTokens = 0;
      if (resumeResolve) resumeResolve();
      break;
    case "setSpeed":
      if (msg.speed && msg.speed > 0) {
        currentSpeed = msg.speed;
        emit("speedChanged", { speed: currentSpeed });
      }
      break;
  }
}

process.stdin.setEncoding("utf-8");
let inputBuffer = "";
process.stdin.on("data", (chunk: string) => {
  inputBuffer += chunk;
  const lines = inputBuffer.split("\n");
  inputBuffer = lines.pop() || "";
  for (const line of lines) {
    if (line.trim()) {
      try {
        handleMessage(JSON.parse(line));
      } catch {
        // skip malformed messages
      }
    }
  }
});

async function createUserContext(
  browser: Browser,
  baseURL: string,
  role: string
): Promise<{ context: BrowserContext; page: Page; user: TestUser }> {
  const user = generateUser(role);
  const context = await browser.newContext({ baseURL });
  const request = context.request;
  await registerUserViaAPI(request, user);
  const page = await context.newPage();
  await page.addStyleTag({ content: getRoleBorderCSS(role) });
  return { context, page, user };
}

async function run() {
  const configLine = process.argv[2];
  if (!configLine) {
    emit("error", { message: "No config provided" });
    process.exit(1);
  }

  let config: RunnerConfig;
  try {
    config = JSON.parse(configLine);
  } catch {
    emit("error", { message: "Invalid config JSON" });
    process.exit(1);
  }

  currentSpeed = config.speed || 1;
  if (config.mode === "step") {
    stepping = true;
  }

  const scenario = getScenarioById(config.scenarioId);
  if (!scenario) {
    emit("error", { message: `Scenario not found: ${config.scenarioId}` });
    process.exit(1);
  }

  emit("scenarioInfo", {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    totalSteps: scenario.steps.length,
    steps: scenario.steps.map((s) => ({
      id: s.id,
      label: s.label,
      actor: s.actor,
    })),
  });

  const browser = await chromium.launch({
    headless: false,
    slowMo: Math.round(100 / currentSpeed),
  });

  const contexts: BrowserContext[] = [];
  const pages: Record<string, Page> = {};
  let roomCode = "";

  try {
    for (const role of scenario.actors) {
      const { context, page } = await createUserContext(
        browser,
        config.baseURL,
        role
      );
      contexts.push(context);
      pages[role] = page;

      emit("log", { message: `${getLabel(role)} tab ready` });
    }

    const demoPages: DemoPages = {
      qm: pages.qm,
      player1: pages.player1 || pages.qm,
      player2: pages.player2 || pages.qm,
      cap1: pages.cap1 || pages.qm,
      cap2: pages.cap2 || pages.qm,
      cap3: pages.cap3 || pages.qm,
      roomCode: "",
      setRoomCode: (code: string) => {
        roomCode = code;
        demoPages.roomCode = code;
        emit("roomCode", { code });
      },
    };

    emit("status", { state: "running" });

    for (let i = 0; i < scenario.steps.length; i++) {
      if (stopped) break;

      const step = scenario.steps[i];
      const actorPage = pages[step.actor];

      emit("stepStart", {
        index: i,
        id: step.id,
        label: step.label,
        actor: step.actor,
      });

      // Bring the actor's tab to the front so the user sees the right context
      if (actorPage) {
        try {
          await actorPage.bringToFront();
        } catch {
          // best-effort
        }
      }

      if (actorPage && step.highlight) {
        try {
          await injectHighlight(
            actorPage,
            step.highlight.selector,
            step.highlight.annotation
          );
        } catch {
          // highlight injection is best-effort
        }
      }

      try {
        await showStepBanner(
          actorPage || pages.qm,
          step.label,
          getLabel(step.actor),
          getColor(step.actor)
        );
      } catch {
        // banner injection is best-effort
      }

      let stepFailed = false;
      try {
        await step.action(demoPages);
      } catch (err) {
        stepFailed = true;
        if (stopped) break;
        const message = err instanceof Error ? err.message : String(err);
        emit("stepError", { index: i, id: step.id, error: message });
      }

      if (actorPage) {
        try {
          await removeHighlight(actorPage);
        } catch {
          // cleanup is best-effort
        }
      }

      emit("stepComplete", { index: i, id: step.id, failed: stepFailed });

      if (stopped) break;

      // In auto mode, wait the configured delay between steps.
      // In step mode, skip the delay -- the user controls pacing via checkpoint.
      if (!stepping && !paused) {
        const delay = getStepDelay();
        await new Promise((r) => setTimeout(r, delay));
      }

      // Single checkpoint handles both stepping and paused states
      await checkpoint();
    }

    for (const role of Object.keys(pages)) {
      try {
        await removeAllOverlays(pages[role]);
      } catch {
        // cleanup is best-effort
      }
    }

    emit("status", { state: "completed" });

    if (!stopped) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit("error", { message });
  } finally {
    for (const ctx of contexts) {
      await ctx.close().catch(() => {});
    }
    await browser.close().catch(() => {});
    emit("done", {});
    process.exit(0);
  }
}

run().catch((err) => {
  emit("error", { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
