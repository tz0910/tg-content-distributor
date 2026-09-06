"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { enqueueCrawler } from "@/lib/queue/queues";

function inferSourceType(input: string, selected: string) {
  if (selected !== "AUTO") return selected;
  const lower = input.toLowerCase();
  if (lower.includes("rss") || lower.includes("feed") || lower.endsWith(".xml")) return "RSS";
  if (lower.includes("sitemap")) return "SITEMAP";
  return "HTML";
}

export async function createSource(formData: FormData) {
  const primaryUrl = String(formData.get("primaryUrl") || "").trim();
  const type = inferSourceType(primaryUrl, String(formData.get("type") || "AUTO"));
  const baseUrl = String(formData.get("baseUrl") || primaryUrl).trim();

  await prisma.source.create({
    data: {
      name: String(formData.get("name")),
      type: type as never,
      baseUrl,
      feedUrl: type === "RSS" ? primaryUrl : String(formData.get("feedUrl") || "") || null,
      sitemapUrl: type === "SITEMAP" ? primaryUrl : String(formData.get("sitemapUrl") || "") || null,
      apiUrl: type === "API" ? primaryUrl : String(formData.get("apiUrl") || "") || null,
      listUrl: type === "HTML" || type === "RSS" ? String(formData.get("listUrl") || primaryUrl) || null : String(formData.get("listUrl") || "") || null,
      interval: Math.max(1, Number(formData.get("interval") || 5)),
      enabled: formData.get("enabled") === "on"
    }
  });
  revalidatePath("/sources");
}

export async function crawlNow(formData: FormData) {
  await enqueueCrawler(String(formData.get("id")), true);
  revalidatePath("/sources");
}

export async function archiveSource(formData: FormData) {
  await prisma.source.update({ where: { id: String(formData.get("id")) }, data: { archived: true, enabled: false } });
  revalidatePath("/sources");
}
