"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { enqueueCrawler } from "@/lib/queue/queues";

export async function createSource(formData: FormData) {
  await prisma.source.create({
    data: {
      name: String(formData.get("name")),
      type: formData.get("type") as never,
      baseUrl: String(formData.get("baseUrl")),
      feedUrl: String(formData.get("feedUrl") || "") || null,
      sitemapUrl: String(formData.get("sitemapUrl") || "") || null,
      apiUrl: String(formData.get("apiUrl") || "") || null,
      listUrl: String(formData.get("listUrl") || "") || null,
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
