import axios from "axios";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
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
  return !["generic_cover", "logo", "icon", "avatar", "favicon", "placeholder", "loading", "qrcode", "wechat"].some((token) => lower.includes(token));
}

function comparableArticleUrl(input: string, baseUrl: string) {
  const url = new URL(normalizeUrl(input, baseUrl));
  return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
}

function safeComparableArticleUrl(input: string, baseUrl: string) {
  try {
    return comparableArticleUrl(input, baseUrl);
  } catch {
    return undefined;
  }
}

function jsonLdImageValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(jsonLdImageValues);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.url === "string") return [record.url];
  }
  return [];
}

function collectListJsonLdCovers($: cheerio.CheerioAPI, articleUrl: string, source: Source) {
  const covers: string[] = [];
  const scripts = $('script[type="application/ld+json"]')
    .map((_, element) => $(element).text())
    .get();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    const rawUrl = typeof record.url === "string" ? record.url : typeof record["@id"] === "string" ? record["@id"] : undefined;
    if (rawUrl && safeComparableArticleUrl(rawUrl, source.baseUrl) === articleUrl) {
      covers.push(...jsonLdImageValues(record.image));
    }

    for (const child of Object.values(record)) {
      if (child && typeof child === "object") visit(child);
    }
  };

  for (const script of scripts) {
    try {
      visit(JSON.parse(script) as unknown);
    } catch {
      continue;
    }
  }

  return covers;
}

function articleIdFromPath(input: string) {
  return input.match(/\/archives\/([^/]+)/)?.[1];
}

function collectLoadBannerCovers(html: string, articleUrl: string) {
  const articleId = articleIdFromPath(articleUrl);
  if (!articleId) return [];

  const covers: string[] = [];
  const pattern = new RegExp(
    String.raw`loadBannerDirect\(\s*['"]([^'"]+)['"][\s\S]{0,300}?post-card-${articleId}\b`,
    "g"
  );
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    covers.push(match[1]);
  }
  return covers;
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
        node.attr("data-xkrkllgl") ||
        node.attr("data-xload") ||
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

function imageFromNode(node: cheerio.Cheerio<AnyNode>) {
  return (
    node.attr("data-xkrkllgl") ||
    node.attr("data-xload") ||
    node.attr("data-src") ||
    node.attr("data-original") ||
    node.attr("data-lazy-src") ||
    node.attr("src") ||
    firstSrcsetUrl(node.attr("srcset") || node.attr("data-srcset")) ||
    backgroundImageUrl(node.attr("style"))
  );
}

export async function enrichArticleFromListPage(article: NormalizedArticle, source: Source) {
  const listUrls = [
    source.listUrl,
    source.baseUrl.includes("91heilw.com") ? "https://91heilw.com/category/jinr-chigua/" : undefined,
    source.baseUrl
  ].filter((value, index, values): value is string => Boolean(value && values.indexOf(value) === index));

  for (const listUrl of listUrls) {
    try {
      const { data } = await axios.get<string>(listUrl, {
        timeout: 12_000,
        maxRedirects: 3,
        headers: { "User-Agent": source.userAgent || appEnv.crawlerUserAgent }
      });
      const $ = cheerio.load(data);
      const articleUrl = comparableArticleUrl(article.url, source.baseUrl);
      const covers: string[] = [
        ...collectLoadBannerCovers(data, articleUrl),
        ...collectListJsonLdCovers($, articleUrl, source)
      ];

      $("a[href]").each((_, element) => {
        const link = $(element);
        const href = link.attr("href");
        if (!href) return;
        const linkedUrl = safeComparableArticleUrl(href, source.baseUrl);
        if (linkedUrl !== articleUrl) return;

        const card = link.parents("article,li,.post,.item,.card,.entry,.post-item,.article-item,div").first();
        const nodes = [...link.find("img,[style]").toArray(), ...card.find("img,[style]").toArray()];
        for (const nodeElement of nodes) {
          const image = imageFromNode($(nodeElement));
          if (image) covers.push(image);
        }
      });

      const coverUrls = [...new Set(covers)]
        .map((image) => {
          try {
            return normalizeUrl(image, source.baseUrl);
          } catch {
            return undefined;
          }
        })
        .filter((image): image is string => Boolean(image && isLikelyContentImage(image)))
        .slice(0, 3);

      if (coverUrls.length) {
        return {
          ...article,
          coverUrl: coverUrls[0],
          coverUrls
        };
      }
    } catch {
      continue;
    }
  }

  return article;
}

export async function enrichArticleFromDetailPage(article: NormalizedArticle, source: Source) {
  if (article.coverUrl && isLikelyContentImage(article.coverUrl) && article.coverUrls?.length && article.content && article.excerpt) return article;

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
