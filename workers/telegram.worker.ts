import { Worker } from "bullmq";
import { getRedis } from "@/lib/queue/redis";
import { publishTask } from "@/lib/services/publisher";
import { enqueuePublishTask } from "@/lib/queue/queues";
import { prisma } from "@/lib/db";

const retryDelays = [60_000, 300_000, 900_000];

export const telegramWorker = new Worker(
  "telegram-publish",
  async (job) => {
    const result = await publishTask(job.data.taskId);
    if (typeof result === "object" && result && "delayedUntil" in result) {
      const delay = Math.max(0, new Date(result.delayedUntil as Date).getTime() - Date.now());
      await enqueuePublishTask(job.data.taskId, delay);
    }
  },
  { connection: getRedis(), concurrency: 2 }
);

telegramWorker.on("failed", async (job, error) => {
  if (!job) return;
  const task = await prisma.publishTask.findUnique({ where: { id: job.data.taskId } });
  if (!task || task.attempts >= 3) return;
  await enqueuePublishTask(task.id, retryDelays[Math.max(0, task.attempts - 1)] || retryDelays[2]);
  await prisma.publishTask.update({ where: { id: task.id }, data: { status: "RETRYING", lastError: error.message } });
});

if (require.main === module) {
  console.log("telegram worker started");
}
