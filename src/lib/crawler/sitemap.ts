import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import type { Source } from "@prisma/client";
import type { CrawlerAdapter, NormalizedArticle } from "./types";
import { normalizeUrl } from "@/lib/utils/url";

type SitemapUrl = { loc: string; lastmod?: string };

export class SitemapAdapter implements CrawlerAdapter {
  private xml = new XMLParser({ ignoreAttributes: false });

  async fetch(source: Source) {
    const sitemapUrl = source.sitemapUrl || new URL("/sitemap.xml", source.baseUrl).toString();
    const { data } = await axios.get<string>(sitemapUrl, { timeout: 15_000 });
    return data;
  }

  async parse(payload: string, source: Source) {
    const urls = await this.extractUrls(payload, source);
    const limited = this.applyInitialMode(urls, source.initialCrawlMode);
    return Promise.all(limited.map((item) => this.normalize(item, source)));
  }

  async normalize(item: SitemapUrl, source: Source): Promise<NormalizedArticle> {
    const url = normalizeUrl(item.loc, source.baseUrl);
    return {
      externalId: url,
      title: url.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") || url,
      url,
      canonicalUrl: url,
      publishedAt: item.lastmod ? new Date(item.lastmod) : undefined,
      rawData: item
    };
  }

  private async extractUrls(xml: string, source: Source): Promise<SitemapUrl[]> {
    const parsed = this.xml.parse(xml);
    if (parsed.sitemapindex?.sitemap) {
      const sitemaps = Array.isArray(parsed.sitemapindex.sitemap) ? parsed.sitemapindex.sitemap : [parsed.sitemapindex.sitemap];
      const chunks = await Promise.all(
        sitemaps.slice(0, 20).map(async (item: SitemapUrl) => {
          const { data } = await axios.get<string>(item.loc, { timeout: 15_000 });
          return this.extractUrls(data, source);
        })
      );
      return chunks.flat();
    }

    const list = parsed.urlset?.url ? (Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url]) : [];
    return list.filter((item: SitemapUrl) => item.loc);
  }

  private applyInitialMode(urls: SitemapUrl[], mode: string) {
    const sorted = [...urls].sort((a, b) => new Date(b.lastmod || 0).getTime() - new Date(a.lastmod || 0).getTime());
    if (mode === "ALL") return sorted;
    if (mode === "RECENT_24H") return sorted.filter((item) => Date.now() - new Date(item.lastmod || 0).getTime() <= 86_400_000);
    if (mode === "RECENT_7D") return sorted.filter((item) => Date.now() - new Date(item.lastmod || 0).getTime() <= 604_800_000);
    return sorted.slice(0, 20);
  }
}
