import { handleApiError, ok } from "@/lib/api";
import { adapterFor } from "@/lib/crawler";
import { SourceInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const input = SourceInput.parse(await request.json());
    const source = {
      id: "test",
      name: input.name,
      type: input.type,
      baseUrl: input.baseUrl,
      feedUrl: input.feedUrl || null,
      sitemapUrl: input.sitemapUrl || null,
      apiUrl: input.apiUrl || null,
      listUrl: input.listUrl || null,
      interval: input.interval,
      enabled: input.enabled,
      archived: false,
      webhookSecretHash: null,
      userAgent: null,
      respectRobotsTxt: true,
      initialCrawlMode: "LATEST_20",
      lastCrawledAt: null,
      lastSuccessAt: null,
      recentArticleCount: 0,
      recentError: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const adapter = adapterFor(source.type);
    const payload = await adapter.fetch(source);
    const articles = await adapter.parse(payload, source);
    return ok({ count: articles.length, articles: articles.slice(0, 20) });
  } catch (error) {
    return handleApiError(error);
  }
}
