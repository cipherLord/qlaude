/**
 * Creates a test harness for the quiz socket handler.
 * Registers event handlers and provides a way to invoke them directly.
 */

type HandlerFn = (...args: unknown[]) => Promise<void> | void;

export interface TestSocket {
  id: string;
  data: Record<string, unknown>;
  emit: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
  to: jest.Mock;
  handlers: Map<string, HandlerFn>;
  on: jest.Mock;
  invoke: (event: string, payload?: unknown, ack?: unknown) => Promise<void>;
}

export interface TestIO {
  to: jest.Mock;
  in: jest.Mock;
  emit: jest.Mock;
  _roomEmitted: Array<{ event: string; data: unknown }>;
  _sockets: TestSocket[];
  addSocketForFetch: (socket: TestSocket) => void;
}

export function createTestSocket(userId: string): TestSocket {
  const handlers = new Map<string, HandlerFn>();

  const socket: TestSocket = {
    id: `socket-${userId}-${Math.random().toString(36).slice(2, 6)}`,
    data: { userId },
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn(),
    handlers,
    on: jest.fn((event: string, handler: HandlerFn) => {
      handlers.set(event, handler);
    }),
    invoke: async (event: string, payload?: unknown, ack?: unknown) => {
      const handler = handlers.get(event);
      if (!handler) throw new Error(`No handler for event: ${event}`);
      if (ack !== undefined) {
        await handler(payload, ack);
      } else if (payload !== undefined) {
        await handler(payload);
      } else {
        await handler();
      }
    },
  };

  const toReturn = { emit: jest.fn() };
  socket.to.mockReturnValue(toReturn);

  return socket;
}

export function createTestIO(): TestIO {
  const roomEmitted: Array<{ event: string; data: unknown }> = [];
  const sockets: TestSocket[] = [];

  const toEmit = jest.fn((event: string, data: unknown) => {
    roomEmitted.push({ event, data });
  });

  const io: TestIO = {
    to: jest.fn().mockReturnValue({ emit: toEmit }),
    in: jest.fn().mockReturnValue({
      emit: toEmit,
      fetchSockets: jest.fn(async () => sockets),
    }),
    emit: jest.fn(),
    _roomEmitted: roomEmitted,
    _sockets: sockets,
    addSocketForFetch: (socket: TestSocket) => {
      sockets.push(socket);
    },
  };

  return io;
}

export function getSocketEmits(socket: TestSocket, event: string): unknown[] {
  return socket.emit.mock.calls
    .filter((call: unknown[]) => call[0] === event)
    .map((call: unknown[]) => call[1]);
}

export function getIOEmits(io: TestIO, event: string): unknown[] {
  return io._roomEmitted
    .filter((e) => e.event === event)
    .map((e) => e.data);
}

export async function registerHandler(
  io: TestIO,
  socket: TestSocket
): Promise<void> {
  const { registerQuizHandlers } = await import(
    "../../src/socket/handlers/quiz.mjs"
  );
  registerQuizHandlers(io, socket);
}
