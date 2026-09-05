import axios from "axios";
import * as cheerio from "cheerio";
import type { Source } from "@prisma/client";
import type { NormalizedArticle } from "./types";
import { appEnv } from "@/lib/env";
import { normalizeUrl } from "@/lib/utils/url";
import { excerptFrom, stripHtml } from "@/lib/utils/text";

function firstMeta($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const value = $(selector).attr("content") || $(selector).attr("href") || $(selector).attr("src");
    if (value) return value.trim();
  }
  return undefined;
}

export async function enrichArticleFromDetailPage(article: NormalizedArticle, source: Source) {
  if (article.coverUrl && article.content && article.excerpt) return article;

  try {
    const { data } = await axios.get<string>(article.url, {
      timeout: 12_000,
      maxRedirects: 3,
      headers: { "User-Agent": source.userAgent || appEnv.crawlerUserAgent }
    });
    const $ = cheerio.load(data);
    $("script,style,iframe,noscript").remove();

    const cover =
      article.coverUrl ||
      firstMeta($, [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
        'link[rel="image_src"]',
        "article img",
        "main img",
        "img"
      ]);
    const title = article.title || firstMeta($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) || $("h1").first().text().trim();
    const description =
      article.excerpt ||
      firstMeta($, ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']);
    const contentNode = $("article").first().length ? $("article").first() : $("main").first();
    const content = article.content || stripHtml(contentNode.text()).slice(0, 20_000);

    return {
      ...article,
      title: title || article.title,
      coverUrl: cover ? normalizeUrl(cover, source.baseUrl) : article.coverUrl,
      excerpt: description || excerptFrom(content, 180) || article.excerpt,
      content: content || article.content,
      contentExtraction: article.contentExtraction || (content ? "FALLBACK" : undefined)
    };
  } catch {
    return article;
  }
}
