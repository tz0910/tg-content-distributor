import { describe, expect, it } from "vitest";
import { enrichArticleFromDetailPage } from "@/lib/crawler/detail";

describe("detail page enrichment", () => {
  it("leaves already complete articles unchanged", async () => {
    const article = {
      title: "Ready",
      url: "https://example.com/a",
      coverUrl: "https://example.com/a.jpg",
      content: "body",
      excerpt: "short"
    };
    const result = await enrichArticleFromDetailPage(article, {
      id: "s1",
      name: "Example",
      type: "RSS",
      baseUrl: "https://example.com",
      feedUrl: null,
      sitemapUrl: null,
      apiUrl: null,
      listUrl: null,
      interval: 5,
      enabled: true,
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
    });
    expect(result).toEqual(article);
  });
});
