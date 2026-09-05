import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRedis } from "@/lib/queue/redis";

export async function GET() {
  const [db, redisStatus] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, getRedis().ping()]);
  return ok({
    database: db.status === "fulfilled" ? "ok" : "error",
    redis: redisStatus.status === "fulfilled" ? "ok" : "error",
    worker: "queue-configured",
    timestamp: new Date().toISOString()
  });
}
