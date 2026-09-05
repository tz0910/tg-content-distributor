import type { Source } from "@prisma/client";

export type NormalizedArticle = {
  externalId?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  excerpt?: string;
  content?: string;
  coverUrl?: string;
  author?: string;
  category?: string;
  tags?: string[];
  publishedAt?: Date;
  rawData?: unknown;
  contentExtraction?: "SELECTOR" | "FALLBACK";
};

export interface CrawlerAdapter {
  fetch(source: Source): Promise<unknown>;
  parse(payload: unknown, source: Source): Promise<NormalizedArticle[]>;
  normalize(item: unknown, source: Source): Promise<NormalizedArticle>;
}
