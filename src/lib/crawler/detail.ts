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

function imagesFromJsonLd($: cheerio.CheerioAPI) {
  const images: string[] = [];
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
        if (typeof image === "string") images.push(image);
        if (Array.isArray(image)) images.push(...image.filter((value): value is string => typeof value === "string"));
        if (image && typeof image === "object" && typeof (image as Record<string, unknown>).url === "string") {
          images.push(String((image as Record<string, unknown>).url));
        }
      }
    } catch {
      continue;
    }
  }
  return images;
}

function backgroundImageUrl(value?: string) {
  const match = value?.match(/url\(["']?([^"')]+)["']?\)/i);
  return match?.[1];
}

function isLikelyContentImage(url: string) {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:")) return false;
  return !["logo", "icon", "avatar", "favicon", "placeholder", "loading", "qrcode", "wechat"].some((token) => lower.includes(token));
}

function collectImageCandidates($: cheerio.CheerioAPI, source: Source) {
  const selectors = [
    ".article-content img",
    ".entry-content img",
    ".post-content img",
    ".content img",
    "article img",
    "main img",
    ".article-content [style]",
    ".entry-content [style]",
    "article [style]",
    "main [style]"
  ];
  const images: string[] = [];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const node = $(element);
      const value =
        node.attr("data-src") ||
        node.attr("data-original") ||
        node.attr("data-lazy-src") ||
        node.attr("src") ||
        firstSrcsetUrl(node.attr("srcset") || node.attr("data-srcset")) ||
        backgroundImageUrl(node.attr("style"));
      if (value) images.push(value);
    });
  }

  images.push(...imagesFromJsonLd($));

  return [...new Set(images)]
    .map((image) => {
      try {
        return normalizeUrl(image, source.baseUrl);
      } catch {
        return undefined;
      }
    })
    .filter((image): image is string => Boolean(image && isLikelyContentImage(image)))
    .slice(0, 3);
}

export async function enrichArticleFromDetailPage(article: NormalizedArticle, source: Source) {
  if (article.coverUrl && article.coverUrls?.length && article.content && article.excerpt) return article;

  try {
    const { data } = await axios.get<string>(article.url, {
      timeout: 12_000,
      maxRedirects: 3,
      headers: { "User-Agent": source.userAgent || appEnv.crawlerUserAgent }
    });
    const $ = cheerio.load(data);
    $("script,style,iframe,noscript").remove();

    const coverCandidates = collectImageCandidates($, source);
    const metaCover =
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
      ]);
    const allCovers = [...new Set([...(article.coverUrls || []), ...coverCandidates, ...(metaCover ? [normalizeUrl(metaCover, source.baseUrl)] : [])])].filter(isLikelyContentImage);
    const cover = article.coverUrl && isLikelyContentImage(article.coverUrl) ? article.coverUrl : allCovers[0];
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
      coverUrls: allCovers.slice(0, 3),
      excerpt: description || excerptFrom(content, 180) || article.excerpt,
      content: content || article.content,
      contentExtraction: article.contentExtraction || (content ? "FALLBACK" : undefined)
    };
  } catch {
    return article;
  }
}
