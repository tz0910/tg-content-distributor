import { describe, expect, it } from "vitest";
import { RSSAdapter } from "@/lib/crawler/rss";

describe("RSSAdapter", () => {
  it("normalizes rss items", async () => {
    const adapter = new RSSAdapter();
    const article = await adapter.normalize(
      { title: "Hello", link: "/post", guid: "1", content: "<p>Body</p>" },
      {
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
      }
    );
    expect(article.url).toBe("https://example.com/post");
    expect(article.content).toBe("Body");
  });
});
