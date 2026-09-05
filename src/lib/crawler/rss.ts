import Parser from "rss-parser";
import type { Source } from "@prisma/client";
import type { CrawlerAdapter, NormalizedArticle } from "./types";
import { normalizeUrl } from "@/lib/utils/url";
import { stripHtml } from "@/lib/utils/text";

type RSSItem = Parser.Item & { content?: string; contentSnippet?: string; enclosure?: { url?: string }; "content:encoded"?: string };

export class RSSAdapter implements CrawlerAdapter {
  private parser = new Parser();

  async fetch(source: Source) {
    const feedUrl = source.feedUrl || new URL("/feed", source.baseUrl).toString();
    return this.parser.parseURL(feedUrl);
  }

  async parse(payload: Parser.Output<RSSItem>, source: Source) {
    return Promise.all((payload.items || []).map((item) => this.normalize(item, source)));
  }

  async normalize(item: RSSItem, source: Source): Promise<NormalizedArticle> {
    const url = normalizeUrl(item.link || item.guid || source.baseUrl, source.baseUrl);
    const content = item.content || item["content:encoded"] || item.contentSnippet || item.summary || "";
    return {
      externalId: item.guid || url,
      title: item.title || "Untitled",
      url,
      canonicalUrl: url,
      excerpt: stripHtml(item.contentSnippet || item.summary || "").slice(0, 300),
      content: stripHtml(content).slice(0, 20_000),
      coverUrl: item.enclosure?.url,
      publishedAt: item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate || "") : undefined,
      rawData: item
    };
  }
}
