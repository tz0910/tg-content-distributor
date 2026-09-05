import axios from "axios";
import * as cheerio from "cheerio";
import type { CrawlRule, Source } from "@prisma/client";
import type { CrawlerAdapter, NormalizedArticle } from "./types";
import { prisma } from "@/lib/db";
import { appEnv } from "@/lib/env";
import { normalizeUrl } from "@/lib/utils/url";
import { stripHtml } from "@/lib/utils/text";

export class HTMLAdapter implements CrawlerAdapter {
  private rule?: CrawlRule;

  async fetch(source: Source) {
    this.rule = (await prisma.crawlRule.findFirst({ where: { sourceId: source.id } })) || undefined;
    const url = this.rule?.apiResultPath || source.listUrl || source.baseUrl;
    const { data } = await axios.get<string>(url, {
      timeout: 15_000,
      headers: { "User-Agent": source.userAgent || appEnv.crawlerUserAgent }
    });
    return data;
  }

  async parse(payload: string, source: Source) {
    const $ = cheerio.load(payload);
    const rule = this.rule;
    const articleSelector = rule?.articleSelector || "article";
    const articles: NormalizedArticle[] = [];

    $(articleSelector).each((_, element) => {
      const root = $(element);
      const linkNode = root.find(rule?.linkSelector || "a").first();
      const rawUrl = linkNode.attr("href");
      if (!rawUrl) return;
      const title = root.find(rule?.titleSelector || "h2,h3,a").first().text().trim() || linkNode.text().trim();
      if (!title) return;
      const imageNode = root.find(rule?.imageSelector || "img").first();
      const image = imageNode.attr("src") || imageNode.attr("data-src") || imageNode.attr("data-original");
      const timeText = root.find(rule?.timeSelector || "time").first().attr("datetime") || root.find(rule?.timeSelector || "time").first().text();
      articles.push({
        title,
        url: normalizeUrl(rawUrl, source.baseUrl),
        canonicalUrl: normalizeUrl(rawUrl, source.baseUrl),
        excerpt: root.text().replace(/\s+/g, " ").trim().slice(0, 300),
        coverUrl: image ? normalizeUrl(image, source.baseUrl) : undefined,
        publishedAt: timeText ? new Date(timeText) : undefined,
        rawData: { title, rawUrl, image, timeText }
      });
    });

    return articles;
  }

  async normalize(item: NormalizedArticle) {
    return item;
  }

  async fetchDetail(article: NormalizedArticle) {
    const rule = this.rule;
    if (!rule?.detailContentSelector) return article;
    const { data } = await axios.get<string>(article.url, { timeout: 15_000 });
    const $ = cheerio.load(data);
    $("script,style,iframe").remove();
    const selected = $(rule.detailContentSelector).first();
    const fallback = selected.length ? selected : $("article,main").first();
    return {
      ...article,
      title: $(rule.detailTitleSelector || "h1").first().text().trim() || article.title,
      content: stripHtml(fallback.html() || fallback.text()).slice(0, 20_000),
      contentExtraction: selected.length ? "SELECTOR" : "FALLBACK"
    };
  }
}
