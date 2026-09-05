import { excerptFrom, hashtag } from "@/lib/utils/text";

export type TemplateArticle = {
  title: string;
  url: string;
  excerpt?: string | null;
  content?: string | null;
  category?: string | null;
  tags?: unknown;
  author?: string | null;
  publishedAt?: Date | string | null;
  tgTitle?: string | null;
  tgSummary?: string | null;
  tgTags?: unknown;
  source?: { name: string } | null;
};

function tagsToText(tags: unknown) {
  const list = Array.isArray(tags) ? tags : [];
  return list.map((tag) => hashtag(String(tag))).join(" ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderTemplate(body: string, article: TemplateArticle, options?: { emoji?: string; format?: "text" | "html" }) {
  const title = article.tgTitle || article.title;
  const summary = article.tgSummary || article.excerpt || excerptFrom(article.content, 180);
  const tags = tagsToText(article.tgTags || article.tags || (article.category ? [article.category] : []));
  const rawValues: Record<string, string> = {
    emoji: options?.emoji || "🔥",
    title,
    summary,
    excerpt: article.excerpt || summary,
    url: article.url,
    site_name: article.source?.name || "",
    category: article.category || "",
    tags,
    publish_time: article.publishedAt ? new Date(article.publishedAt).toLocaleString("zh-CN") : "",
    author: article.author || ""
  };
  const values =
    options?.format === "html"
      ? Object.fromEntries(Object.entries(rawValues).map(([key, value]) => [key, escapeHtml(value)]))
      : rawValues;

  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

export function fitTelegramText(text: string, limit = 4096) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

export function fitTelegramCaption(text: string) {
  return fitTelegramText(text, 1024);
}
