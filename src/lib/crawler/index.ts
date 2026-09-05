import type { Source, SourceType } from "@prisma/client";
import { RSSAdapter } from "./rss";
import { SitemapAdapter } from "./sitemap";
import { HTMLAdapter } from "./html";
import { APIAdapter } from "./api";
import type { CrawlerAdapter, NormalizedArticle } from "./types";
import { prisma } from "@/lib/db";
import { contentHash, sha256, titleHash } from "@/lib/utils/hash";
import { normalizeUrl } from "@/lib/utils/url";
import { matchesRoute } from "@/lib/services/routes";
import { enqueuePublishTask } from "@/lib/queue/queues";
import { enrichArticleFromDetailPage } from "./detail";

export function adapterFor(type: SourceType): CrawlerAdapter {
  if (type === "RSS") return new RSSAdapter();
  if (type === "SITEMAP") return new SitemapAdapter();
  if (type === "HTML" || type === "DYNAMIC_HTML") return new HTMLAdapter();
  if (type === "API") return new APIAdapter();
  throw new Error(`不支持直接轮询 ${type} 来源，请使用 Webhook API 写入。`);
}

export async function crawlSource(source: Source) {
  const adapter = adapterFor(source.type);
  const startedAt = new Date();
  const log = await prisma.crawlLog.create({ data: { sourceId: source.id, startedAt } });

  let discovered = 0;
  let inserted = 0;
  let duplicated = 0;

  try {
    const payload = await adapter.fetch(source);
    const parsed = await adapter.parse(payload, source);
    discovered = parsed.length;

    for (const item of parsed) {
      const result = await upsertArticle(source, item);
      if (result.inserted) inserted += 1;
      else duplicated += 1;
    }

    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastCrawledAt: new Date(),
        lastSuccessAt: new Date(),
        recentArticleCount: inserted,
        recentError: null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "采集失败";
    await prisma.source.update({
      where: { id: source.id },
      data: { lastCrawledAt: new Date(), recentError: message }
    });
    await prisma.systemLog.create({ data: { level: "ERROR", scope: "Crawler Error", message, meta: { sourceId: source.id } } });
    throw error;
  } finally {
    await prisma.crawlLog.update({
      where: { id: log.id },
      data: {
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        discovered,
        inserted,
        duplicated
      }
    });
  }

  return { discovered, inserted, duplicated };
}

export async function upsertArticle(source: Source, item: NormalizedArticle) {
  const enriched = source.type === "WEBHOOK" ? item : await enrichArticleFromDetailPage(item, source);
  const url = normalizeUrl(enriched.url, source.baseUrl);
  const canonicalUrl = enriched.canonicalUrl ? normalizeUrl(enriched.canonicalUrl, source.baseUrl) : url;
  const urlHash = sha256(canonicalUrl || url);
  const data = {
    sourceId: source.id,
    externalId: enriched.externalId,
    title: enriched.title,
    url,
    canonicalUrl,
    urlHash,
    titleHash: titleHash(enriched.title, enriched.publishedAt),
    contentHash: contentHash(enriched.content),
    excerpt: enriched.excerpt,
    content: enriched.content,
    coverUrl: enriched.coverUrl,
    author: enriched.author,
    category: enriched.category,
    tags: enriched.tags || [],
    publishedAt: enriched.publishedAt,
    rawData: enriched.rawData as object,
    contentExtraction: enriched.contentExtraction,
    status: "NEW" as const
  };

  const existing = await prisma.article.findFirst({
    where: {
      OR: [
        { urlHash },
        enriched.externalId ? { sourceId: source.id, externalId: enriched.externalId } : undefined,
        { canonicalUrl }
      ].filter(Boolean) as never
    }
  });

  if (existing) return { inserted: false, article: existing };

  const article = await prisma.article.create({ data });
  await createPublishTasks(article.id);
  return { inserted: true, article };
}

export async function createPublishTasks(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) return [];
  const routes = await prisma.routeRule.findMany({
    where: { enabled: true },
    include: { channel: true, template: true }
  });
  const matched = routes.filter((route) => matchesRoute(article, route));
  const tasks = [];

  for (const route of matched) {
    const task = await prisma.publishTask.upsert({
      where: { articleId_channelId_republishVersion: { articleId, channelId: route.channelId, republishVersion: 0 } },
      update: {},
      create: {
        articleId,
        channelId: route.channelId,
        templateId: route.templateId,
        idempotencyKey: `${articleId}:${route.channelId}:0`,
        scheduledAt: new Date()
      }
    });
    await enqueuePublishTask(task.id);
    tasks.push(task);
  }

  if (tasks.length) {
    await prisma.article.update({ where: { id: articleId }, data: { status: "QUEUED" } });
  } else {
    await prisma.article.update({ where: { id: articleId }, data: { status: "READY" } });
  }
  return tasks;
}
