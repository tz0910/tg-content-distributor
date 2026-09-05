import axios from "axios";
import * as cheerio from "cheerio";
import type { Source } from "@prisma/client";
import type { NormalizedArticle } from "./types";
import { appEnv } from "@/lib/env";
import { normalizeUrl } from "@/lib/utils/url";
import { excerptFrom, stripHtml } from "@/lib/utils/text";

function firstMeta($: cheerio.CheerioAPI, selectors: string[]) {
  for (const selector of selectors) {
    const node = $(selector).first();
    const value =
      node.attr("content") ||
      node.attr("href") ||
      node.attr("src") ||
      node.attr("data-src") ||
      node.attr("data-original") ||
      node.attr("data-lazy-src") ||
      firstSrcsetUrl(node.attr("srcset") || node.attr("data-srcset"));
    if (value) return value.trim();
  }
  return undefined;
}

function firstSrcsetUrl(value?: string) {
  return value
    ?.split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .find(Boolean);
}

function imageFromJsonLd($: cheerio.CheerioAPI) {
  const scripts = $('script[type="application/ld+json"]')
    .map((_, element) => $(element).text())
    .get();

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const image = (item as Record<string, unknown>).image;
        if (typeof image === "string") return image;
        if (Array.isArray(image) && typeof image[0] === "string") return image[0];
        if (image && typeof image === "object" && typeof (image as Record<string, unknown>).url === "string") {
          return String((image as Record<string, unknown>).url);
        }
      }
    } catch {
      continue;
    }
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
        'meta[property="og:image:url"]',
        'meta[property="og:image:secure_url"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[property="twitter:image"]',
        'link[rel="image_src"]',
        ".wp-post-image",
        ".post-thumbnail img",
        ".entry-content img",
        ".article-content img",
        "article img",
        "main img",
        "img"
      ]) ||
      imageFromJsonLd($);
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
