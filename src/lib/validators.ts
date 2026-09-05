import { z } from "zod";

export const SourceInput = z.object({
  name: z.string().min(1),
  type: z.enum(["RSS", "SITEMAP", "HTML", "API", "WEBHOOK", "DYNAMIC_HTML"]),
  baseUrl: z.string().url(),
  feedUrl: z.string().url().optional().nullable(),
  sitemapUrl: z.string().url().optional().nullable(),
  apiUrl: z.string().url().optional().nullable(),
  listUrl: z.string().url().optional().nullable(),
  interval: z.number().int().min(1).default(5),
  enabled: z.boolean().default(true)
});

export const WebhookArticleInput = z.object({
  externalId: z.string().optional(),
  title: z.string().min(1),
  url: z.string().url(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  cover: z.string().url().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publishedAt: z.string().datetime().optional()
});

export const BotTestInput = z.object({
  token: z.string().min(10)
});

export const ChannelTestInput = z.object({
  token: z.string().min(10),
  chatId: z.string().min(1)
});
