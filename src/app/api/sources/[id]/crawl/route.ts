import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enqueueCrawler } from "@/lib/queue/queues";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) return fail("NOT_FOUND", "采集源不存在", 404);
    await enqueueCrawler(id, true);
    return ok({ queued: true });
  } catch (error) {
    return handleApiError(error);
  }
}
