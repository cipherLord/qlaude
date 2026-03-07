import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcess } from "child_process";
import path from "path";

let activeRunner: ChildProcess | null = null;

function killActiveRunner() {
  if (activeRunner && !activeRunner.killed) {
    activeRunner.stdin?.write(JSON.stringify({ type: "stop" }) + "\n");
    setTimeout(() => {
      if (activeRunner && !activeRunner.killed) {
        activeRunner.kill("SIGTERM");
      }
    }, 2000);
    activeRunner = null;
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const scenarioId = request.nextUrl.searchParams.get("scenario");
  const speed = parseFloat(request.nextUrl.searchParams.get("speed") || "1");
  const mode = (request.nextUrl.searchParams.get("mode") || "auto") as "auto" | "step";

  if (!scenarioId) {
    return NextResponse.json({ error: "scenario parameter required" }, { status: 400 });
  }

  killActiveRunner();

  const config = JSON.stringify({
    scenarioId,
    speed,
    mode,
    baseURL: "http://localhost:3100",
  });

  const runnerPath = path.resolve(process.cwd(), "e2e/demo/demo-runner.ts");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      const child = spawn(
        "npx",
        ["tsx", runnerPath, config],
        {
          cwd: process.cwd(),
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env },
        }
      );

      activeRunner = child;

      let stdoutBuffer = "";
      child.stdout?.on("data", (chunk: Buffer) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            send(msg.type, msg);
          } catch {
            send("log", { message: line });
          }
        }
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString().trim();
        if (text) {
          send("log", { message: `[stderr] ${text}` });
        }
      });

      child.on("close", (code) => {
        send("done", { exitCode: code });
        activeRunner = null;
        controller.close();
      });

      child.on("error", (err) => {
        send("error", { message: err.message });
        activeRunner = null;
        controller.close();
      });

      request.signal.addEventListener("abort", () => {
        killActiveRunner();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await request.json();
  const { action, speed } = body;

  if (!activeRunner || activeRunner.killed) {
    return NextResponse.json({ error: "No active demo runner" }, { status: 404 });
  }

  const message: Record<string, unknown> = { type: action };
  if (action === "setSpeed" && speed) {
    message.speed = speed;
  }

  try {
    activeRunner.stdin?.write(JSON.stringify(message) + "\n");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function DELETE() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  killActiveRunner();
  return NextResponse.json({ ok: true });
}
