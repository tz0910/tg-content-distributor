import bcrypt from "bcryptjs";
import { fail, handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { upsertArticle } from "@/lib/crawler";
import { WebhookArticleInput } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { sourceId } = await params;
    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (!source || source.type !== "WEBHOOK") return fail("NOT_FOUND", "Webhook 来源不存在", 404);

    const secret = request.headers.get("x-webhook-secret") || "";
    if (source.webhookSecretHash) {
      const valid = await bcrypt.compare(secret, source.webhookSecretHash);
      if (!valid) return fail("UNAUTHORIZED", "Webhook Secret 不正确", 401);
    }

    const input = WebhookArticleInput.parse(await request.json());
    const result = await upsertArticle(source, {
      externalId: input.externalId,
      title: input.title,
      url: input.url,
      excerpt: input.excerpt,
      content: input.content,
      coverUrl: input.cover,
      category: input.category,
      tags: input.tags,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
      rawData: input
    });
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
