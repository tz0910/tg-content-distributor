import IORedis from "ioredis";
import { appEnv } from "@/lib/env";

const globalForRedis = globalThis as unknown as { redis?: IORedis };

export function getRedis() {
  const client =
    globalForRedis.redis ??
    new IORedis(appEnv.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = client;
  }

  return client;
}
