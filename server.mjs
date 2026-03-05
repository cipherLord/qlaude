import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const pubClient = new Redis(redisUrl, { lazyConnect: true });
  const subClient = new Redis(redisUrl, { lazyConnect: true });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
    maxHttpBufferSize: 1e6,
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.IO Redis adapter connected");
    })
    .catch((err) => {
      console.warn("Redis adapter failed, using in-memory adapter:", err.message);
    });

  // Dynamically import socket handlers
  import("./src/socket/index.mjs").then(({ registerSocketHandlers }) => {
    registerSocketHandlers(io);
  });

  // Store io instance for API routes if needed
  globalThis.__io = io;

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
