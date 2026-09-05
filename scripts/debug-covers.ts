import { existsSync } from "node:fs";
import { prisma } from "@/lib/db";
import { enrichArticleFromDetailPage, enrichArticleFromListPage } from "@/lib/crawler/detail";
import { inspectCoverDownload, isLocalCoverUrl, localCoverFilePath } from "@/lib/services/cover-store";
import type { NormalizedArticle } from "@/lib/crawler/types";

function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function coverList(coverUrls: unknown, coverUrl?: string | null) {
  const list = Array.isArray(coverUrls) ? coverUrls.map(String) : [];
  return [...new Set([...(coverUrl ? [coverUrl] : []), ...list])].filter(Boolean);
}

function articleInput(article: Awaited<ReturnType<typeof loadArticles>>[number]): NormalizedArticle {
  return {
    externalId: article.externalId || undefined,
    title: article.title,
    url: article.url,
    canonicalUrl: article.canonicalUrl || undefined,
    excerpt: article.excerpt || undefined,
    content: article.content || undefined,
    coverUrl: article.coverUrl || undefined,
    coverUrls: Array.isArray(article.coverUrls) ? article.coverUrls.map(String) : undefined,
    author: article.author || undefined,
    category: article.category || undefined,
    tags: Array.isArray(article.tags) ? article.tags.map(String) : undefined,
    publishedAt: article.publishedAt || undefined,
    rawData: article.rawData || undefined,
    contentExtraction: article.contentExtraction === "SELECTOR" || article.contentExtraction === "FALLBACK" ? article.contentExtraction : undefined
  };
}

async function loadArticles(limit: number) {
  return prisma.article.findMany({
    where: { deletedAt: null },
    include: { source: true },
    take: limit,
    orderBy: { discoveredAt: "desc" }
  });
}

async function main() {
  const limit = Number(argValue("--limit", "5"));
  const articles = await loadArticles(Number.isFinite(limit) ? limit : 5);

  console.log(`debug articles=${articles.length}`);
  for (const article of articles) {
    const dbCovers = coverList(article.coverUrls, article.coverUrl);
    const fromList = await enrichArticleFromListPage(articleInput(article), article.source);
    const enriched = await enrichArticleFromDetailPage(fromList, article.source);
    const candidates = coverList(enriched.coverUrls, enriched.coverUrl);

    console.log("\n---");
    console.log(`article=${article.id}`);
    console.log(`source=${article.source.name} type=${article.source.type}`);
    console.log(`baseUrl=${article.source.baseUrl}`);
    console.log(`listUrl=${article.source.listUrl || "(empty)"}`);
    console.log(`url=${article.url}`);
    console.log(`dbCovers=${dbCovers.length ? dbCovers.join(" | ") : "(none)"}`);
    console.log(`parsedCovers=${candidates.length ? candidates.join(" | ") : "(none)"}`);

    for (const url of candidates.slice(0, 5)) {
      if (isLocalCoverUrl(url)) {
        console.log(`local ${url} exists=${existsSync(localCoverFilePath(url))}`);
        continue;
      }
      try {
        const result = await inspectCoverDownload(url);
        console.log(`remote ${url}`);
        console.log(`  ${JSON.stringify(result)}`);
        if (result.ok && result.localUrl) {
          console.log(`  fileExists=${existsSync(localCoverFilePath(result.localUrl))}`);
        }
      } catch (error) {
        console.log(`remote ${url}`);
        console.log(`  error=${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
