import { Queue } from "bullmq";
import { getRedis } from "./redis";

export type CrawlerJob = { sourceId: string; manual?: boolean };
export type TelegramPublishJob = { taskId: string };

function getCrawlerQueue() {
  return new Queue<CrawlerJob>("crawler", {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 1000,
    removeOnFail: 1000
  }
});
}

function getTelegramQueue() {
  return new Queue<TelegramPublishJob>("telegram-publish", {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: 1000,
    removeOnFail: 1000
  }
});
}

export async function enqueueCrawler(sourceId: string, manual = false) {
  return getCrawlerQueue().add(`crawl:${sourceId}`, { sourceId, manual }, { jobId: `crawl:${sourceId}:${Date.now()}` });
}

export async function enqueuePublishTask(taskId: string, delay = 0) {
  return getTelegramQueue().add(`publish:${taskId}`, { taskId }, { jobId: `publish:${taskId}`, delay });
}
