import type { Article, RouteRule } from "@prisma/client";

function includesAny(haystack: string, needles: string[]) {
  return needles.length === 0 || needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function excludesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

export function matchesRoute(article: Pick<Article, "sourceId" | "category" | "tags" | "title" | "url">, route: RouteRule) {
  if (!route.enabled) return false;
  if (route.sourceId && route.sourceId !== article.sourceId) return false;
  if (route.category && route.category !== article.category) return false;

  const tags = Array.isArray(article.tags) ? article.tags.map(String) : [];
  if (route.tag && !tags.includes(route.tag)) return false;

  const text = `${article.title} ${article.url} ${article.category || ""} ${tags.join(" ")}`.toLowerCase();
  if (route.titleKeyword && !article.title.toLowerCase().includes(route.titleKeyword.toLowerCase())) return false;
  if (route.urlKeyword && !article.url.toLowerCase().includes(route.urlKeyword.toLowerCase())) return false;
  if (!includesAny(text, route.includeKeywords)) return false;
  if (excludesAny(text, route.excludeKeywords)) return false;
  return true;
}
