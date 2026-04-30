import IORedis, { type Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function buildRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    // Avoid crashing dev when Redis isn't configured. Returns a disconnected
    // client; callers should guard with isRedisAvailable() if they care.
    return new IORedis({ lazyConnect: true, maxRetriesPerRequest: null });
  }
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export const redis = globalForRedis.redis ?? buildRedis();
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

export function isRedisAvailable() {
  return Boolean(process.env.REDIS_URL);
}
