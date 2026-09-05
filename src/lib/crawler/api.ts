import axios from "axios";
import type { CrawlRule, Source } from "@prisma/client";
import type { CrawlerAdapter, NormalizedArticle } from "./types";
import { prisma } from "@/lib/db";
import { normalizeUrl } from "@/lib/utils/url";
import { stripHtml } from "@/lib/utils/text";

function getPath(input: unknown, path?: string | null) {
  if (!path) return input;
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), input);
}

export class APIAdapter implements CrawlerAdapter {
  private rule?: CrawlRule;

  async fetch(source: Source) {
    this.rule = (await prisma.crawlRule.findFirst({ where: { sourceId: source.id } })) || undefined;
    const headers = this.rule?.apiHeaders && typeof this.rule.apiHeaders === "object" ? (this.rule.apiHeaders as Record<string, string>) : {};
    const { data } = await axios.get(source.apiUrl || source.baseUrl, { timeout: 15_000, headers });
    return data;
  }

  async parse(payload: unknown, source: Source) {
    const items = getPath(payload, this.rule?.apiResultPath);
    const list = Array.isArray(items) ? items : [];
    return Promise.all(list.map((item) => this.normalize(item, source)));
  }

  async normalize(item: Record<string, unknown>, source: Source): Promise<NormalizedArticle> {
    const map = (this.rule?.apiFieldMap && typeof this.rule.apiFieldMap === "object" ? this.rule.apiFieldMap : {}) as Record<string, string>;
    const pick = (name: string) => item[map[name] || name];
    const url = normalizeUrl(String(pick("url") || pick("link") || source.baseUrl), source.baseUrl);
    return {
      externalId: pick("externalId") ? String(pick("externalId")) : url,
      title: String(pick("title") || "Untitled"),
      url,
      canonicalUrl: url,
      excerpt: pick("excerpt") ? stripHtml(String(pick("excerpt"))).slice(0, 300) : undefined,
      content: pick("content") ? stripHtml(String(pick("content"))).slice(0, 20_000) : undefined,
      coverUrl: pick("image") ? normalizeUrl(String(pick("image")), source.baseUrl) : undefined,
      category: pick("category") ? String(pick("category")) : undefined,
      tags: Array.isArray(pick("tags")) ? (pick("tags") as unknown[]).map(String) : undefined,
      publishedAt: pick("publish_time") ? new Date(String(pick("publish_time"))) : undefined,
      rawData: item
    };
  }
}
