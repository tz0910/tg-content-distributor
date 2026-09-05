import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enrichArticleFromDetailPage } from "@/lib/crawler/detail";
import { contentHash } from "@/lib/utils/hash";

async function main() {
  const articles = await prisma.article.findMany({
    where: { deletedAt: null, OR: [{ coverUrl: null }, { coverUrls: { equals: Prisma.JsonNull } }, { excerpt: null }, { content: null }] },
    include: { source: true },
    take: 200,
    orderBy: { discoveredAt: "desc" }
  });

  let updated = 0;
  for (const article of articles) {
    const enriched = await enrichArticleFromDetailPage(
      {
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
      },
      article.source
    );
    const next = {
      coverUrl: enriched.coverUrl || article.coverUrl,
      coverUrls: enriched.coverUrls || (Array.isArray(article.coverUrls) ? article.coverUrls.map(String) : undefined),
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
