import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

interface RedisCache {
  client: Redis | null;
}

declare global {
  // eslint-disable-next-line no-var
  var redisCache: RedisCache | undefined;
}

const cached: RedisCache = global.redisCache ?? { client: null };
global.redisCache = cached;

export function getRedisClient(): Redis {
  if (cached.client) return cached.client;

  cached.client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  cached.client.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  return cached.client;
}

export function createRedisClient(): Redis {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}
