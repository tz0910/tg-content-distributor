import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrichArticleFromDetailPage, enrichArticleFromListPage } from "@/lib/crawler/detail";
import { contentHash } from "@/lib/utils/hash";
import type { NormalizedArticle } from "@/lib/crawler/types";

async function main() {
  const force = process.argv.includes("--force");
  const articles = await prisma.article.findMany({
    where: force
      ? { deletedAt: null }
      : { deletedAt: null, OR: [{ coverUrl: null }, { coverUrls: { equals: Prisma.JsonNull } }, { excerpt: null }, { content: null }] },
    include: { source: true },
    take: 200,
    orderBy: { discoveredAt: "desc" }
  });

  let updated = 0;
  for (const article of articles) {
    const input: NormalizedArticle = {
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
    const enriched = await enrichArticleFromDetailPage(await enrichArticleFromListPage(input, article.source), article.source);
    const next = {
      coverUrl: force ? enriched.coverUrl || article.coverUrl : enriched.coverUrl || article.coverUrl,
      coverUrls: force ? enriched.coverUrls || (Array.isArray(article.coverUrls) ? article.coverUrls.map(String) : undefined) : enriched.coverUrls || (Array.isArray(article.coverUrls) ? article.coverUrls.map(String) : undefined),
      excerpt: article.excerpt || enriched.excerpt,
      content: article.content || enriched.content,
      contentHash: article.contentHash || contentHash(enriched.content),
      contentExtraction: article.contentExtraction || enriched.contentExtraction
    };

    if (
      next.coverUrl !== article.coverUrl ||
      next.coverUrls !== article.coverUrls ||
      next.excerpt !== article.excerpt ||
      next.content !== article.content ||
      next.contentHash !== article.contentHash ||
      next.contentExtraction !== article.contentExtraction
    ) {
      await prisma.article.update({ where: { id: article.id }, data: next });
      updated += 1;
      console.log(`updated ${article.id} ${article.title}`);
    }
  }

  console.log(`checked=${articles.length} updated=${updated}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
