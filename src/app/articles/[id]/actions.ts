"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createPublishTasks } from "@/lib/crawler";
import { enrichArticleFromDetailPage, enrichArticleFromListPage } from "@/lib/crawler/detail";
import type { NormalizedArticle } from "@/lib/crawler/types";
import { localizeCoverUrls } from "@/lib/services/cover-store";

export async function updateArticleCopy(formData: FormData) {
  const id = String(formData.get("id"));
  const tags = String(formData.get("tgTags") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  await prisma.article.update({
    where: { id },
    data: {
      tgTitle: String(formData.get("tgTitle") || "") || null,
      tgSummary: String(formData.get("tgSummary") || "") || null,
      tgTags: tags
    }
  });
  revalidatePath(`/articles/${id}`);
}

export async function queueArticle(formData: FormData) {
  const id = String(formData.get("id"));
  await createPublishTasks(id);
  revalidatePath(`/articles/${id}`);
}

export async function refreshArticleCover(formData: FormData) {
  const id = String(formData.get("id"));
  const article = await prisma.article.findUnique({ where: { id }, include: { source: true } });
  if (!article) return;

  const input: NormalizedArticle = {
    externalId: article.externalId || undefined,
    title: article.title,
    url: article.url,
    canonicalUrl: article.canonicalUrl || undefined,
    excerpt: article.excerpt || undefined,
    content: article.content || undefined,
    coverUrl: undefined,
    coverUrls: undefined,
    author: article.author || undefined,
    category: article.category || undefined,
    tags: Array.isArray(article.tags) ? article.tags.map(String) : undefined,
    publishedAt: article.publishedAt || undefined,
    rawData: article.rawData || undefined,
    contentExtraction: article.contentExtraction === "SELECTOR" || article.contentExtraction === "FALLBACK" ? article.contentExtraction : undefined
  };

  const enriched = await enrichArticleFromDetailPage(await enrichArticleFromListPage(input, article.source), article.source);
  const candidates = [...new Set([...(enriched.coverUrls || []), ...(enriched.coverUrl ? [enriched.coverUrl] : [])])];
  const localizedCovers = await localizeCoverUrls(candidates);

  await prisma.article.update({
    where: { id },
    data: {
      coverUrl: localizedCovers[0] || candidates[0] || article.coverUrl,
      coverUrls: localizedCovers.length ? localizedCovers : candidates.length ? candidates : article.coverUrls ?? Prisma.JsonNull
    }
  });

  await prisma.systemLog.create({
    data: {
      level: localizedCovers.length ? "INFO" : "WARNING",
      scope: "Cover Refresh",
      message: localizedCovers.length ? "封面已重新抓取并保存到本地" : "未能保存本地封面，保留解析到的远程地址",
      meta: { articleId: id, candidates, localizedCovers }
    }
  });
  revalidatePath(`/articles/${id}`);
  revalidatePath("/articles");
}

export async function ignoreArticle(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.article.update({ where: { id }, data: { status: "IGNORED" } });
  redirect("/articles");
}
