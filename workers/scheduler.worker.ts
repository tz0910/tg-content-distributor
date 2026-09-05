import { enqueueCrawler } from "@/lib/queue/queues";
import { prisma } from "@/lib/db";

async function tick() {
  const sources = await prisma.source.findMany({ where: { enabled: true, archived: false } });
  const now = Date.now();
  for (const source of sources) {
    const last = source.lastCrawledAt?.getTime() || 0;
    const intervalMs = Math.max(1, source.interval) * 60_000;
    if (now - last >= intervalMs) {
      await enqueueCrawler(source.id);
    }
  }
}

if (require.main === module) {
  console.log("scheduler worker started");
  tick().catch(console.error);
  setInterval(() => tick().catch(console.error), 60_000);
}
