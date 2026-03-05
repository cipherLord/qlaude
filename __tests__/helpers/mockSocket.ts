type EmitRecord = { event: string; args: unknown[] };

export interface MockSocket {
  id: string;
  data: Record<string, unknown>;
  emit: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
  to: jest.Mock;
  emitted: EmitRecord[];
}

export interface MockIO {
  to: jest.Mock;
  in: jest.Mock;
  emit: jest.Mock;
}

export function createMockSocket(userId: string): MockSocket {
  const emitted: EmitRecord[] = [];

  const socket: MockSocket = {
    id: `socket-${userId}`,
    data: { userId },
    emit: jest.fn((...args: unknown[]) => {
      emitted.push({ event: args[0] as string, args: args.slice(1) });
    }),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn(),
    emitted,
  };

  const toEmit = jest.fn((...args: unknown[]) => {
    emitted.push({ event: args[0] as string, args: args.slice(1) });
  });
  socket.to.mockReturnValue({ emit: toEmit });

  return socket;
}

export function createMockIO(): MockIO & { _roomEmits: EmitRecord[] } {
  const roomEmits: EmitRecord[] = [];

  const toEmit = jest.fn((...args: unknown[]) => {
    roomEmits.push({ event: args[0] as string, args: args.slice(1) });
  });

  const ioTo = jest.fn().mockReturnValue({ emit: toEmit });

  const fetchSocketsResult: MockSocket[] = [];
  const ioIn = jest.fn().mockReturnValue({
    emit: toEmit,
    fetchSockets: jest.fn().mockResolvedValue(fetchSocketsResult),
  });

  const io = {
    to: ioTo,
    in: ioIn,
    emit: jest.fn(),
    _roomEmits: roomEmits,
    _fetchSocketsResult: fetchSocketsResult,
  };

  return io as unknown as MockIO & { _roomEmits: EmitRecord[] };
}

export function getEmitted(socket: MockSocket, event: string): unknown[] {
  return socket.emitted.filter((e) => e.event === event).map((e) => e.args[0]);
}

export function getRoomEmits(io: MockIO & { _roomEmits: EmitRecord[] }, event: string): unknown[] {
  return io._roomEmits.filter((e) => e.event === event).map((e) => e.args[0]);
}
