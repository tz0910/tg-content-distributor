import { Worker } from "bullmq";
import { getRedis } from "@/lib/queue/redis";
import { prisma } from "@/lib/db";
import { crawlSource } from "@/lib/crawler";

export const crawlerWorker = new Worker(
  "crawler",
  async (job) => {
    const lockKey = `crawler-lock:${job.data.sourceId}`;
    const redis = getRedis();
    const locked = await redis.set(lockKey, "1", "PX", 10 * 60 * 1000, "NX");
    if (!locked) return;
    try {
      const source = await prisma.source.findUnique({ where: { id: job.data.sourceId } });
      if (!source || !source.enabled || source.archived) return;
      await crawlSource(source);
    } finally {
      await redis.del(lockKey);
    }
  },
  { connection: getRedis(), concurrency: 3 }
);

if (require.main === module) {
  console.log("crawler worker started");
}
